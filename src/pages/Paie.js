// Paie.js - Payroll management page
// Features: bulletin generation (full-screen editor), CNSS/IUTS calculation
// (AIMDIGITAL model), PDF export, Excel export

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

// ── Generate bulletin PDF — replicates AIMDIGITAL layout ──
function generateBulletinPDF(bulletin, agent, entreprise) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');
  const BLEU = [0, 51, 102];
  const ORANGE = [232, 146, 10];

  // ── Header ──
  doc.setFillColor(...BLEU);
  doc.rect(0, 0, 210, 28, 'F');

  if (entreprise?.logo_url) {
    try { doc.addImage(entreprise.logo_url, 'PNG', 4, 2, 22, 22); } catch (e) {}
  }

  const tx = entreprise?.logo_url ? 30 : 14;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(entreprise?.nom || 'Entreprise', tx, 11);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text([
    entreprise?.siege_social || '',
    entreprise?.rccm ? `RCCM: ${entreprise.rccm}` : '',
    entreprise?.cnss_employeur ? `CNSS: ${entreprise.cnss_employeur}` : '',
  ].filter(Boolean).join('  |  '), tx, 17);
  doc.setTextColor(0, 0, 0);

  // ── Title ──
  let y = 34;
  doc.setFillColor(...ORANGE);
  doc.rect(14, y, 182, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`BULLETIN DE PAIE — ${MOIS[bulletin.mois - 1].toUpperCase()} ${bulletin.annee}`, 105, y + 6.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 14;

  // ── Agent info ──
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 20, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS DE L\'EMPLOYÉ', 17, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom : ${agent.prenom} ${agent.nom}`, 17, y + 11.5);
  doc.text(`Poste : ${agent.poste || '—'}`, 17, y + 17);
  doc.text(`Matricule : ${agent.matricule || '—'}`, 90, y + 11.5);
  doc.text(`Situation : ${agent.situation_matrimoniale || '—'} — ${agent.nombre_enfants || 0} enfant(s)`, 90, y + 17);
  doc.text(`N° CNSS : ${agent.cnss || '—'}`, 155, y + 11.5);
  doc.text(`${bulletin.personnes_a_charge} pers. à charge`, 155, y + 17);
  y += 24;

  // ── Earnings table ──
  doc.setFillColor(230, 240, 255);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ÉLÉMENTS DE RÉMUNÉRATION', 17, y + 5);
  doc.text('MONTANT (FCFA)', 170, y + 5, { align: 'right' });
  y += 9;

  const earnings = [
    { label: 'Salaire de base',          val: bulletin.salaire_base },
    { label: 'Sursalaire',               val: bulletin.sursalaire },
    { label: 'Indemnité de logement',    val: bulletin.indemnite_logement },
    { label: 'Indemnité de transport',   val: bulletin.indemnite_transport },
    { label: 'Indemnité de fonction',    val: bulletin.indemnite_fonction },
    { label: 'Prime d\'ancienneté',      val: bulletin.prime_anciennete },
    { label: 'Autres primes',            val: bulletin.autres_primes },
    { label: 'Heures supplémentaires',   val: bulletin.heures_sup },
  ].filter(e => e.val > 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  earnings.forEach((e, i) => {
    if (i % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(14, y, 182, 6, 'F'); }
    doc.text(e.label, 17, y + 4.3);
    doc.text(Math.round(e.val).toLocaleString('fr-FR'), 192, y + 4.3, { align: 'right' });
    y += 6;
  });

  doc.setFillColor(232, 146, 10);
  doc.rect(14, y, 182, 7.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SALAIRE BRUT', 17, y + 5.2);
  doc.text(Math.round(bulletin.salaire_brut).toLocaleString('fr-FR'), 192, y + 5.2, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 11;

  // ── Tax base detail ──
  doc.setFillColor(255, 245, 230);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DÉTAIL DE LA BASE IMPOSABLE IUTS', 17, y + 5);
  y += 9;

  const taxDetails = [
    { l: 'Salaire imposable (brut - contrôle CNSS)', v: bulletin.salaire_brut_imposable },
    { l: 'Exonération logement',                     v: -bulletin.exo_logement },
    { l: 'Exonération transport',                    v: -bulletin.exo_transport },
    { l: 'Exonération fonction',                     v: -bulletin.exo_fonction },
    { l: 'Abattement forfaitaire (25% base)',         v: -bulletin.abattement_forfaitaire },
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  taxDetails.forEach(d => {
    doc.text(d.l, 17, y + 4);
    doc.text(Math.round(d.v).toLocaleString('fr-FR'), 192, y + 4, { align: 'right' });
    y += 5.5;
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Base IUTS (arrondie)', 17, y + 4);
  doc.text(Math.round(bulletin.base_iuts).toLocaleString('fr-FR'), 192, y + 4, { align: 'right' });
  y += 9;

  // ── Deductions table ──
  doc.setFillColor(255, 235, 235);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('RETENUES', 17, y + 5);
  doc.text('MONTANT (FCFA)', 170, y + 5, { align: 'right' });
  y += 9;

  const deductions = [
    { label: 'CNSS salarié (5.5%, plafond 44 000 FCFA)', val: bulletin.cnss_salarial },
    { label: `IUTS brut (barème progressif)`,             val: bulletin.iuts_brut },
    { label: `Abattement charges familiales (${bulletin.personnes_a_charge} pers.)`, val: -bulletin.abattement_familial },
    { label: 'IUTS net à retenir',                        val: bulletin.iuts, bold: true },
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  deductions.forEach((d) => {
    if (d.bold) doc.setFont('helvetica', 'bold');
    doc.text(d.label, 17, y + 4.3);
    doc.text(Math.round(d.val).toLocaleString('fr-FR'), 192, y + 4.3, { align: 'right' });
    if (d.bold) doc.setFont('helvetica', 'normal');
    y += 6;
  });

  doc.setFillColor(220, 50, 50);
  doc.rect(14, y, 182, 7.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL RETENUES (CNSS + IUTS)', 17, y + 5.2);
  doc.text(Math.round(bulletin.total_retenues).toLocaleString('fr-FR'), 192, y + 5.2, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 11;

  // ── Other deductions ──
  if (bulletin.autres_retenues > 0 || bulletin.retenue_effort_guerre > 0 || bulletin.avance_salaire > 0) {
    const others = [
      { l: 'Autres retenues',                  v: bulletin.autres_retenues },
      { l: 'Retenue 1% (effort de guerre)',     v: bulletin.retenue_effort_guerre },
      { l: 'Avance sur salaire',                v: bulletin.avance_salaire },
    ].filter(o => o.v > 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    others.forEach(o => {
      doc.text(o.l, 17, y + 4);
      doc.text(Math.round(o.v).toLocaleString('fr-FR'), 192, y + 4, { align: 'right' });
      y += 5.5;
    });
    y += 2;
  }

  // ── Net salary ──
  doc.setFillColor(22, 163, 74);
  doc.rect(14, y, 182, 11, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET À PAYER', 17, y + 7.5);
  doc.text(Math.round(bulletin.salaire_net).toLocaleString('fr-FR') + ' FCFA', 192, y + 7.5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 16;

  // ── Employer info ──
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 9, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Charge patronale CNSS (16%) : ${Math.round(bulletin.cnss_patronal).toLocaleString('fr-FR')} FCFA`, 17, y + 6);
  doc.setTextColor(0, 0, 0);
  y += 15;

  if (y > 250) { doc.addPage(); y = 20; }

  // ── Signatures ──
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(entreprise?.qualite_representant || 'L\'EMPLOYEUR', 40, y, { align: 'center' });
  doc.text('L\'EMPLOYÉ(E)', 170, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  if (entreprise?.mention_signataire) {
    doc.text(entreprise.mention_signataire, 40, y + 5, { align: 'center' });
  } else {
    doc.text('Cachet et signature', 40, y + 5, { align: 'center' });
  }
  doc.text('Lu et approuvé', 170, y + 5, { align: 'center' });
  y += 22;
  doc.setDrawColor(0, 0, 0);
  doc.line(14, y, 70, y);
  doc.line(130, y, 195, y);
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(entreprise?.representant || '', 42, y + 4, { align: 'center' });
  doc.text(`${agent.prenom} ${agent.nom}`, 162, y + 4, { align: 'center' });

  y += 12;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
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

  // ── Compute live preview ──
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

  // ── Render a preview line (used in the "view" modal) ──
  function PreviewLine({ label, value, color, bold, muted }) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '6px 14px', fontSize: 12,
        borderBottom: '1px solid #F0F0F0',
        opacity: muted ? 0.6 : 1,
      }}>
        <span style={{ color: '#737373' }}>{label}</span>
        <span style={{ fontWeight: bold ? 700 : 600, color: color || '#0F0F0F' }}>
          {formatFCFA(value)}
        </span>
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
          MODAL: View bulletin
      ════════════════════════════════ */}
      {viewModal && (() => {
        const agent = getAgent(viewModal.agent_id);
        return (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setViewModal(null); }}>
            <div className="modal" style={{ width: 540 }}>
              <div className="modal-header">
                <div>
                  <h3>Bulletin de paie</h3>
                  <p style={{ fontSize: 12, color: '#A3A3A3', marginTop: 2 }}>
                    {viewModal.agents?.prenom} {viewModal.agents?.nom} — {MOIS[viewModal.mois - 1]} {viewModal.annee}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { if (agent) generateBulletinPDF(viewModal, agent, entreprise); }}>
                    <Printer size={13} /> PDF
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewModal(null)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <div style={{ background: '#FAFAFA', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E5E5' }}>

                  <div style={{ padding: '8px 14px', background: '#E8F4FF', fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
                    Rémunération
                  </div>
                  {[
                    { l: 'Salaire de base', v: viewModal.salaire_base },
                    { l: 'Sursalaire', v: viewModal.sursalaire },
                    { l: 'Indem. logement', v: viewModal.indemnite_logement },
                    { l: 'Indem. transport', v: viewModal.indemnite_transport },
                    { l: 'Indem. fonction', v: viewModal.indemnite_fonction },
                    { l: 'Prime ancienneté', v: viewModal.prime_anciennete },
                    { l: 'Autres primes', v: viewModal.autres_primes },
                    { l: 'Heures supp.', v: viewModal.heures_sup },
                  ].filter(r => parseFloat(r.v) > 0).map(r => <PreviewLine key={r.l} label={r.l} value={r.v} />)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#E8920A', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                    <span>Salaire brut</span><span>{formatFCFA(viewModal.salaire_brut)}</span>
                  </div>

                  <div style={{ padding: '8px 14px', background: '#FFF5E6', fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
                    Base imposable IUTS
                  </div>
                  <PreviewLine label="Salaire imposable" value={viewModal.salaire_brut_imposable} muted />
                  <PreviewLine label="Exonérations totales" value={-viewModal.total_exonerations} muted />
                  <PreviewLine label="Abattement forfaitaire (25%)" value={-viewModal.abattement_forfaitaire} muted />
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 12, fontWeight: 700, background: '#FEF3E2' }}>
                    <span>Base IUTS</span><span>{formatFCFA(viewModal.base_iuts)}</span>
                  </div>

                  <div style={{ padding: '8px 14px', background: '#FFF0F0', fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>
                    Retenues
                  </div>
                  <PreviewLine label="CNSS salarié (5.5%)" value={viewModal.cnss_salarial} color="#DC2626" />
                  <PreviewLine label="IUTS brut" value={viewModal.iuts_brut} muted />
                  <PreviewLine label={`Abattement familial (${viewModal.personnes_a_charge} pers.)`} value={-viewModal.abattement_familial} muted />
                  <PreviewLine label="IUTS net" value={viewModal.iuts} color="#DC2626" bold />
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#DC2626', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    <span>Total retenues</span><span>{formatFCFA(viewModal.total_retenues)}</span>
                  </div>

                  {(viewModal.autres_retenues > 0 || viewModal.retenue_effort_guerre > 0 || viewModal.avance_salaire > 0) && (
                    <>
                      <div style={{ padding: '8px 14px', background: '#F5F5F5', fontSize: 11, fontWeight: 700, color: '#737373', textTransform: 'uppercase' }}>
                        Autres déductions
                      </div>
                      {viewModal.autres_retenues > 0 && <PreviewLine label="Autres retenues" value={viewModal.autres_retenues} />}
                      <PreviewLine label="Retenue 1% (effort de guerre)" value={viewModal.retenue_effort_guerre} />
                      {viewModal.avance_salaire > 0 && <PreviewLine label="Avance sur salaire" value={viewModal.avance_salaire} />}
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', background: '#16A34A', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    <span>NET À PAYER</span><span>{formatFCFA(viewModal.salaire_net)}</span>
                  </div>

                  <div style={{ padding: '10px 14px', fontSize: 12, color: '#A3A3A3' }}>
                    Charge patronale CNSS (16%) : <strong style={{ color: '#0F0F0F' }}>{formatFCFA(viewModal.cnss_patronal)}</strong>
                  </div>

                  {viewModal.observations && (
                    <div style={{ padding: '10px 14px', fontSize: 12, color: '#737373', borderTop: '1px solid #E5E5E5' }}>
                      Observations : {viewModal.observations}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}