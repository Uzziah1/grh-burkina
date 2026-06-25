// Paie.js - Payroll management page
// Features: full-screen bulletin editor, real CNSS/IUTS calculation
// (AIMDIGITAL model), PDF/Excel export, print, black & white preview

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getInitials, avatarColor } from '../lib/helpers';
import {
  calculerBulletin, calculerPersonnesACharge, formatFCFA,
} from '../lib/calcPaie';
import {
  DollarSign, Plus, FileText, Search,
  X, Save, Printer, Eye, Trash2, CheckCircle, FileSpreadsheet,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import BulletinPreview from '../components/BulletinPreview';

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

// ── Generate bulletin PDF — clean black & white layout ────
// Mirrors the on-screen BulletinPreview component exactly
function generateBulletinPDF(bulletin, agent, entreprise) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');
  const NOIR = [26, 26, 26];
  const GRIS = [115, 115, 115];
  const GRIS_CLAIR = [240, 240, 240];

  let y = 14;

  // ── Header: logo + company ──
  if (entreprise?.logo_url) {
    try { doc.addImage(entreprise.logo_url, 'PNG', 14, y - 2, 18, 18); } catch (e) {}
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(14, y - 2, 18, 18);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(6);
    doc.setTextColor(...GRIS);
    doc.text('LOGO', 23, y + 7, { align: 'center' });
  }

  const tx = 36;
  doc.setTextColor(...NOIR);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(entreprise?.nom || 'Entreprise', tx, y + 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  doc.text([
    entreprise?.siege_social || '',
    entreprise?.rccm ? `RCCM: ${entreprise.rccm}` : '',
    entreprise?.cnss_employeur ? `CNSS: ${entreprise.cnss_employeur}` : '',
  ].filter(Boolean).join('  |  '), tx, y + 9);

  doc.setTextColor(...GRIS);
  doc.setFontSize(8);
  doc.text('Bulletin édité le', 196, y, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NOIR);
  doc.text(today, 196, y + 5, { align: 'right' });

  y += 22;
  doc.setDrawColor(...NOIR);
  doc.setLineWidth(0.6);
  doc.line(14, y, 196, y);
  y += 6;

  // ── Title bar ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`BULLETIN DE PAIE — ${MOIS[bulletin.mois - 1].toUpperCase()} ${bulletin.annee}`, 105, y + 3, { align: 'center' });
  y += 8;
  doc.setLineWidth(0.6);
  doc.line(14, y, 196, y);
  y += 6;

  // ── Employer / Employee info ──
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEUR', 17, y + 2);
  doc.text('EMPLOYÉ(E)', 107, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(entreprise?.nom || '—', 17, y + 8);
  doc.text(`${agent.prenom} ${agent.nom}`, 107, y + 8);
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(`Représenté par : ${entreprise?.representant || '—'}`, 17, y + 13);
  doc.text(`${agent.poste || '—'}${agent.departement ? ' — ' + agent.departement : ''}`, 107, y + 13);
  doc.text(`${entreprise?.qualite_representant || ''}`, 17, y + 18);
  doc.text(`Matricule : ${agent.matricule || '—'} | CNSS : ${agent.cnss || '—'}`, 107, y + 18);
  doc.setTextColor(...NOIR);
  y += 24;
  doc.setLineWidth(0.6);
  doc.line(14, y, 196, y);
  y += 2;

  // ── Helper: section band ──
  const band = (label) => {
    doc.setFillColor(...NOIR);
    doc.rect(14, y, 182, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(label.toUpperCase(), 17, y + 4.5);
    doc.setTextColor(...NOIR);
    y += 8.5;
  };

  // ── Helper: simple row ──
  const row = (label, val, opts = {}) => {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(14, y + 5, 196, y + 5);
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    const c = opts.muted ? 130 : NOIR[0];
    doc.setTextColor(opts.muted ? 130 : NOIR[0], opts.muted ? 130 : NOIR[1], opts.muted ? 130 : NOIR[2]);
    doc.text((opts.indent ? '   ' : '') + label, 17, y + 3.5);
    doc.text(Math.round(val).toLocaleString('fr-FR'), 193, y + 3.5, { align: 'right' });
    doc.setTextColor(...NOIR);
    y += 6.2;
  };

  // ── Helper: total row ──
  const totalRow = (label, val, big = false) => {
    const h = big ? 9 : 7.5;
    doc.setFillColor(...GRIS_CLAIR);
    doc.rect(14, y, 182, h, 'F');
    doc.setDrawColor(...NOIR);
    doc.setLineWidth(0.5);
    doc.line(14, y, 196, y);
    doc.line(14, y + h, 196, y + h);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(big ? 12 : 10);
    doc.text(label, 17, y + (big ? 6.3 : 5.2));
    doc.text(Math.round(val).toLocaleString('fr-FR') + ' FCFA', 193, y + (big ? 6.3 : 5.2), { align: 'right' });
    y += h + 3;
  };

  // ── Earnings ──
  band('Éléments de rémunération');
  const earnings = [
    { label: 'Salaire de base',        val: bulletin.salaire_base },
    { label: 'Sursalaire',             val: bulletin.sursalaire },
    { label: 'Indemnité de logement',  val: bulletin.indemnite_logement },
    { label: 'Indemnité de transport', val: bulletin.indemnite_transport },
    { label: 'Indemnité de fonction',  val: bulletin.indemnite_fonction },
    { label: 'Prime d\'ancienneté',    val: bulletin.prime_anciennete },
    { label: 'Autres primes',          val: bulletin.autres_primes },
    { label: 'Heures supplémentaires', val: bulletin.heures_sup },
  ].filter(e => e.val > 0);
  earnings.forEach(e => row(e.label, e.val));
  totalRow('SALAIRE BRUT', bulletin.salaire_brut);

  // ── Tax base detail ──
  if (y > 225) { doc.addPage(); y = 20; }
  band('Base imposable IUTS');
  row('Salaire imposable (brut - contrôle CNSS)', bulletin.salaire_brut_imposable, { muted: true });
  row('Exonération logement', -bulletin.exo_logement, { muted: true, indent: true });
  row('Exonération transport', -bulletin.exo_transport, { muted: true, indent: true });
  row('Exonération fonction', -bulletin.exo_fonction, { muted: true, indent: true });
  row('Abattement forfaitaire (25% base)', -bulletin.abattement_forfaitaire, { muted: true });
  totalRow('BASE IUTS (arrondie)', bulletin.base_iuts);

  // ── Deductions ──
  if (y > 215) { doc.addPage(); y = 20; }
  band('Retenues');
  row('CNSS salarié (5.5%, plafond 44 000 FCFA)', bulletin.cnss_salarial);
  row('IUTS brut (barème progressif)', bulletin.iuts_brut, { muted: true });
  row(`Abattement charges familiales (${bulletin.personnes_a_charge} pers.)`, -bulletin.abattement_familial, { muted: true, indent: true });
  row('IUTS net à retenir', bulletin.iuts, { bold: true });
  totalRow('TOTAL RETENUES (CNSS + IUTS)', bulletin.total_retenues);

  // ── Other deductions ──
  if (bulletin.autres_retenues > 0 || bulletin.retenue_effort_guerre > 0 || bulletin.avance_salaire > 0) {
    if (y > 225) { doc.addPage(); y = 20; }
    band('Autres déductions');
    if (bulletin.autres_retenues > 0) row('Autres retenues', bulletin.autres_retenues);
    if (bulletin.retenue_effort_guerre > 0) row('Retenue 1% (effort de guerre)', bulletin.retenue_effort_guerre);
    if (bulletin.avance_salaire > 0) row('Avance sur salaire', bulletin.avance_salaire);
    y += 2;
  }

  // ── Net salary ──
  if (y > 230) { doc.addPage(); y = 20; }
  totalRow('NET À PAYER', bulletin.salaire_net, true);

  // ── Employer charge note ──
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.setFont('helvetica', 'normal');
  doc.text(`Charge patronale CNSS (16%) : ${Math.round(bulletin.cnss_patronal).toLocaleString('fr-FR')} FCFA`, 17, y + 4);
  doc.setTextColor(...NOIR);
  y += 14;

  // ── Signatures ──
  if (y > 245) { doc.addPage(); y = 20; }
  doc.setDrawColor(...NOIR);
  doc.setLineWidth(0.5);
  doc.line(14, y, 196, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(entreprise?.qualite_representant || 'L\'EMPLOYEUR', 40, y, { align: 'center' });
  doc.text('L\'EMPLOYÉ(E)', 170, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRIS);
  doc.text(entreprise?.mention_signataire || 'Cachet et signature', 40, y + 5, { align: 'center' });
  doc.text('Lu et approuvé', 170, y + 5, { align: 'center' });
  doc.setTextColor(...NOIR);
  y += 22;
  doc.setDrawColor(...NOIR);
  doc.line(14, y, 70, y);
  doc.line(130, y, 195, y);
  doc.setFontSize(8);
  doc.text(entreprise?.representant || '', 42, y + 4, { align: 'center' });
  doc.text(`${agent.prenom} ${agent.nom}`, 162, y + 4, { align: 'center' });

  y += 12;
  doc.setFontSize(7);
  doc.setTextColor(...GRIS);
  if (entreprise?.pied_de_page) {
    doc.text(entreprise.pied_de_page, 105, y, { align: 'center' });
    y += 5;
  }
  doc.text(`Bulletin généré le ${today} — Document confidentiel`, 105, y, { align: 'center' });

  doc.save(`bulletin_${agent.prenom}_${agent.nom}_${MOIS[bulletin.mois - 1]}_${bulletin.annee}.pdf`);
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
    ['Retenue 1% (effort de guerre)', preview?.retenue_effort_guerre || 0],
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
  const [filterMois, setFilterMois] = useState(NOW.getMonth() + 1);
  const [filterAnnee, setFilterAnnee] = useState(NOW.getFullYear());
  const [saving, setSaving] = useState(false);

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

  // ── Pre-fill salary from agent data ──
  function prefillFromAgent(agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    setF('salaire_base', agent.salaire_brut || '');
    setF('agent_id', agentId);
  }

  // ── Compute live preview for the "new bulletin" form ──
  const selectedAgent = getAgent(form.agent_id);
  const preview = form.agent_id && form.salaire_base ? calculerBulletin({
    ...form,
    situation_matrimoniale: selectedAgent?.situation_matrimoniale || 'Célibataire',
    nombre_enfants: selectedAgent?.nombre_enfants || 0,
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
      situation_matrimoniale: agent?.situation_matrimoniale || 'Célibataire',
      nombre_enfants: agent?.nombre_enfants || 0,
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

    const { error } = await supabase.from('bulletins_paie').upsert(data, {
      onConflict: 'agent_id,mois,annee',
    });

    if (error) showToast('Erreur lors de l\'enregistrement : ' + error.message, 'error');
    else {
      showToast(statut === 'Validé' ? 'Bulletin validé !' : 'Bulletin sauvegardé');
      setModal(false);
      setForm({
        agent_id: '', mois: NOW.getMonth() + 1, annee: NOW.getFullYear(),
        salaire_base: '', sursalaire: 0, indemnite_logement: 0,
        indemnite_transport: 0, indemnite_fonction: 0,
        prime_anciennete: 0, autres_primes: 0, heures_sup: 0,
        autres_retenues: 0, avance_salaire: 0, observations: '',
      });
      loadBulletins();
    }
    setSaving(false);
  }

  // ── Delete bulletin ──
  async function handleDelete(id) {
    if (!window.confirm('Supprimer ce bulletin ?')) return;
    await supabase.from('bulletins_paie').delete().eq('id', id);
    showToast('Bulletin supprimé');
    loadBulletins();
  }

  // ── Filter bulletins ──
  const filtered = bulletins.filter(b => {
    if (!search) return true;
    const name = `${b.agents?.prenom} ${b.agents?.nom}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // ── Stats ──
  const totalNet  = bulletins.reduce((s, b) => s + (b.salaire_net || 0), 0);
  const totalBrut = bulletins.reduce((s, b) => s + (b.salaire_brut || 0), 0);
  const totalCNSS = bulletins.reduce((s, b) => s + (b.cnss_patronal || 0), 0);
  const valides   = bulletins.filter(b => b.statut === 'Validé').length;

  const years = Array.from({ length: 5 }, (_, i) => NOW.getFullYear() - i);

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
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
          <Plus size={14} />
          Nouveau bulletin
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Bulletins',             value: bulletins.length, color: '#E8920A', icon: FileText },
          { label: 'Validés',               value: valides,          color: '#16A34A', icon: CheckCircle },
          { label: 'Masse salariale brute', value: `${Math.round(totalBrut/1000)}K`, color: '#2563EB', icon: DollarSign },
          { label: 'Masse nette',           value: `${Math.round(totalNet/1000)}K`,  color: '#16A34A', icon: DollarSign },
          { label: 'Charge CNSS pat.',      value: `${Math.round(totalCNSS/1000)}K`, color: '#DC2626', icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: 20 }}>{s.value}</div>
                <div className="stat-sub">FCFA</div>
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
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, width: 200, fontSize: 12 }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Salaire brut</th>
                <th>CNSS sal.</th>
                <th>IUTS</th>
                <th>Net à payer</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#A3A3A3' }}>Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                  Aucun bulletin pour cette période
                </td></tr>
              ) : filtered.map(b => {
                const c = avatarColor(b.agents?.nom || '');
                return (
                  <tr key={b.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: c.bg, color: c.fg }}>
                          {getInitials(b.agents?.nom, b.agents?.prenom)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{b.agents?.prenom} {b.agents?.nom}</div>
                          <div style={{ fontSize: 11, color: '#A3A3A3' }}>{b.agents?.poste}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatFCFA(b.salaire_brut)}</td>
                    <td style={{ color: '#DC2626' }}>{formatFCFA(b.cnss_salarial)}</td>
                    <td style={{ color: '#DC2626' }}>{formatFCFA(b.iuts)}</td>
                    <td style={{ fontWeight: 700, color: '#16A34A', fontSize: 14 }}>{formatFCFA(b.salaire_net)}</td>
                    <td>
                      <span className={`badge ${b.statut === 'Validé' ? 'badge-green' : 'badge-orange'}`}>
                        {b.statut}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
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
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>
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
                  {' '}— {selectedAgent.nombre_enfants || 0} enfant(s) à charge
                  {' '}({calculerPersonnesACharge(selectedAgent.situation_matrimoniale, selectedAgent.nombre_enfants)} pers. retenues, max 6 enfants)
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
                  <label>Avance sur salaire</label>
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