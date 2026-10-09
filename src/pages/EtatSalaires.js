// EtatSalaires.js - Monthly payroll summary page
// Mirrors the Excel "ETAT DES SALAIRES" layout exactly (single bloc, no category split)
// Columns: N°, Noms, Fonction, Sal.Base | AVANTAGES(4) | Sal.Brut | Nb jours | RETENUES(CNSS emp, CNSS empr 16%, IUTS) | Sal.avant déd. | Retenue 1% | Avance | Sal.Net | TPA
// = 18 columns total

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { peutFaire } from '../lib/useProfil';
import {
  FileSpreadsheet, Printer, FileText,
  Users, DollarSign, Calendar,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Months ────────────────────────────────────────────────
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const NOW = new Date();

// ── Helpers ───────────────────────────────────────────────
function fmt(val) {
  return Math.round(parseFloat(val) || 0).toLocaleString('fr-FR');
}

// PDF: space as thousands separator
function fmtPDF(val) {
  const n = Math.round(parseFloat(val) || 0);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function sum(arr, key) {
  return arr.reduce((s, b) => s + (parseFloat(b[key]) || 0), 0);
}

function getEtatNum(mois, annee) {
  return `${String(mois).padStart(2, '0')}/${annee}`;
}

// CNSS patronal = 16% du salaire brut
function cnssEmployeur(salaireBrut) {
  return Math.round((parseFloat(salaireBrut) || 0) * 0.16);
}

// TPA = 3% du salaire brut
function tpaAgent(salaireBrut) {
  return Math.round((parseFloat(salaireBrut) || 0) * 0.03);
}

// ── PDF export ────────────────────────────────────────────
function generateEtatPDF(bulletins, entreprise, mois, annee) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const today = new Date().toLocaleDateString('fr-FR');
  const etatNum = getEtatNum(mois, annee);
  const nomMois = MOIS[mois - 1].toUpperCase();
  const nomEntreprise = (entreprise?.nom || 'L\'ENTREPRISE').toUpperCase();
  const ville = entreprise?.ville || 'OUAGADOUGOU';

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${ville}, le ${today}`, 14, 10);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `ETAT N°${etatNum}/RECAPITULATIF DES SALAIRES DE ${nomEntreprise} DU MOIS DE ${nomMois} ${annee}`,
    148, 17, { align: 'center' }
  );

  // 18 colonnes — 2 niveaux d'en-têtes
  const head = [
    [
      { content: 'N°',                rowSpan: 2, styles: { valign: 'middle' } },
      { content: 'Noms et prénoms',   rowSpan: 2, styles: { valign: 'middle' } },
      { content: 'Fonction',          rowSpan: 2, styles: { valign: 'middle' } },
      { content: 'SALAIRE\nDE BASE',  rowSpan: 2, styles: { valign: 'middle', halign: 'right' } },
      { content: 'AVANTAGES',         colSpan: 4, styles: { halign: 'center' } },
      { content: 'SALAIRE\nBRUT',     rowSpan: 2, styles: { valign: 'middle', halign: 'right', fontStyle: 'bold' } },
      { content: 'Nombre\nde jour\ntravaillé', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'RETENUES',          colSpan: 3, styles: { halign: 'center' } },
      { content: 'SALAIRE\nAVANT\nDÉDUCTION', rowSpan: 2, styles: { valign: 'middle', halign: 'right' } },
      { content: 'RETENUE\n1%\n(charge\nemployeur)', rowSpan: 2, styles: { valign: 'middle', halign: 'right' } },
      { content: 'AVANCE\nSUR\nSALAIRE', rowSpan: 2, styles: { valign: 'middle', halign: 'right' } },
      { content: 'SALAIRE\nNET',      rowSpan: 2, styles: { valign: 'middle', halign: 'right', fontStyle: 'bold' } },
      { content: 'TPA\n(3%)',         rowSpan: 2, styles: { valign: 'middle', halign: 'right' } },
    ],
    [
      { content: 'INDEM DE\nFONCTION', styles: { halign: 'right' } },
      { content: 'INDEM\nD\'H SUP',   styles: { halign: 'right' } },
      { content: 'INDEM DE\nLOGMT',   styles: { halign: 'right' } },
      { content: 'INDEM DE\nTRSPRT',  styles: { halign: 'right' } },
      { content: 'CNSS\nemployé',     styles: { halign: 'right' } },
      { content: 'CNSS\nemployeur\n(16%)', styles: { halign: 'right' } },
      { content: 'IUTS',              styles: { halign: 'right' } },
    ],
  ];

  const body = bulletins.map((b, i) => [
    i + 1,
    `${b.agents?.prenom || ''} ${b.agents?.nom || ''}`.trim(),
    b.agents?.poste || '',
    fmtPDF(b.salaire_base),
    fmtPDF(b.indemnite_fonction),
    fmtPDF(b.heures_sup || 0),
    fmtPDF(b.indemnite_logement),
    fmtPDF(b.indemnite_transport),
    fmtPDF(b.salaire_brut),
    b.jours_travailles || 'MOIS PLEIN',
    fmtPDF(b.cnss_salarial),
    fmtPDF(cnssEmployeur(b.salaire_brut)),
    fmtPDF(b.iuts),
    fmtPDF(b.salaire_net_avant_deduction),
    fmtPDF(b.retenue_effort_guerre),
    fmtPDF(b.avance_salaire),
    fmtPDF(b.salaire_net),
    fmtPDF(tpaAgent(b.salaire_brut)),
  ]);

  const totalBrutPDF   = sum(bulletins, 'salaire_brut');
  const totalCnssEmpr  = bulletins.reduce((s, b) => s + cnssEmployeur(b.salaire_brut), 0);
  const totalTPA       = Math.round(totalBrutPDF * 0.03);

  const totRow = [
    { content: '',               styles: { fontStyle: 'bold' } },
    { content: 'TOTAL GÉNÉRAL',  styles: { fontStyle: 'bold' } },
    '',
    fmtPDF(sum(bulletins, 'salaire_base')),
    fmtPDF(sum(bulletins, 'indemnite_fonction')),
    fmtPDF(sum(bulletins, 'heures_sup')),
    fmtPDF(sum(bulletins, 'indemnite_logement')),
    fmtPDF(sum(bulletins, 'indemnite_transport')),
    { content: fmtPDF(totalBrutPDF), styles: { fontStyle: 'bold' } },
    '',
    fmtPDF(sum(bulletins, 'cnss_salarial')),
    fmtPDF(totalCnssEmpr),
    fmtPDF(sum(bulletins, 'iuts')),
    fmtPDF(sum(bulletins, 'salaire_net_avant_deduction')),
    fmtPDF(sum(bulletins, 'retenue_effort_guerre')),
    fmtPDF(sum(bulletins, 'avance_salaire')),
    { content: fmtPDF(sum(bulletins, 'salaire_net')), styles: { fontStyle: 'bold' } },
    { content: fmtPDF(totalTPA), styles: { fontStyle: 'bold', halign: 'right' } },
  ];

  autoTable(doc, {
    head,
    body: [...body, totRow],
    startY: 22,
    theme: 'grid',
    styles: {
      fontSize: 6, font: 'helvetica',
      textColor: [26, 26, 26],
      lineColor: [180, 180, 180], lineWidth: 0.18,
      cellPadding: { top: 1.2, bottom: 1.2, left: 1.5, right: 1.5 },
      valign: 'middle',
    },
    headStyles: {
      fillColor: [50, 50, 50], textColor: [255, 255, 255],
      fontStyle: 'bold', fontSize: 6,
      lineColor: [255, 255, 255], lineWidth: 0.3,
    },
    columnStyles: {
      0:  { halign: 'center', cellWidth: 6 },
      1:  { cellWidth: 30 },
      2:  { cellWidth: 18 },
      3:  { halign: 'right', cellWidth: 12 },
      4:  { halign: 'right', cellWidth: 11 },
      5:  { halign: 'right', cellWidth: 10 },
      6:  { halign: 'right', cellWidth: 11 },
      7:  { halign: 'right', cellWidth: 11 },
      8:  { halign: 'right', cellWidth: 12 },
      9:  { halign: 'center', cellWidth: 12 },
      10: { halign: 'right', cellWidth: 10 },
      11: { halign: 'right', cellWidth: 12 },
      12: { halign: 'right', cellWidth: 9 },
      13: { halign: 'right', cellWidth: 12 },
      14: { halign: 'right', cellWidth: 11 },
      15: { halign: 'right', cellWidth: 11 },
      16: { halign: 'right', cellWidth: 12 },
      17: { halign: 'right', cellWidth: 10 },
    },
    didParseCell: (data) => {
      if (data.row.index === body.length) {
        data.cell.styles.fillColor = [220, 220, 220];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const finalY = (doc.lastAutoTable?.finalY || 22) + 8;
  const totalNet = Math.round(sum(bulletins, 'salaire_net'));

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Arrêté le présent état à la somme de : ${fmtPDF(totalNet)} FCFA`,
    14, finalY
  );

  const sigX = 255;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(entreprise?.qualite_representant || 'LE GERANT', sigX, finalY + 18, { align: 'center' });
  if (entreprise?.representant_nom) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(entreprise.representant_nom, sigX, finalY + 24, { align: 'center' });
  }
  if (entreprise?.mention_signataire) {
    doc.setFontSize(7);
    doc.text(entreprise.mention_signataire, sigX, finalY + 29, { align: 'center' });
  }

  doc.save(`etat_salaires_${MOIS[mois - 1]}_${annee}.pdf`);
}

// ── Excel export ──────────────────────────────────────────
// Optimisé pour tenir sur une page horizontale (A4 paysage)
function exportEtatExcel(bulletins, entreprise, mois, annee) {
  const etatNum = getEtatNum(mois, annee);
  const today   = new Date().toLocaleDateString('fr-FR');
  const nomMois = MOIS[mois - 1].toUpperCase();
  const nomEntreprise = (entreprise?.nom || '').toUpperCase();
  const ville   = entreprise?.ville || 'OUAGADOUGOU';

  // On construit en aoa (array of arrays) — 18 colonnes (A..R)
  const rows = [];

  // Ligne 1 : ville + date (col A)
  rows.push([`${ville}, le ${today}`]);
  rows.push([]);

  // Ligne 3 : titre centré (col A, on mergera A3:R3 plus bas)
  rows.push([`ETAT N°${etatNum}/RECAPITULATIF DES SALAIRES DE ${nomEntreprise} DU MOIS DE ${nomMois} ${annee}`]);
  rows.push([]);

  // Ligne 5 : en-têtes niveau 1
  // A:N° B:Noms C:Fonction D:Sal.Base E-H:AVANTAGES I:Sal.Brut J:Nb jours K-M:RETENUES N:Sal.avant déd. O:Retenue 1% P:Avance Q:Sal.Net R:TPA
  rows.push([
    'N°', 'Noms et prénoms', 'FONCTION', 'SALAIRE\nDE BASE',
    'AVANTAGES', '', '', '',
    'SALAIRE\nBRUT', 'Nombre\nde jour\ntravaillé',
    'RETENUES', '', '',
    'SALAIRE\nAVANT\nDÉDUCTION',
    'RETENUE\n1%\n(charge\nemployeur)',
    'AVANCE\nSUR\nSALAIRE',
    'SALAIRE\nNET',
    'TPA\n(3%)',
  ]);

  // Ligne 6 : en-têtes niveau 2 (sous-colonnes avantages + retenues)
  rows.push([
    '', '', '', '',
    'INDEM DE\nFONCTION', 'INDEM\nD\'H SUP', 'INDEM DE\nLOGMT', 'INDEM DE\nTRSPRT',
    '', '',
    'CNSS\nemployé', 'CNSS\nemployeur\n(16%)', 'IUTS',
    '', '', '', '', '',
  ]);

  // Données agents
  bulletins.forEach((b, i) => {
    rows.push([
      i + 1,
      `${b.agents?.prenom || ''} ${b.agents?.nom || ''}`.trim(),
      b.agents?.poste || '',
      Math.round(b.salaire_base || 0),
      Math.round(b.indemnite_fonction || 0),
      Math.round(b.heures_sup || 0),
      Math.round(b.indemnite_logement || 0),
      Math.round(b.indemnite_transport || 0),
      Math.round(b.salaire_brut || 0),
      b.jours_travailles || 'MOIS PLEIN',
      Math.round(b.cnss_salarial || 0),
      cnssEmployeur(b.salaire_brut),
      Math.round(b.iuts || 0),
      Math.round(b.salaire_net_avant_deduction || 0),
      Math.round(b.retenue_effort_guerre || 0),
      Math.round(b.avance_salaire || 0),
      Math.round(b.salaire_net || 0),
      tpaAgent(b.salaire_brut),
    ]);
  });

  // Ligne TOTAL GÉNÉRAL
  const totalBrutXLS  = Math.round(sum(bulletins, 'salaire_brut'));
  const totalCnssEmpr = bulletins.reduce((s, b) => s + cnssEmployeur(b.salaire_brut), 0);
  const totalTPA      = Math.round(totalBrutXLS * 0.03);
  rows.push([
    '', 'TOTAL GÉNÉRAL', '',
    Math.round(sum(bulletins, 'salaire_base')),
    Math.round(sum(bulletins, 'indemnite_fonction')),
    Math.round(sum(bulletins, 'heures_sup')),
    Math.round(sum(bulletins, 'indemnite_logement')),
    Math.round(sum(bulletins, 'indemnite_transport')),
    totalBrutXLS, '',
    Math.round(sum(bulletins, 'cnss_salarial')),
    totalCnssEmpr,
    Math.round(sum(bulletins, 'iuts')),
    Math.round(sum(bulletins, 'salaire_net_avant_deduction')),
    Math.round(sum(bulletins, 'retenue_effort_guerre')),
    Math.round(sum(bulletins, 'avance_salaire')),
    Math.round(sum(bulletins, 'salaire_net')),
    totalTPA,
  ]);

  rows.push([]);
  rows.push([
    `Arrêté le présent état à la somme de : ${fmt(sum(bulletins, 'salaire_net'))} FCFA`,
  ]);
  rows.push([]);

  if (entreprise?.qualite_representant) {
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      entreprise.qualite_representant]);
  }
  if (entreprise?.representant_nom) {
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      entreprise.representant_nom]);
  }
  if (entreprise?.mention_signataire) {
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      entreprise.mention_signataire]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Largeurs colonnes (en caractères) — calibrées pour tenir sur A4 paysage
  ws['!cols'] = [
    { wch: 4 },   // A : N°
    { wch: 24 },  // B : Noms
    { wch: 16 },  // C : Fonction
    { wch: 11 },  // D : Salaire base
    { wch: 10 },  // E : Indem fonction
    { wch: 9 },   // F : H.Sup
    { wch: 10 },  // G : Indem logement
    { wch: 10 },  // H : Indem transport
    { wch: 11 },  // I : Salaire brut
    { wch: 10 },  // J : Nb jours
    { wch: 10 },  // K : CNSS employé
    { wch: 11 },  // L : CNSS employeur
    { wch: 8 },   // M : IUTS
    { wch: 12 },  // N : Sal. avant déd.
    { wch: 11 },  // O : Retenue 1%
    { wch: 10 },  // P : Avance
    { wch: 11 },  // Q : Salaire net
    { wch: 9 },   // R : TPA
  ];

  // Hauteurs lignes : en-têtes sur 2 lignes doivent être hautes
  ws['!rows'] = [];
  const dataStartRow = 4; // index 0-based de la ligne d'en-tête niveau 1
  ws['!rows'][dataStartRow]     = { hpt: 42 }; // en-tête L1
  ws['!rows'][dataStartRow + 1] = { hpt: 42 }; // en-tête L2

  // Fusions cellules
  const merges = [
    // Titre — ligne 3 (index 2) : A3:R3
    { s: { r: 2, c: 0 }, e: { r: 2, c: 17 } },
    // En-têtes niveau 1 — ligne 5 (index 4) : colonnes qui span sur 2 lignes
    { s: { r: 4, c: 0 },  e: { r: 5, c: 0  } }, // N°
    { s: { r: 4, c: 1 },  e: { r: 5, c: 1  } }, // Noms
    { s: { r: 4, c: 2 },  e: { r: 5, c: 2  } }, // Fonction
    { s: { r: 4, c: 3 },  e: { r: 5, c: 3  } }, // Sal. base
    { s: { r: 4, c: 4 },  e: { r: 4, c: 7  } }, // AVANTAGES (E-H)
    { s: { r: 4, c: 8 },  e: { r: 5, c: 8  } }, // Sal. brut
    { s: { r: 4, c: 9 },  e: { r: 5, c: 9  } }, // Nb jours
    { s: { r: 4, c: 10 }, e: { r: 4, c: 12 } }, // RETENUES (K-M)
    { s: { r: 4, c: 13 }, e: { r: 5, c: 13 } }, // Sal. avant déd.
    { s: { r: 4, c: 14 }, e: { r: 5, c: 14 } }, // Retenue 1%
    { s: { r: 4, c: 15 }, e: { r: 5, c: 15 } }, // Avance
    { s: { r: 4, c: 16 }, e: { r: 5, c: 16 } }, // Sal. net
    { s: { r: 4, c: 17 }, e: { r: 5, c: 17 } }, // TPA
  ];
  ws['!merges'] = merges;

  // Orientation paysage A4
  ws['!pageSetup'] = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
  ws['!printOptions'] = { centerHorizontally: true };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Etat des salaires');
  XLSX.writeFile(wb, `etat_salaires_${MOIS[mois - 1]}_${annee}.xlsx`);
}

// ── Composant principal ───────────────────────────────────
export default function EtatSalaires({ entreprise, profil }) {
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [mois, setMois]           = useState(NOW.getMonth() + 1);
  const [annee, setAnnee]         = useState(NOW.getFullYear());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadBulletins(); }, [mois, annee]);

  async function loadBulletins() {
    setLoading(true);
    const { data } = await supabase
      .from('bulletins_paie')
      .select('*, agents(nom, prenom, poste, matricule)')
      .eq('mois', mois)
      .eq('annee', annee)
      .eq('statut', 'Validé')
      .order('created_at', { ascending: true });
    setBulletins(data || []);
    setLoading(false);
  }

  const years = Array.from({ length: 5 }, (_, i) => NOW.getFullYear() - i);

  // Totaux
  const totalBrut     = sum(bulletins, 'salaire_brut');
  const totalNet      = sum(bulletins, 'salaire_net');
  const totalCNSS     = sum(bulletins, 'cnss_salarial');
  const totalIUTS     = sum(bulletins, 'iuts');
  const totalCnssEmpr = bulletins.reduce((s, b) => s + cnssEmployeur(b.salaire_brut), 0);
  const totalTPA      = Math.round(totalBrut * 0.03);

  if (!peutFaire(profil, 'voirEtatSalaires')) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: 400, color: '#A3A3A3',
        fontFamily: 'Poppins, sans-serif', textAlign: 'center',
      }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#737373' }}>Accès restreint</p>
        <p style={{ fontSize: 13 }}>Vous n'avez pas les permissions nécessaires.</p>
      </div>
    );
  }

  const COL = 18; // nombre total de colonnes

  return (
    <div>
      {/* ── Sélecteur période + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select className="filter-select" value={mois} onChange={e => setMois(parseInt(e.target.value))}>
          {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="filter-select" value={annee} onChange={e => setAnnee(parseInt(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-secondary"
          onClick={() => bulletins.length > 0 && exportEtatExcel(bulletins, entreprise, mois, annee)}
          disabled={bulletins.length === 0}
        >
          <FileSpreadsheet size={14} />
          Export Excel
        </button>
        <button
          className="btn btn-primary"
          onClick={() => bulletins.length > 0 && generateEtatPDF(bulletins, entreprise, mois, annee)}
          disabled={bulletins.length === 0}
        >
          <Printer size={14} />
          Générer l'état (PDF)
        </button>
      </div>

      {/* ── Cartes stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Agents payés',              value: bulletins.length,                        color: '#E8920A', icon: Users },
          { label: 'Masse brute',               value: fmt(totalBrut) + ' FCFA',                color: '#2563EB', icon: DollarSign },
          { label: 'Retenues (CNSS + IUTS)',    value: fmt(totalCNSS + totalIUTS) + ' FCFA',    color: '#DC2626', icon: FileText },
          { label: 'Masse nette',               value: fmt(totalNet) + ' FCFA',                 color: '#16A34A', icon: Calendar },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: 15 }}>{s.value}</div>
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

      {/* ── Tableau état des salaires ── */}
      <div className="card">
        <div className="card-header">
          <h3>
            État des salaires — {MOIS[mois - 1]} {annee}
            <span style={{ fontSize: 12, color: '#A3A3A3', fontWeight: 400, marginLeft: 6 }}>
              (bulletins validés uniquement)
            </span>
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 11 }}>
            <thead>
              {/* Ligne 1 — groupes */}
              <tr>
                <th rowSpan={2} style={{ textAlign: 'center', width: 30, verticalAlign: 'middle' }}>N°</th>
                <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Noms et prénoms</th>
                <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Fonction</th>
                <th rowSpan={2} style={{ textAlign: 'right', verticalAlign: 'middle' }}>Salaire de base</th>
                <th colSpan={4} style={{ textAlign: 'center', borderBottom: '1px solid #E5E5E5' }}>
                  AVANTAGES
                </th>
                <th rowSpan={2} style={{ textAlign: 'right', verticalAlign: 'middle', fontWeight: 700 }}>Salaire brut</th>
                <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: 10 }}>Nb jours</th>
                <th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid #E5E5E5' }}>
                  RETENUES
                </th>
                <th rowSpan={2} style={{ textAlign: 'right', verticalAlign: 'middle', fontSize: 10 }}>Sal. avant déd.</th>
                <th rowSpan={2} style={{ textAlign: 'right', verticalAlign: 'middle', fontSize: 10 }}>Retenue 1%<br/><span style={{ fontSize: 9, fontWeight: 400 }}>(charge empl.)</span></th>
                <th rowSpan={2} style={{ textAlign: 'right', verticalAlign: 'middle' }}>Avance</th>
                <th rowSpan={2} style={{ textAlign: 'right', verticalAlign: 'middle', fontWeight: 700 }}>Salaire net</th>
                <th rowSpan={2} style={{ textAlign: 'right', verticalAlign: 'middle', fontSize: 10 }}>TPA<br/><span style={{ fontSize: 9, fontWeight: 400 }}>(3%)</span></th>
              </tr>
              {/* Ligne 2 — sous-colonnes */}
              <tr>
                <th style={{ textAlign: 'right', fontSize: 10 }}>Indem Fonct.</th>
                <th style={{ textAlign: 'right', fontSize: 10 }}>Indem H.Sup</th>
                <th style={{ textAlign: 'right', fontSize: 10 }}>Indem Logmt</th>
                <th style={{ textAlign: 'right', fontSize: 10 }}>Indem Trsprt</th>
                <th style={{ textAlign: 'right', fontSize: 10 }}>CNSS<br/><span style={{ fontSize: 9, fontWeight: 400 }}>employé</span></th>
                <th style={{ textAlign: 'right', fontSize: 10 }}>CNSS<br/><span style={{ fontSize: 9, fontWeight: 400 }}>empl. 16%</span></th>
                <th style={{ textAlign: 'right', fontSize: 10 }}>IUTS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COL} style={{ textAlign: 'center', padding: 40, color: '#A3A3A3' }}>
                    Chargement...
                  </td>
                </tr>
              ) : bulletins.length === 0 ? (
                <tr>
                  <td colSpan={COL} style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                    Aucun bulletin validé pour cette période
                  </td>
                </tr>
              ) : (
                <>
                  {bulletins.map((b, i) => (
                    <tr key={b.id}>
                      <td style={{ textAlign: 'center', color: '#A3A3A3', fontWeight: 500 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{b.agents?.prenom} {b.agents?.nom}</td>
                      <td style={{ color: '#737373' }}>{b.agents?.poste}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(b.salaire_base)}</td>
                      <td style={{ textAlign: 'right', color: '#737373' }}>{fmt(b.indemnite_fonction)}</td>
                      <td style={{ textAlign: 'right', color: '#737373' }}>{fmt(b.heures_sup || 0)}</td>
                      <td style={{ textAlign: 'right', color: '#737373' }}>{fmt(b.indemnite_logement)}</td>
                      <td style={{ textAlign: 'right', color: '#737373' }}>{fmt(b.indemnite_transport)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(b.salaire_brut)}</td>
                      <td style={{ textAlign: 'center', color: '#737373', fontSize: 10 }}>
                        {b.jours_travailles || 'MOIS PLEIN'}
                      </td>
                      <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{fmt(b.cnss_salarial)}</td>
                      <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{fmt(cnssEmployeur(b.salaire_brut))}</td>
                      <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{fmt(b.iuts)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(b.salaire_net_avant_deduction)}</td>
                      <td style={{ textAlign: 'right', color: '#737373' }}>{fmt(b.retenue_effort_guerre)}</td>
                      <td style={{ textAlign: 'right', color: b.avance_salaire > 0 ? '#0F0F0F' : '#A3A3A3' }}>
                        {b.avance_salaire > 0 ? fmt(b.avance_salaire) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(b.salaire_net)}</td>
                      <td style={{ textAlign: 'right', color: '#737373' }}>{fmt(tpaAgent(b.salaire_brut))}</td>
                    </tr>
                  ))}

                  {/* Ligne TOTAL GÉNÉRAL */}
                  <tr style={{ background: '#F0F0F0', fontWeight: 700, borderTop: '2px solid #D4D4D4' }}>
                    <td colSpan={3} style={{ fontWeight: 700 }}>TOTAL GÉNÉRAL</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'salaire_base'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'indemnite_fonction'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'heures_sup'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'indemnite_logement'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'indemnite_transport'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(totalBrut)}</td>
                    <td />
                    <td style={{ textAlign: 'right' }}>{fmt(totalCNSS)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(totalCnssEmpr)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(totalIUTS)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'salaire_net_avant_deduction'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'retenue_effort_guerre'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'avance_salaire'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(totalNet)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(totalTPA)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Note bas de page */}
        {bulletins.length > 0 && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #E5E5E5',
            fontSize: 12, color: '#737373',
            fontStyle: 'italic',
          }}>
            Arrêté le présent état à la somme de :{' '}
            <strong style={{ color: '#0F0F0F' }}>{fmt(totalNet)} FCFA</strong>
          </div>
        )}
      </div>
    </div>
  );
}
