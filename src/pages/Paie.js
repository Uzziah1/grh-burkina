// Paie.js - Payroll management page
// Features: full-screen bulletin editor, real CNSS/IUTS calculation
// (AIMDIGITAL model), automatic linking of approved salary advances,
// PDF/Excel export, print, black & white preview
// Access restricted to admin/rh roles (voirPaie permission)

import React, { useState, useEffect, useMemo } from 'react';
import Pagination from '../components/Pagination';
import { supabase } from '../lib/supabase';
import { peutFaire } from '../lib/useProfil';
import { calculerBulletin } from '../lib/calcPaie';
import { formatMontant } from '../lib/helpers';
import {
  DollarSign, Plus, FileText, Search,
  X, Save, Printer, Eye, Trash2, CheckCircle, FileSpreadsheet, Wallet,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import BulletinPreview from '../components/BulletinPreview';

const PAGE_SIZE = 20;

// ── Toast notification ────────────────────────────────────
function showToast(msg, type = 'success') {
  const colors = { success: '#16A34A', error: '#DC2626', warning: '#D97706' };
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed; bottom:24px; right:24px;
    background:${colors[type] || colors.success};
    color:#fff; padding:12px 20px; border-radius:10px;
    font-size:13px; font-weight:600; z-index:9999;
    font-family:Poppins,sans-serif;
    box-shadow:0 4px 16px rgba(0,0,0,0.15);
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Months list ───────────────────────────────────────────
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// ── Current month/year ────────────────────────────────────
const NOW = new Date();

// ── Generate bulletin PDF — mirrors BulletinPreview (nouveau modèle) ──
// Délègue à drawBulletinOnDoc qui reproduit fidèlement la mise en page
// du composant BulletinPreview (modèle Excel FASO ARMORED).
function generateBulletinPDF(bulletin, agent, entreprise) {
  const doc = new jsPDF();
  drawBulletinOnDoc(doc, bulletin, agent, entreprise, bulletin.mois, bulletin.annee);
  doc.save(`bulletin_${agent.prenom}_${agent.nom}_${MOIS[bulletin.mois - 1]}_${bulletin.annee}.pdf`);
}

// ── Generate all bulletins in one multi-page PDF ──────────
// One A4 page per agent; each page is a complete bulletin.
// The function draws each bulletin onto the doc then adds a page break.
function drawBulletinOnDoc(doc, bulletin, agent, entreprise, mois, annee) {
  const NOIR        = [26, 26, 26];
  const GRIS        = [115, 115, 115];
  const ROUGE_CLAIR = [245, 198, 198];
  const BORDER      = [153, 153, 153];

  // ── Colonnes (en mm sur A4 = 210mm, marges 14mm) ──────
  // L..C1 : libellés (76mm)   C1..C2 : colonne milieu (40mm)   C2..R : valeurs (46mm)
  const L = 14, R = 196;
  const C1 = 120, C2 = 157;   // ajustement : libellés plus larges, valeurs 39mm
  let y = 12;

  // ── Formatage montant : espace insécable → espace normal ─
  // jsPDF peut mal rendre   (espace fine insécable de fr-FR).
  // On formate manuellement avec des espaces standards.
  const fmtN = (v) => {
    const n = Math.round(parseFloat(v));
    if (!n || isNaN(n)) return '';
    // Groupes de 3 séparés par espace (pas de virgule, pas de slash)
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // ── Helper : dessine une cellule (fond + bordure + texte) ─
  // On dessine fond puis lignes séparément pour éviter l'overlap double-bordure
  const cell = (x1, x2, h, text, opts = {}) => {
    // fond
    if (opts.bg) {
      doc.setFillColor(...opts.bg);
      doc.rect(x1, y, x2 - x1, h, 'F');
    }
    // texte
    if (text !== null && text !== undefined && text !== '') {
      doc.setFont('helvetica',
        opts.bold && opts.italic ? 'bolditalic'
        : opts.bold   ? 'bold'
        : opts.italic ? 'italic'
        : 'normal');
      doc.setFontSize(opts.fs || 8.5);
      doc.setTextColor(...(opts.color || NOIR));
      const align = opts.align || 'left';
      const tx = align === 'right'  ? x2 - 1.5
               : align === 'center' ? (x1 + x2) / 2
               : x1 + 1.5;
      // Clip text to cell width to prevent overflow
      const maxW = x2 - x1 - 3;
      doc.text(String(text), tx, y + h * 0.67, { align, maxWidth: maxW });
    }
  };

  // ── Helper : ligne complète 3 colonnes avec bordures propres ─
  // Dessine toutes les cellules puis les bordures par-dessus
  const row3 = (t1, t2, t3, h, o1 = {}, o2 = {}, o3 = {}) => {
    cell(L,  C1, h, t1, o1);
    cell(C1, C2, h, t2, o2);
    cell(C2, R,  h, t3, o3);
    // bordures : cadre externe + séparateurs internes
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(L, y, R - L, h);           // cadre global
    doc.line(C1, y, C1, y + h);         // séparateur col1|col2
    doc.line(C2, y, C2, y + h);         // séparateur col2|col3
    y += h;
  };

  // ── Helper : ligne pleine largeur (colspan 3) ─────────────
  const rowFull = (text, h, opts = {}) => {
    cell(L, R, h, text, opts);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(L, y, R - L, h);
    y += h;
  };

  // ── Helper : ligne 2 colonnes (libellé + valeur, sans milieu) ─
  const row2 = (t1, t3, h, o1 = {}, o3 = {}) => {
    cell(L, C1, h, t1, o1);
    cell(C1, R, h, t3, o3);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(L, y, R - L, h);
    doc.line(C1, y, C1, y + h);
    y += h;
  };

  // ── Données agent ──────────────────────────────────────
  const nomComplet = `${(agent.nom || '').toUpperCase()} ${titleCase(agent.prenom || '')}`.trim();
  function titleCase(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''; }

  let dateEmb = '—';
  if (agent.date_embauche) {
    const d = new Date(agent.date_embauche);
    dateEmb = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  let anciennete = '-';
  if (agent.date_embauche) {
    const emb = new Date(agent.date_embauche);
    const ref = new Date(annee, mois - 1, 1);
    const moisAnc = (ref.getFullYear() - emb.getFullYear()) * 12 + (ref.getMonth() - emb.getMonth());
    if (moisAnc >= 12) { const ans = Math.floor(moisAnc / 12); anciennete = `${ans} an${ans > 1 ? 's' : ''}`; }
  }

  const lastDay  = new Date(annee, mois, 0).getDate();
  const dateDebut = `01/${String(mois).padStart(2, '0')}/${annee}`;
  const dateFin   = `${lastDay}/${String(mois).padStart(2, '0')}/${annee}`;

  const imposable     = bulletin.salaire_brut_imposable || 0;
  const exoLogPlafond = fmtN(Math.min(imposable * 0.20, 75000));
  const exoTraPlafond = fmtN(Math.min(imposable * 0.05, 30000));
  const exoFonPlafond = fmtN(Math.min(imposable * 0.05, 50000));

  // Signataire RH
  const signataires = Array.isArray(entreprise?.signataires) ? entreprise.signataires : [];
  const rhSig = signataires.find(s => s.role === 'Responsable RH');
  const nomRH = rhSig?.nom || entreprise?.representant || '—';

  const autresRetTotal = (parseFloat(bulletin.autres_retenues) || 0) + (parseFloat(bulletin.avance_salaire) || 0);
  const autreVal = (parseFloat(bulletin.sursalaire) || 0) + (parseFloat(bulletin.prime_anciennete) || 0)
    + (parseFloat(bulletin.autres_primes) || 0) + (parseFloat(bulletin.heures_sup) || 0);
  const salImposable = (bulletin.salaire_brut || 0) - (bulletin.cnss_salarial || 0);
  const personnesACharge = bulletin.personnes_a_charge != null ? bulletin.personnes_a_charge : (agent.charges_familiales || 0);

  // ════ TABLEAU ════════════════════════════════════════════

  // ── Titre ──
  rowFull(`BULLETIN DE PAIE DE ${nomComplet}`, 7, {
    bold: true, fs: 10, align: 'center', bg: ROUGE_CLAIR,
  });

  // ── Période ──
  row2('Période du :', `${dateDebut} AU ${dateFin}`, 5.5,
    { fs: 8.5 },
    { fs: 8.5, align: 'center' });

  // ── En-têtes colonnes ──
  row3('Employeur :', 'Organisme social', 'Employé', 5.5,
    { bold: true, fs: 8.5 },
    { bold: true, fs: 8.5, align: 'center' },
    { bold: true, fs: 8.5, align: 'center' });

  // ── Bloc infos multi-lignes (hauteur fixe 26mm) ──
  const infoH = 26;
  // Fonds
  doc.setFillColor(255, 255, 255);
  doc.rect(L, y, R - L, infoH, 'F');
  // Bordures
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
  doc.rect(L, y, R - L, infoH);
  doc.line(C1, y, C1, y + infoH);
  doc.line(C2, y, C2, y + infoH);

  let iy = y + 4;
  // Employeur
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...NOIR);
  doc.text(entreprise?.nom || 'FASO ARMORED', L + 1.5, iy);
  iy += 4; doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
  const infoParts = [];
  if (entreprise?.telephone) infoParts.push(`Tél: ${entreprise.telephone}`);
  if (entreprise?.rccm) infoParts.push(`RCCM: ${entreprise.rccm}`);
  if (entreprise?.ifu) infoParts.push(`IFU: ${entreprise.ifu}`);
  if (infoParts.length) { doc.text(infoParts.join(', '), L + 1.5, iy); iy += 3.5; }
  doc.setTextColor(...NOIR); doc.text(`Date d'embauche : ${dateEmb}`, L + 1.5, iy);

  // CNSS
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...NOIR);
  doc.text('Caisse Nationale de Sécurité Sociale', C1 + 1.5, y + 5);
  doc.text('(CNSS)', C1 + 1.5, y + 9);
  if (entreprise?.cnss_employeur) doc.text(`N° : ${entreprise.cnss_employeur}`, C1 + 1.5, y + 13.5);

  // Employé
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...NOIR);
  doc.text(nomComplet, C2 + 1.5, y + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  if (agent.cnss) doc.text(`N° CNSS : ${agent.cnss}`, C2 + 1.5, y + 10);

  y += infoH;

  // ── Emploi / Catégorie / Charges + Ancienneté ──
  row3('Emploi', 'Catégorie', 'Charges familiales  /  Ancienneté', 5,
    { fs: 8 }, { fs: 8 }, { fs: 7.5, align: 'center' });
  row3(
    (agent.poste || '').toUpperCase(),
    (agent.categorie_socioprofessionnelle || agent.categorie || agent.type_contrat || '').toUpperCase(),
    `${personnesACharge}  /  ${anciennete}`,
    5.5,
    { bold: true, fs: 8 }, { bold: true, fs: 8 }, { bold: true, fs: 8, align: 'center' }
  );

  // ── Salaire de base ──
  row3('Salaire de base', '', fmtN(bulletin.salaire_base), 5.5,
    { bold: true, fs: 8.5 }, {}, { bold: true, fs: 8.5, align: 'right' });

  // ── Indemnités ──
  row3('Indemnités', '', '', 4.5, { fs: 8.5 }, {}, {});
  const indRow = (label, val, greenBg) => row3(
    label, '', fmtN(val), 5,
    { fs: 8, color: GRIS },
    {},
    { fs: 8, align: 'right', bg: greenBg && val > 0 ? [240, 244, 236] : undefined }
  );
  indRow('   - logement',  bulletin.indemnite_logement,  true);
  indRow('   - transport', bulletin.indemnite_transport,  false);
  indRow('   - fonction',  bulletin.indemnite_fonction,   true);
  indRow('   - autre',     autreVal, false);

  // ── Salaire brut ──
  row3('Salaire brut', '', fmtN(bulletin.salaire_brut), 5.5,
    { bold: true, fs: 8.5 }, {}, { bold: true, fs: 8.5, align: 'right' });

  // ── CNSS salarial ──
  row3('CNSS', '', fmtN(bulletin.cnss_salarial), 5,
    { italic: true, fs: 8.5 }, {}, { italic: true, fs: 8.5, align: 'right' });

  // ── Salaire imposable ──
  row3('Salaire imposable', '', fmtN(salImposable), 5,
    { fs: 8.5 }, {}, { fs: 8.5, align: 'right' });

  // ── Contrôle CNSS fiscal ──
  row3('Contrôle CNSS (fiscal)', '', fmtN(bulletin.controle_cnss_fiscal), 5,
    { italic: true, fs: 8.5 }, {}, { italic: true, fs: 8.5, align: 'right' });

  // ── Salaire imposable IUTS ──
  row3('Salaire imposable IUTS', '', fmtN(bulletin.salaire_brut_imposable), 5.5,
    { bold: true, fs: 8.5 }, {}, { bold: true, fs: 8.5, align: 'right' });

  // ── Contrôle des indemnités ──
  row3('Contrôle des indemnités', '', '', 4.5, { fs: 8.5 }, {}, {});
  const exoRow = (label, plafond, retenu) => row3(
    label, plafond, retenu, 5,
    { fs: 8, color: GRIS }, { fs: 8, align: 'right' }, { fs: 8, align: 'right' }
  );
  exoRow('   - logement',  exoLogPlafond, fmtN(bulletin.exo_logement));
  exoRow('   - transport', exoTraPlafond, fmtN(bulletin.exo_transport));
  exoRow('   - fonction',  exoFonPlafond, fmtN(bulletin.exo_fonction));

  // ── Total exonérations ──
  row3('Total exonérations', '', fmtN(bulletin.total_exonerations), 5,
    { italic: true, fs: 8.5 }, {}, { italic: true, fs: 8.5, align: 'right' });

  // ── Abattement forfaitaire ──
  row3('Abattement forf.', '', fmtN(bulletin.abattement_forfaitaire), 5,
    { italic: true, fs: 8.5 }, {}, { italic: true, fs: 8.5, align: 'right' });

  // ── Base IUTS ──
  row3('Base IUTS', '', fmtN(bulletin.base_iuts), 5.5,
    { fs: 8.5 }, {}, { fs: 8.5, align: 'right' });

  // ── IUTS brut ──
  row3('IUTS', '', fmtN(bulletin.iuts_brut), 5,
    { italic: true, fs: 8.5 }, {}, { italic: true, fs: 8.5, align: 'right' });

  // ── Personnes à charge ──
  row3('Personnes à charge', '', String(personnesACharge), 5,
    { fs: 8.5 }, {}, { fs: 8.5, align: 'right' });

  // ── Abattement familial ──
  row3('Abattement', '', fmtN(bulletin.abattement_familial), 5,
    { fs: 8.5 }, {}, { fs: 8.5, align: 'right' });

  // ── Net IUTS ──
  row3('Net IUTS', '', fmtN(bulletin.iuts), 5.5,
    { italic: true, bold: true, fs: 8.5 }, {}, { italic: true, bold: true, fs: 8.5, align: 'right' });

  // ── Retenues diverses ──
  row3('Retenues acomptes', '', '', 5, { fs: 8.5 }, {}, {});
  row3('Retenues prêts', '', '', 5, { fs: 8.5 }, {}, {});
  row3('Autres retenues', '', fmtN(autresRetTotal), 5,
    { fs: 8.5 }, {}, { fs: 8.5, align: 'right' });

  // ── Salaire net ──
  row3('Salaire net', '', fmtN(bulletin.salaire_net), 7,
    { bold: true, fs: 10 }, {}, { bold: true, fs: 10, align: 'right' });

  y += 8;

  // ── Signatures ──────────────────────────────────────────
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NOIR);
  doc.text('Le Responsable RH', 52, y, { align: 'center' });
  doc.text("L'employé", 163, y, { align: 'center' });
  y += 18;
  doc.setDrawColor(...NOIR); doc.setLineWidth(0.4);
  doc.line(14, y, 90, y);
  doc.line(126, y, 196, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...NOIR);
  doc.text(nomRH, 52, y + 4, { align: 'center' });
  doc.text(nomComplet, 163, y + 4, { align: 'center' });
}

async function generateBulletinsGroupesPDF(mois, annee, agents, entreprise, onProgress, avancesParAgent = {}) {
  // Filter agents eligible for payroll: not VDP/Stagiaire, embauche ≤ first of month
  const firstOfMonth = new Date(annee, mois - 1, 1);
  const eligible = (agents || []).filter(a => {
    if (a.type_contrat === 'VDP' || a.type_contrat === 'Stagiaire') return false;
    if (a.statut !== 'Actif') return false;
    if (!a.date_embauche) return false;
    return new Date(a.date_embauche) <= firstOfMonth;
  });

  if (eligible.length === 0) return { count: 0 };

  const doc = new jsPDF();

  for (let i = 0; i < eligible.length; i++) {
    const agent = eligible[i];
    if (i > 0) doc.addPage();
    onProgress && onProgress(i + 1, eligible.length, agent);

    const avanceAgent = avancesParAgent[agent.id] || 0;

    const calc = calculerBulletin({
      salaire_base:         agent.salaire_brut || 0,
      sursalaire:           agent.sursalaire || 0,
      indemnite_logement:   agent.indemnite_logement || 0,
      indemnite_transport:  agent.indemnite_transport || 0,
      indemnite_fonction:   agent.indemnite_fonction || 0,
      prime_anciennete:     0,
      autres_primes:        0,
      heures_sup:           0,
      autres_retenues:      0,
      avance_salaire:                 avanceAgent,
      charges_familiales:             agent.charges_familiales || 0,
      categorie_socioprofessionnelle: agent.categorie_socioprofessionnelle || '',
    });

    const bulletin = {
      mois, annee,
      salaire_base:         agent.salaire_brut || 0,
      sursalaire:           agent.sursalaire || 0,
      indemnite_logement:   agent.indemnite_logement || 0,
      indemnite_transport:  agent.indemnite_transport || 0,
      indemnite_fonction:   agent.indemnite_fonction || 0,
      prime_anciennete: 0, autres_primes: 0, heures_sup: 0,
      autres_retenues: 0,  avance_salaire: avanceAgent,
      ...calc,
    };

    drawBulletinOnDoc(doc, bulletin, agent, entreprise, mois, annee);
  }

  doc.save(`bulletins_${MOIS[mois - 1]}_${annee}.pdf`);
  return { count: eligible.length };
}

// ── Export bulletin to Excel ───────────────────────────────
function exportBulletinExcel(form, preview, agent, entreprise) {
  const periode = `${MOIS[(form.mois || 1) - 1]} ${form.annee || ''}`;

  const rows = [
    ['BULLETIN DE PAIE', periode],
    [],
    ['EMPLOYEUR', entreprise?.nom || ''],
    ['Représentant', entreprise?.representant || ''],
    ['RCCM', entreprise?.rccm || ''],
    ['CNSS Employeur', entreprise?.cnss_employeur || ''],
    [],
    ['EMPLOYÉ(E)', `${agent.prenom} ${agent.nom}`],
    ['Poste', agent.poste || ''],
    ['Matricule', agent.matricule || ''],
    ['N° CNSS', agent.cnss || ''],
    ['Situation', agent.situation_matrimoniale || ''],
    ['Personnes à charge (calc.)', preview?.personnes_a_charge ?? ''],
    [],
    ['ÉLÉMENTS DE RÉMUNÉRATION', 'MONTANT (FCFA)'],
    ['Salaire de base', parseFloat(form.salaire_base) || 0],
    ['Sursalaire', parseFloat(form.sursalaire) || 0],
    ['Indemnité de logement', parseFloat(form.indemnite_logement) || 0],
    ['Indemnité de transport', parseFloat(form.indemnite_transport) || 0],
    ['Indemnité de fonction', parseFloat(form.indemnite_fonction) || 0],
    ['Prime d\'ancienneté', parseFloat(form.prime_anciennete) || 0],
    ['Autres primes', parseFloat(form.autres_primes) || 0],
    ['Heures supplémentaires', parseFloat(form.heures_sup) || 0],
    ['SALAIRE BRUT', preview?.salaire_brut || 0],
    [],
    ['BASE IMPOSABLE IUTS', ''],
    ['Salaire imposable (brut - contrôle CNSS)', preview?.salaire_brut_imposable || 0],
    ['Exonération logement', -(preview?.exo_logement || 0)],
    ['Exonération transport', -(preview?.exo_transport || 0)],
    ['Exonération fonction', -(preview?.exo_fonction || 0)],
    ['Abattement forfaitaire (25%)', -(preview?.abattement_forfaitaire || 0)],
    ['BASE IUTS', preview?.base_iuts || 0],
    [],
    ['RETENUES', 'MONTANT (FCFA)'],
    ['CNSS salarié (5.5%, plafond 44 000)', preview?.cnss_salarial || 0],
    ['IUTS brut', preview?.iuts_brut || 0],
    [`Abattement charges familiales (${preview?.personnes_a_charge || 0} pers.)`, -(preview?.abattement_familial || 0)],
    ['IUTS net', preview?.iuts || 0],
    ['TOTAL RETENUES', preview?.total_retenues || 0],
    [],
    ['Autres retenues', parseFloat(form.autres_retenues) || 0],
    ['Avance sur salaire', parseFloat(form.avance_salaire) || 0],
    [],
    ['NET À PAYER', preview?.salaire_net || 0],
    [],
    ['Charge patronale CNSS (16%)', preview?.cnss_patronal || 0],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 42 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bulletin');
  XLSX.writeFile(wb, `bulletin_${agent.prenom}_${agent.nom}_${MOIS[(form.mois || 1) - 1]}_${form.annee}.xlsx`);
}

// ── Main Paie component ───────────────────────────────────
export default function Paie({ agents, entreprise, profil }) {
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterMois, setFilterMois] = useState(NOW.getMonth() + 1);
  const [filterAnnee, setFilterAnnee] = useState(NOW.getFullYear());
  const [saving, setSaving] = useState(false);
  const [avancesAgent, setAvancesAgent] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(null);

  const [form, setForm] = useState({
    agent_id: '',
    mois: NOW.getMonth() + 1,
    annee: NOW.getFullYear(),
    salaire_base: '',
    sursalaire: 0,
    indemnite_logement: 0,
    indemnite_transport: 0,
    indemnite_fonction: 0,
    prime_anciennete: 0,
    autres_primes: 0,
    heures_sup: 0,
    autres_retenues: 0,
    avance_salaire: 0,
    observations: '',
  });

  useEffect(() => {
    loadBulletins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMois, filterAnnee]);

  // ── Load bulletins ──
  async function loadBulletins() {
    setLoading(true);
    const { data } = await supabase
      .from('bulletins_paie')
      .select('*, agents(nom, prenom, poste, matricule, departement)')
      .eq('mois', filterMois)
      .eq('annee', filterAnnee)
      .order('created_at', { ascending: false });
    setBulletins(data || []);
    setLoading(false);
  }

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

  // ── Generate all bulletins as one PDF ──
  async function handleGenererTous() {
    setGenerating(true);
    setGenerateProgress({ current: 0, total: 0, nom: '' });
    try {
      // Charger les avances approuvées du mois pour tous les agents
      const { data: avancesData } = await supabase
        .from('avances')
        .select('agent_id, montant')
        .eq('statut', 'Approuvé')
        .eq('mois', filterMois)
        .eq('annee', filterAnnee);
      // Regrouper par agent_id → total des avances
      const avancesParAgent = {};
      (avancesData || []).forEach(a => {
        avancesParAgent[a.agent_id] = (avancesParAgent[a.agent_id] || 0) + (parseFloat(a.montant) || 0);
      });

      const result = await generateBulletinsGroupesPDF(
        filterMois, filterAnnee, agents, entreprise,
        (current, total, agent) => setGenerateProgress({ current, total, nom: `${agent.prenom} ${agent.nom}` }),
        avancesParAgent,
      );
      if (result.count === 0) showToast('Aucun agent éligible pour cette période', 'warning');
      else showToast(`${result.count} bulletin(s) généré(s) et téléchargé(s)`, 'success');
    } catch (e) {
      showToast('Impossible de générer les bulletins. Réessayez.', 'error');
    }
    setGenerating(false);
    setGenerateProgress(null);
  }

  // ── Generate + save all bulletins to DB, then PDF ──
  async function handleGenererEtSauvegarder() {
    if (!window.confirm(`Générer et enregistrer tous les bulletins pour ${MOIS[filterMois - 1]} ${filterAnnee} ?\nLes bulletins existants seront mis à jour.`)) return;
    setGenerating(true);
    setGenerateProgress({ current: 0, total: 0, nom: '' });
    try {
      const firstOfMonth = new Date(filterAnnee, filterMois - 1, 1);
      const eligible = (agents || []).filter(a => {
        if (a.type_contrat === 'VDP' || a.type_contrat === 'Stagiaire') return false;
        if (a.statut !== 'Actif') return false;
        if (!a.date_embauche) return false;
        return new Date(a.date_embauche) <= firstOfMonth;
      });

      if (eligible.length === 0) {
        showToast('Aucun agent éligible pour cette période', 'warning');
        setGenerating(false);
        setGenerateProgress(null);
        return;
      }

      let savedCount = 0;
      const doc = new jsPDF();

      for (let i = 0; i < eligible.length; i++) {
        const agent = eligible[i];
        setGenerateProgress({ current: i + 1, total: eligible.length, nom: `${agent.prenom} ${agent.nom}` });

        // Fetch pending approved advances for this agent
        const { data: avancesData } = await supabase
          .from('avances')
          .select('*')
          .eq('agent_id', agent.id)
          .eq('statut', 'Approuvé')
          .is('deduite_bulletin_id', null);
        const avances = avancesData || [];
        const totalAvances = avances.reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);

        const calc = calculerBulletin({
          salaire_base:           agent.salaire_brut || 0,
          sursalaire:             agent.sursalaire || 0,
          indemnite_logement:     agent.indemnite_logement || 0,
          indemnite_transport:    agent.indemnite_transport || 0,
          indemnite_fonction:     agent.indemnite_fonction || 0,
          prime_anciennete:       0,
          autres_primes:          0,
          heures_sup:             0,
          autres_retenues:        0,
          avance_salaire:                 totalAvances,
          charges_familiales:             agent.charges_familiales || 0,
          categorie_socioprofessionnelle: agent.categorie_socioprofessionnelle || '',
        });

        const bulletinData = {
          agent_id:             agent.id,
          mois:                 filterMois,
          annee:                filterAnnee,
          salaire_base:         agent.salaire_brut || 0,
          sursalaire:           agent.sursalaire || 0,
          indemnite_logement:   agent.indemnite_logement || 0,
          indemnite_transport:  agent.indemnite_transport || 0,
          indemnite_fonction:   agent.indemnite_fonction || 0,
          prime_anciennete:     0,
          autres_primes:        0,
          heures_sup:           0,
          autres_retenues:      0,
          avance_salaire:       totalAvances,
          statut:               'Brouillon',
          created_by:           profil?.id,
          ...calc,
        };

        const { data: savedBulletin, error } = await supabase
          .from('bulletins_paie')
          .upsert(bulletinData, { onConflict: 'agent_id,mois,annee' })
          .select()
          .single();

        if (!error) {
          savedCount++;
          // Link advances to this bulletin
          if (avances.length > 0 && savedBulletin?.id) {
            await supabase
              .from('avances')
              .update({ deduite_bulletin_id: savedBulletin.id })
              .in('id', avances.map(a => a.id));
          }
        }

        // Draw on PDF
        if (i > 0) doc.addPage();
        const bulletinForPDF = { mois: filterMois, annee: filterAnnee, ...bulletinData, ...calc };
        drawBulletinOnDoc(doc, bulletinForPDF, agent, entreprise, filterMois, filterAnnee);
      }

      doc.save(`bulletins_${MOIS[filterMois - 1]}_${filterAnnee}.pdf`);
      showToast(`${savedCount} bulletin(s) enregistré(s) et PDF téléchargé`, 'success');
      loadBulletins();
    } catch (e) {
      showToast('Impossible de générer les bulletins. Réessayez.', 'error');
    }
    setGenerating(false);
    setGenerateProgress(null);
  }

  // ── Print the on-screen bulletin preview ──
  function handlePrint() {
    const printContent = document.getElementById('bulletin-printable');
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bulletin de paie</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { margin: 0; font-family: 'Poppins', sans-serif; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body>${printContent.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  }

  // ── Get agent info for tax calc ──
  function getAgent(agentId) {
    return agents.find(a => a.id === agentId);
  }

  // ── Pre-fill salary and pending approved advances from agent data ──
  async function prefillFromAgent(agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    setF('salaire_base',          agent.salaire_brut        || '');
    setF('sursalaire',            agent.sursalaire          || 0);
    setF('indemnite_logement',    agent.indemnite_logement  || 0);
    setF('indemnite_transport',   agent.indemnite_transport || 0);
    setF('indemnite_fonction',    agent.indemnite_fonction  || 0);
    setF('agent_id', agentId);

    // Fetch approved advances not yet deducted from any bulletin
    const { data } = await supabase
      .from('avances')
      .select('*')
      .eq('agent_id', agentId)
      .eq('statut', 'Approuvé')
      .is('deduite_bulletin_id', null);

    const avancesEnAttente = data || [];
    setAvancesAgent(avancesEnAttente);

    const totalAvances = avancesEnAttente.reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);
    setF('avance_salaire', totalAvances || 0);

    if (avancesEnAttente.length > 0) {
      showToast(`${avancesEnAttente.length} avance(s) approuvée(s) appliquée(s) automatiquement`, 'success');
    }
  }

  // ── Compute live preview for the "new bulletin" form ──
  const selectedAgent = getAgent(form.agent_id);
  const preview = form.agent_id && form.salaire_base ? calculerBulletin({
    ...form,
    charges_familiales: selectedAgent?.charges_familiales || 0,
    categorie_socioprofessionnelle: selectedAgent?.categorie_socioprofessionnelle || '',
  }) : null;

  // ── Save bulletin ──
  async function handleSave(statut = 'Brouillon') {
    if (!form.agent_id || !form.salaire_base) {
      showToast('Agent et salaire de base sont obligatoires', 'error');
      return;
    }
    setSaving(true);
    const agent = getAgent(form.agent_id);
    const calc = calculerBulletin({
      ...form,
      charges_familiales: agent?.charges_familiales || 0,
      categorie_socioprofessionnelle: agent?.categorie_socioprofessionnelle || '',
    });

    const data = {
      agent_id:            form.agent_id,
      mois:                 parseInt(form.mois),
      annee:                parseInt(form.annee),
      salaire_base:         parseFloat(form.salaire_base) || 0,
      sursalaire:           parseFloat(form.sursalaire) || 0,
      indemnite_logement:   parseFloat(form.indemnite_logement) || 0,
      indemnite_transport:  parseFloat(form.indemnite_transport) || 0,
      indemnite_fonction:   parseFloat(form.indemnite_fonction) || 0,
      prime_anciennete:     parseFloat(form.prime_anciennete) || 0,
      autres_primes:        parseFloat(form.autres_primes) || 0,
      heures_sup:           parseFloat(form.heures_sup) || 0,
      autres_retenues:      parseFloat(form.autres_retenues) || 0,
      avance_salaire:       parseFloat(form.avance_salaire) || 0,
      observations:         form.observations || null,
      statut,
      created_by:           profil?.id,
      ...calc,
    };

    const { data: savedBulletin, error } = await supabase
      .from('bulletins_paie')
      .upsert(data, { onConflict: 'agent_id,mois,annee' })
      .select()
      .single();

    if (error) showToast('L\'enregistrement a échoué. Réessayez.', 'error');
    else {
      // Mark the linked advances as deducted by this bulletin
      if (avancesAgent.length > 0 && savedBulletin?.id) {
        await supabase
          .from('avances')
          .update({ deduite_bulletin_id: savedBulletin.id })
          .in('id', avancesAgent.map(a => a.id));
      }

      showToast(statut === 'Validé' ? 'Bulletin validé avec succès' : 'Bulletin sauvegardé avec succès');
      setModal(false);
      setForm({
        agent_id: '', mois: NOW.getMonth() + 1, annee: NOW.getFullYear(),
        salaire_base: '', sursalaire: 0, indemnite_logement: 0,
        indemnite_transport: 0, indemnite_fonction: 0,
        prime_anciennete: 0, autres_primes: 0, heures_sup: 0,
        autres_retenues: 0, avance_salaire: 0, observations: '',
      });
      setAvancesAgent([]);
      loadBulletins();
    }
    setSaving(false);
  }

  // ── Delete bulletin ──
  // Also frees up linked advances so they can be re-applied to a future bulletin
  async function handleDelete(id) {
    if (!window.confirm('Supprimer ce bulletin ? Les avances liées seront réinitialisées.')) return;
    await supabase.from('avances').update({ deduite_bulletin_id: null }).eq('deduite_bulletin_id', id);
    await supabase.from('bulletins_paie').delete().eq('id', id);
    showToast('Bulletin de paie supprimé');
    loadBulletins();
  }

  // ── Delete all bulletins of current month/year ──
  async function handleDeleteTous() {
    if (bulletins.length === 0) return;
    if (!window.confirm(`Supprimer les ${bulletins.length} bulletin(s) de ${MOIS[filterMois - 1]} ${filterAnnee} ?\nLes avances liées seront réinitialisées. Cette action est irréversible.`)) return;
    const ids = bulletins.map(b => b.id);
    await supabase.from('avances').update({ deduite_bulletin_id: null }).in('deduite_bulletin_id', ids);
    await supabase.from('bulletins_paie').delete().in('id', ids);
    showToast(`${ids.length} bulletin(s) supprimé(s) avec succès`);
    loadBulletins();
  }

  // ── Filter bulletins ──
  const filtered = useMemo(() => bulletins.filter(b => {
    if (!search) return true;
    const name = `${b.agents?.prenom} ${b.agents?.nom}`.toLowerCase();
    return name.includes(search.toLowerCase());
  }), [bulletins, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Stats ──
  const totalNet  = bulletins.reduce((s, b) => s + (b.salaire_net || 0), 0);
  const totalBrut = bulletins.reduce((s, b) => s + (b.salaire_brut || 0), 0);
  const totalCNSS = bulletins.reduce((s, b) => s + (b.cnss_patronal || 0), 0);
  const valides   = bulletins.filter(b => b.statut === 'Validé').length;

  const years = Array.from({ length: 5 }, (_, i) => NOW.getFullYear() - i);

  // ── Access guard: only admin/rh can view payroll ──
  // Placed after all hooks to respect React's rules of hooks.
  if (!peutFaire(profil, 'voirPaie')) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: 400, color: '#A3A3A3', fontFamily: 'Poppins, sans-serif', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: '#FEE2E2',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <DollarSign size={28} color="#DC2626" />
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#737373', marginBottom: 6 }}>
          Accès restreint
        </p>
        <p style={{ fontSize: 13 }}>
          Vous n'avez pas les permissions nécessaires pour consulter les bulletins de paie.
        </p>
      </div>
    );
  }

  return (
    <div>

      {/* ── Period selector + actions ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10, marginBottom: 24, flexWrap: 'wrap',
      }}>
        <select className="filter-select" value={filterMois} onChange={e => setFilterMois(parseInt(e.target.value))}>
          {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="filter-select" value={filterAnnee} onChange={e => setFilterAnnee(parseInt(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleGenererTous}
          disabled={generating}
          title="Générer un PDF avec tous les bulletins du mois (sans enregistrement)"
        >
          <FileText size={14} />
          {generating
            ? generateProgress?.total > 0
              ? `${generateProgress.current}/${generateProgress.total} — ${generateProgress.nom}`
              : 'Génération…'
            : 'PDF seulement'
          }
        </button>
        <button
          className="btn btn-success btn-sm"
          onClick={handleGenererEtSauvegarder}
          disabled={generating}
          title="Calculer, enregistrer dans la base et télécharger le PDF pour tous les agents éligibles"
        >
          <Save size={14} />
          {generating
            ? generateProgress?.total > 0
              ? `${generateProgress.current}/${generateProgress.total} — ${generateProgress.nom}`
              : 'Enregistrement…'
            : 'Générer et enregistrer tous'
          }
        </button>
        {bulletins.length > 0 && (
          <button
            className="btn btn-danger btn-sm"
            onClick={handleDeleteTous}
            title={`Supprimer tous les bulletins de ${MOIS[filterMois - 1]} ${filterAnnee}`}
          >
            <Trash2 size={14} />
            Supprimer tous
          </button>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
          <Plus size={14} />
          Nouveau bulletin
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Bulletins',             value: bulletins.length, sub: 'ce mois',  color: '#E8920A', icon: FileText },
          { label: 'Validés',               value: valides,          sub: 'validés',  color: '#16A34A', icon: CheckCircle },
          { label: 'Masse salariale brute', value: `${Math.round(totalBrut/1000)}K`, sub: 'FCFA', color: '#2563EB', icon: DollarSign },
          { label: 'Masse nette',           value: `${Math.round(totalNet/1000)}K`,  sub: 'FCFA', color: '#16A34A', icon: DollarSign },
          { label: 'Charge CNSS pat.',      value: `${Math.round(totalCNSS/1000)}K`, sub: 'FCFA', color: '#DC2626', icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: 20 }}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${s.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={18} color={s.color} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bulletins table ── */}
      <div className="card">
        <div className="card-header">
          <h3>
            Bulletins de {MOIS[filterMois - 1]} {filterAnnee}
            <span style={{ fontSize: 12, color: '#A3A3A3', fontWeight: 400, marginLeft: 6 }}>
              ({filtered.length})
            </span>
          </h3>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#A3A3A3' }} />
            <input
              className="search-input"
              placeholder="Rechercher..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 32, width: 200, fontSize: 12 }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>#</th>
                <th>Agent</th>
                <th>Salaire brut</th>
                <th>CNSS sal.</th>
                <th>IUTS</th>
                <th>Avance</th>
                <th>Net à payer</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: '#A3A3A3' }}>Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                  Aucun bulletin pour cette période
                </td></tr>
              ) : paginated.map((b, idx) => {
                return (
                  <tr key={b.id}>
                    <td style={{ textAlign: 'center', color: '#A3A3A3', fontSize: 12, fontWeight: 500 }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{b.agents?.prenom} {b.agents?.nom}</div>
                        <div style={{ fontSize: 11, color: '#A3A3A3' }}>{b.agents?.poste}</div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{Math.round(b.salaire_brut || 0).toLocaleString('fr-FR')}</td>
                    <td>{Math.round(b.cnss_salarial || 0).toLocaleString('fr-FR')}</td>
                    <td>{Math.round(b.iuts || 0).toLocaleString('fr-FR')}</td>
                    <td style={{ color: b.avance_salaire > 0 ? '#0F0F0F' : '#A3A3A3' }}>
                      {b.avance_salaire > 0 ? Math.round(b.avance_salaire).toLocaleString('fr-FR') : '—'}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 14 }}>{Math.round(b.salaire_net || 0).toLocaleString('fr-FR')}</td>
                    <td>
                      <span className={`badge ${b.statut === 'Validé' ? 'badge-green' : 'badge-orange'}`}>
                        {b.statut}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => setViewModal(b)} title="Voir le bulletin">
                          <Eye size={13} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { const agent = getAgent(b.agent_id); if (agent) generateBulletinPDF(b, agent, entreprise); }}
                          title="Télécharger PDF"
                        >
                          <Printer size={13} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id)} title="Supprimer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '0 20px' }}>
          <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>

      {/* ════════════════════════════════
          FULL-SCREEN VIEW: New bulletin
      ════════════════════════════════ */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: '#F5F5F5',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* ── Top bar ── */}
          <div style={{
            background: '#FFFFFF', borderBottom: '1px solid #E5E5E5',
            padding: '14px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setModal(false); setAvancesAgent([]); }}>
                <X size={14} /> Fermer
              </button>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F0F0F', fontFamily: 'Poppins, sans-serif' }}>
                  Nouveau bulletin de paie
                </h2>
                {selectedAgent && (
                  <p style={{ fontSize: 12, color: '#A3A3A3', marginTop: 2 }}>
                    {selectedAgent.prenom} {selectedAgent.nom} — {MOIS[form.mois - 1]} {form.annee}
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={handlePrint} disabled={!preview}>
                <Printer size={14} />
                Imprimer
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => preview && selectedAgent && exportBulletinExcel(form, preview, selectedAgent, entreprise)}
                disabled={!preview}
              >
                <FileSpreadsheet size={14} />
                Export Excel
              </button>
              <button className="btn btn-secondary" onClick={() => handleSave('Brouillon')} disabled={saving}>
                <Save size={14} />
                Sauvegarder brouillon
              </button>
              <button className="btn btn-primary" onClick={() => handleSave('Validé')} disabled={saving}>
                <CheckCircle size={14} />
                {saving ? 'Validation...' : 'Valider le bulletin'}
              </button>
            </div>
          </div>

          {/* ── Two-column body ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* ── Left: form ── */}
            <div style={{
              width: '42%', minWidth: 380, maxWidth: 480,
              background: '#FFFFFF', borderRight: '1px solid #E5E5E5',
              overflowY: 'auto', padding: '24px 28px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#E8920A', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #FEF3E2' }}>
                Informations
              </div>

              <div className="form-grid">
                <div className="form-group full">
                  <label>Agent *</label>
                  <select value={form.agent_id} onChange={e => prefillFromAgent(e.target.value)}>
                    <option value="">Sélectionner un agent...</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.prenom} {a.nom} — {a.poste}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Mois *</label>
                  <select value={form.mois} onChange={e => setF('mois', e.target.value)}>
                    {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Année *</label>
                  <select value={form.annee} onChange={e => setF('annee', e.target.value)}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {selectedAgent && (
                <div style={{
                  marginTop: 10, padding: '8px 12px',
                  background: '#FFFBF5', border: '1px solid #FDDBA0',
                  borderRadius: 8, fontSize: 11, color: '#92400E',
                }}>
                  Situation : <strong>{selectedAgent.situation_matrimoniale || 'Célibataire'}</strong>
                  {' '}— Charges familiales : <strong>{selectedAgent.charges_familiales || 0}</strong> pers.
                </div>
              )}

              {avancesAgent.length > 0 && (
                <div style={{
                  marginTop: 8, padding: '8px 12px',
                  background: '#FEF3E2', border: '1px solid #FDDBA0',
                  borderRadius: 8, fontSize: 11, color: '#92400E',
                }}>
                  <Wallet size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /><strong>{avancesAgent.length} avance(s) approuvée(s)</strong> détectée(s) et appliquée(s) automatiquement
                  ({formatMontant(avancesAgent.reduce((s, a) => s + (parseFloat(a.montant) || 0), 0))})
                </div>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, color: '#E8920A', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '20px 0 14px', paddingBottom: 8, borderBottom: '2px solid #FEF3E2' }}>
                Éléments de rémunération
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Salaire de base *</label>
                  <input type="number" value={form.salaire_base} onChange={e => setF('salaire_base', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Sursalaire</label>
                  <input type="number" value={form.sursalaire} onChange={e => setF('sursalaire', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Indem. logement</label>
                  <input type="number" value={form.indemnite_logement} onChange={e => setF('indemnite_logement', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Indem. transport</label>
                  <input type="number" value={form.indemnite_transport} onChange={e => setF('indemnite_transport', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Indem. fonction</label>
                  <input type="number" value={form.indemnite_fonction} onChange={e => setF('indemnite_fonction', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Prime ancienneté</label>
                  <input type="number" value={form.prime_anciennete} onChange={e => setF('prime_anciennete', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Autres primes</label>
                  <input type="number" value={form.autres_primes} onChange={e => setF('autres_primes', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Heures supp.</label>
                  <input type="number" value={form.heures_sup} onChange={e => setF('heures_sup', e.target.value)} placeholder="0" />
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '20px 0 14px', paddingBottom: 8, borderBottom: '2px solid #FEE2E2' }}>
                Autres retenues
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Autres retenues</label>
                  <input type="number" value={form.autres_retenues} onChange={e => setF('autres_retenues', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Avance sur salaire {avancesAgent.length > 0 && <span style={{ color: '#E8920A' }}>(auto)</span>}</label>
                  <input type="number" value={form.avance_salaire} onChange={e => setF('avance_salaire', e.target.value)} placeholder="0" />
                </div>
                <div className="form-group full">
                  <label>Observations</label>
                  <input value={form.observations} onChange={e => setF('observations', e.target.value)} placeholder="Notes éventuelles..." />
                </div>
              </div>
            </div>

            {/* ── Right: live A4 preview ── */}
            <div style={{
              flex: 1, overflowY: 'auto',
              padding: '28px', display: 'flex', justifyContent: 'center',
              background: '#EFEFEF',
            }}>
              <div style={{ width: '100%', maxWidth: 720 }}>
                <BulletinPreview
                  form={form}
                  preview={preview}
                  agent={selectedAgent}
                  entreprise={entreprise}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          FULL-SCREEN VIEW: View existing bulletin
      ════════════════════════════════ */}
      {viewModal && (() => {
        const agent = getAgent(viewModal.agent_id);
        const formLike = {
          mois: viewModal.mois,
          annee: viewModal.annee,
          salaire_base: viewModal.salaire_base,
          sursalaire: viewModal.sursalaire,
          indemnite_logement: viewModal.indemnite_logement,
          indemnite_transport: viewModal.indemnite_transport,
          indemnite_fonction: viewModal.indemnite_fonction,
          prime_anciennete: viewModal.prime_anciennete,
          autres_primes: viewModal.autres_primes,
          heures_sup: viewModal.heures_sup,
          autres_retenues: viewModal.autres_retenues,
          avance_salaire: viewModal.avance_salaire,
        };

        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: '#F5F5F5',
            display: 'flex', flexDirection: 'column',
          }}>

            {/* ── Top bar ── */}
            <div style={{
              background: '#FFFFFF', borderBottom: '1px solid #E5E5E5',
              padding: '14px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setViewModal(null)}>
                  <X size={14} /> Fermer
                </button>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F0F0F', fontFamily: 'Poppins, sans-serif' }}>
                    Bulletin de paie
                  </h2>
                  <p style={{ fontSize: 12, color: '#A3A3A3', marginTop: 2 }}>
                    {viewModal.agents?.prenom} {viewModal.agents?.nom} — {MOIS[viewModal.mois - 1]} {viewModal.annee}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={handlePrint}>
                  <Printer size={14} />
                  Imprimer
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => agent && exportBulletinExcel(formLike, viewModal, agent, entreprise)}
                >
                  <FileSpreadsheet size={14} />
                  Export Excel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => { if (agent) generateBulletinPDF(viewModal, agent, entreprise); }}
                >
                  <FileText size={14} />
                  Télécharger PDF
                </button>
              </div>
            </div>

            {/* ── Centered A4 preview ── */}
            <div style={{
              flex: 1, overflowY: 'auto',
              padding: '28px', display: 'flex', justifyContent: 'center',
              background: '#EFEFEF',
            }}>
              <div style={{ width: '100%', maxWidth: 720 }}>
                <BulletinPreview
                  form={formLike}
                  preview={viewModal}
                  agent={agent}
                  entreprise={entreprise}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}