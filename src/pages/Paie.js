// Paie.js - Payroll management page
// Features: bulletin generation, CNSS/IUTS calculation, PDF export

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getInitials, avatarColor } from '../lib/helpers';
import {
  calculerBulletin, calculerNombreParts, formatFCFA,
} from '../lib/calcPaie';
import {
  DollarSign, Plus, FileText, Search,
  X, Save, Printer, Eye, Trash2, CheckCircle,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

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

// ── Generate bulletin PDF ─────────────────────────────────
function generateBulletinPDF(bulletin, agent, entreprise) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');
  const BLEU = [0, 51, 102];
  const ORANGE = [232, 146, 10];

  // ── Header ──
  doc.setFillColor(...BLEU);
  doc.rect(0, 0, 210, 30, 'F');

  if (entreprise?.logo_url) {
    try {
      doc.addImage(entreprise.logo_url, 'PNG', 4, 3, 24, 24);
    } catch (e) {}
  }

  const tx = entreprise?.logo_url ? 32 : 14;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(entreprise?.nom || 'Entreprise', tx, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text([
    entreprise?.siege_social || '',
    entreprise?.rccm ? `RCCM: ${entreprise.rccm}` : '',
    entreprise?.cnss_employeur ? `CNSS: ${entreprise.cnss_employeur}` : '',
  ].filter(Boolean).join('  |  '), tx, 19);
  doc.setTextColor(0, 0, 0);

  // ── Title ──
  let y = 38;
  doc.setFillColor(...ORANGE);
  doc.rect(14, y, 182, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`BULLETIN DE PAIE — ${MOIS[bulletin.mois - 1].toUpperCase()} ${bulletin.annee}`, 105, y + 7, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 16;

  // ── Agent info ──
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 22, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS DE L\'EMPLOYÉ', 17, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom : ${agent.prenom} ${agent.nom}`, 17, y + 13);
  doc.text(`Poste : ${agent.poste || '—'}`, 17, y + 19);
  doc.text(`Matricule : ${agent.matricule || '—'}`, 90, y + 13);
  doc.text(`Département : ${agent.departement || '—'}`, 90, y + 19);
  doc.text(`Type contrat : ${agent.type_contrat || '—'}`, 155, y + 13);
  doc.text(`N° CNSS : ${agent.cnss || '—'}`, 155, y + 19);
  y += 28;

  // ── Earnings table ──
  doc.setFillColor(230, 240, 255);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ÉLÉMENTS DE RÉMUNÉRATION', 17, y + 5.5);
  doc.text('MONTANT (FCFA)', 170, y + 5.5, { align: 'right' });
  y += 10;

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
  doc.setFontSize(9);
  earnings.forEach((e, i) => {
    if (i % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(14, y, 182, 7, 'F'); }
    doc.text(e.label, 17, y + 5);
    doc.text(Math.round(e.val).toLocaleString('fr-FR'), 192, y + 5, { align: 'right' });
    y += 7;
  });

  // Gross total
  doc.setFillColor(232, 146, 10);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SALAIRE BRUT', 17, y + 5.5);
  doc.text(Math.round(bulletin.salaire_brut).toLocaleString('fr-FR'), 192, y + 5.5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 12;

  // ── Deductions table ──
  doc.setFillColor(255, 235, 235);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('RETENUES', 17, y + 5.5);
  doc.text('MONTANT (FCFA)', 170, y + 5.5, { align: 'right' });
  y += 10;

  const deductions = [
    { label: `CNSS salarié (5.5% plafonné à 800 000 FCFA)`, val: bulletin.cnss_salarial },
    { label: `Salaire brut imposable`,                       val: bulletin.salaire_brut_imposable, info: true },
    { label: `IUTS (${bulletin.nombre_parts} part(s))`,     val: bulletin.iuts },
  ];

  doc.setFont('helvetica', 'normal');
  deductions.forEach((d, i) => {
    if (i % 2 === 0) { doc.setFillColor(252, 252, 252); doc.rect(14, y, 182, 7, 'F'); }
    doc.setTextColor(d.info ? 150 : 0, d.info ? 150 : 0, d.info ? 150 : 0);
    doc.text(d.label, 17, y + 5);
    doc.text(Math.round(d.val).toLocaleString('fr-FR'), 192, y + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 7;
  });

  // Total deductions
  doc.setFillColor(220, 50, 50);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL RETENUES', 17, y + 5.5);
  doc.text(Math.round(bulletin.total_retenues).toLocaleString('fr-FR'), 192, y + 5.5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 12;

  // ── Net salary ──
  doc.setFillColor(22, 163, 74);
  doc.rect(14, y, 182, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET À PAYER', 17, y + 8);
  doc.text(Math.round(bulletin.salaire_net).toLocaleString('fr-FR') + ' FCFA', 192, y + 8, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 18;

  // ── Employer info ──
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 10, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Charge patronale CNSS (19.8%) : ${Math.round(bulletin.cnss_patronal).toLocaleString('fr-FR')} FCFA`, 17, y + 7);
  doc.setTextColor(0, 0, 0);
  y += 16;

  // ── Signatures ──
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('L\'EMPLOYEUR', 40, y, { align: 'center' });
  doc.text('L\'EMPLOYÉ(E)', 170, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Cachet et signature', 40, y + 5, { align: 'center' });
  doc.text('Signature', 170, y + 5, { align: 'center' });
  y += 22;
  doc.setDrawColor(0, 0, 0);
  doc.line(14, y, 70, y);
  doc.line(130, y, 195, y);

  // ── Footer ──
  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Bulletin généré le ${today} — Document confidentiel`, 105, y, { align: 'center' });

  doc.save(`bulletin_${agent.prenom}_${agent.nom}_${MOIS[bulletin.mois - 1]}_${bulletin.annee}.pdf`);
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

  // ── Get agent family parts ──
  function getAgentParts(agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return 1;
    return calculerNombreParts(agent.situation_matrimoniale, agent.nombre_enfants);
  }

  // ── Pre-fill salary from agent data ──
  function prefillFromAgent(agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    setF('salaire_base', agent.salaire_brut || '');
    setF('agent_id', agentId);
  }

  // ── Compute preview ──
  const preview = form.agent_id ? calculerBulletin({
    ...form,
    nombre_parts: getAgentParts(form.agent_id),
  }) : null;

  // ── Save bulletin ──
  async function handleSave(statut = 'Brouillon') {
    if (!form.agent_id || !form.salaire_base) {
      showToast('Agent et salaire de base sont obligatoires', 'error');
      return;
    }
    setSaving(true);
    const calc = calculerBulletin({
      ...form,
      nombre_parts: getAgentParts(form.agent_id),
    });
    const data = {
      agent_id:              form.agent_id,
      mois:                  parseInt(form.mois),
      annee:                 parseInt(form.annee),
      salaire_base:          parseFloat(form.salaire_base) || 0,
      sursalaire:            parseFloat(form.sursalaire) || 0,
      indemnite_logement:    parseFloat(form.indemnite_logement) || 0,
      indemnite_transport:   parseFloat(form.indemnite_transport) || 0,
      indemnite_fonction:    parseFloat(form.indemnite_fonction) || 0,
      prime_anciennete:      parseFloat(form.prime_anciennete) || 0,
      autres_primes:         parseFloat(form.autres_primes) || 0,
      heures_sup:            parseFloat(form.heures_sup) || 0,
      nombre_parts:          getAgentParts(form.agent_id),
      observations:          form.observations || null,
      statut,
      created_by:            profil?.id,
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
        prime_anciennete: 0, autres_primes: 0, heures_sup: 0, observations: '',
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
  const totalNet      = bulletins.reduce((s, b) => s + (b.salaire_net || 0), 0);
  const totalBrut     = bulletins.reduce((s, b) => s + (b.salaire_brut || 0), 0);
  const totalCNSS     = bulletins.reduce((s, b) => s + (b.cnss_patronal || 0), 0);
  const valides       = bulletins.filter(b => b.statut === 'Validé').length;

  const years = Array.from({ length: 5 }, (_, i) => NOW.getFullYear() - i);

  return (
    <div>

      {/* ── Period selector + actions ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10, marginBottom: 24, flexWrap: 'wrap',
      }}>
        <select
          className="filter-select"
          value={filterMois}
          onChange={e => setFilterMois(parseInt(e.target.value))}
        >
          {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          className="filter-select"
          value={filterAnnee}
          onChange={e => setFilterAnnee(parseInt(e.target.value))}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
          <Plus size={14} />
          Nouveau bulletin
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 16, marginBottom: 24,
      }}>
        {[
          { label: 'Bulletins',        value: bulletins.length,            color: '#E8920A', icon: FileText },
          { label: 'Validés',          value: valides,                     color: '#16A34A', icon: CheckCircle },
          { label: 'Masse salariale brute', value: `${Math.round(totalBrut/1000)}K`, color: '#2563EB', icon: DollarSign },
          { label: 'Masse nette',      value: `${Math.round(totalNet/1000)}K`,  color: '#16A34A', icon: DollarSign },
          { label: 'Charge CNSS pat.', value: `${Math.round(totalCNSS/1000)}K`, color: '#DC2626', icon: DollarSign },
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
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: '#A3A3A3',
            }} />
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
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setViewModal(b)}
                          title="Voir le bulletin"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const agent = agents.find(a => a.id === b.agent_id);
                            if (agent) generateBulletinPDF(b, agent, entreprise);
                          }}
                          title="Télécharger PDF"
                        >
                          <Printer size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(b.id)}
                          title="Supprimer"
                        >
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
          MODAL: New bulletin
      ════════════════════════════════ */}
      {modal && (
        <div className="modal-overlay" onClick={e => {
          if (e.target === e.currentTarget) setModal(false);
        }}>
          <div className="modal" style={{ width: 760 }}>
            <div className="modal-header">
              <h3>Nouveau bulletin de paie</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* ── Left: inputs ── */}
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#E8920A',
                    textTransform: 'uppercase', letterSpacing: '0.8px',
                    marginBottom: 14, paddingBottom: 8,
                    borderBottom: '2px solid #FEF3E2',
                  }}>
                    Informations
                  </div>

                  <div className="form-grid">
                    <div className="form-group full">
                      <label>Agent *</label>
                      <select
                        value={form.agent_id}
                        onChange={e => prefillFromAgent(e.target.value)}
                      >
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

                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#E8920A',
                    textTransform: 'uppercase', letterSpacing: '0.8px',
                    margin: '16px 0 14px', paddingBottom: 8,
                    borderBottom: '2px solid #FEF3E2',
                  }}>
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
                    <div className="form-group full">
                      <label>Observations</label>
                      <input value={form.observations} onChange={e => setF('observations', e.target.value)} placeholder="Notes éventuelles..." />
                    </div>
                  </div>
                </div>

                {/* ── Right: preview ── */}
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#E8920A',
                    textTransform: 'uppercase', letterSpacing: '0.8px',
                    marginBottom: 14, paddingBottom: 8,
                    borderBottom: '2px solid #FEF3E2',
                  }}>
                    Aperçu du calcul
                  </div>

                  {!preview ? (
                    <div style={{
                      textAlign: 'center', padding: '40px 20px',
                      color: '#A3A3A3', fontSize: 13,
                      background: '#FAFAFA', borderRadius: 10,
                      border: '1px dashed #E5E5E5',
                    }}>
                      Sélectionnez un agent et saisissez le salaire de base pour voir le calcul
                    </div>
                  ) : (
                    <div style={{ background: '#FAFAFA', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E5E5' }}>

                      {/* Earnings */}
                      <div style={{ padding: '10px 14px', background: '#E8F4FF', fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
                        Rémunération
                      </div>
                      {[
                        { l: 'Salaire de base',        v: form.salaire_base },
                        { l: 'Sursalaire',             v: form.sursalaire },
                        { l: 'Indem. logement',        v: form.indemnite_logement },
                        { l: 'Indem. transport',       v: form.indemnite_transport },
                        { l: 'Indem. fonction',        v: form.indemnite_fonction },
                        { l: 'Prime ancienneté',       v: form.prime_anciennete },
                        { l: 'Autres primes',          v: form.autres_primes },
                        { l: 'Heures supp.',           v: form.heures_sup },
                      ].filter(r => parseFloat(r.v) > 0).map(r => (
                        <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 14px', fontSize: 12, borderBottom: '1px solid #F0F0F0' }}>
                          <span style={{ color: '#737373' }}>{r.l}</span>
                          <span style={{ fontWeight: 600 }}>{formatFCFA(r.v)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#E8920A', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                        <span>Salaire brut</span>
                        <span>{formatFCFA(preview.salaire_brut)}</span>
                      </div>

                      {/* Deductions */}
                      <div style={{ padding: '10px 14px', background: '#FFF0F0', fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>
                        Retenues
                      </div>
                      {[
                        { l: 'CNSS salarié (5.5%)',   v: preview.cnss_salarial },
                        { l: 'Brut imposable',        v: preview.salaire_brut_imposable, muted: true },
                        { l: `IUTS (${getAgentParts(form.agent_id)} part(s))`, v: preview.iuts },
                      ].map(r => (
                        <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 14px', fontSize: 12, borderBottom: '1px solid #F0F0F0', opacity: r.muted ? 0.6 : 1 }}>
                          <span style={{ color: '#737373' }}>{r.l}</span>
                          <span style={{ fontWeight: 600, color: r.muted ? '#737373' : '#DC2626' }}>{formatFCFA(r.v)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#DC2626', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                        <span>Total retenues</span>
                        <span>{formatFCFA(preview.total_retenues)}</span>
                      </div>

                      {/* Net */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#16A34A', fontSize: 15, fontWeight: 800, color: '#fff' }}>
                        <span>NET À PAYER</span>
                        <span>{formatFCFA(preview.salaire_net)}</span>
                      </div>

                      {/* Employer info */}
                      <div style={{ padding: '8px 14px', fontSize: 11, color: '#A3A3A3', borderTop: '1px solid #E5E5E5' }}>
                        Charge patronale CNSS : <strong>{formatFCFA(preview.cnss_patronal)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>
                Annuler
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
        </div>
      )}

      {/* ════════════════════════════════
          MODAL: View bulletin
      ════════════════════════════════ */}
      {viewModal && (() => {
        const agent = agents.find(a => a.id === viewModal.agent_id);
        return (
          <div className="modal-overlay" onClick={e => {
            if (e.target === e.currentTarget) setViewModal(null);
          }}>
            <div className="modal" style={{ width: 520 }}>
              <div className="modal-header">
                <div>
                  <h3>Bulletin de paie</h3>
                  <p style={{ fontSize: 12, color: '#A3A3A3', marginTop: 2, fontFamily: 'Poppins, sans-serif' }}>
                    {viewModal.agents?.prenom} {viewModal.agents?.nom} — {MOIS[viewModal.mois - 1]} {viewModal.annee}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { if (agent) generateBulletinPDF(viewModal, agent, entreprise); }}
                  >
                    <Printer size={13} />
                    PDF
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewModal(null)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <div style={{ background: '#FAFAFA', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E5E5' }}>

                  {/* Earnings */}
                  <div style={{ padding: '10px 14px', background: '#E8F4FF', fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
                    Rémunération
                  </div>
                  {[
                    { l: 'Salaire de base',       v: viewModal.salaire_base },
                    { l: 'Sursalaire',            v: viewModal.sursalaire },
                    { l: 'Indem. logement',       v: viewModal.indemnite_logement },
                    { l: 'Indem. transport',      v: viewModal.indemnite_transport },
                    { l: 'Indem. fonction',       v: viewModal.indemnite_fonction },
                    { l: 'Prime ancienneté',      v: viewModal.prime_anciennete },
                    { l: 'Autres primes',         v: viewModal.autres_primes },
                    { l: 'Heures supp.',          v: viewModal.heures_sup },
                  ].filter(r => parseFloat(r.v) > 0).map(r => (
                    <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 13, borderBottom: '1px solid #F0F0F0' }}>
                      <span style={{ color: '#737373' }}>{r.l}</span>
                      <span style={{ fontWeight: 600 }}>{formatFCFA(r.v)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#E8920A', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                    <span>Salaire brut</span>
                    <span>{formatFCFA(viewModal.salaire_brut)}</span>
                  </div>

                  {/* Deductions */}
                  <div style={{ padding: '10px 14px', background: '#FFF0F0', fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>
                    Retenues
                  </div>
                  {[
                    { l: 'CNSS salarié (5.5%)',  v: viewModal.cnss_salarial },
                    { l: 'Brut imposable',       v: viewModal.salaire_brut_imposable, muted: true },
                    { l: `IUTS (${viewModal.nombre_parts} part(s))`, v: viewModal.iuts },
                  ].map(r => (
                    <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 13, borderBottom: '1px solid #F0F0F0', opacity: r.muted ? 0.6 : 1 }}>
                      <span style={{ color: '#737373' }}>{r.l}</span>
                      <span style={{ fontWeight: 600, color: r.muted ? '#737373' : '#DC2626' }}>{formatFCFA(r.v)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#DC2626', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    <span>Total retenues</span>
                    <span>{formatFCFA(viewModal.total_retenues)}</span>
                  </div>

                  {/* Net */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', background: '#16A34A', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    <span>NET À PAYER</span>
                    <span>{formatFCFA(viewModal.salaire_net)}</span>
                  </div>

                  {/* Employer */}
                  <div style={{ padding: '10px 14px', fontSize: 12, color: '#A3A3A3' }}>
                    Charge patronale CNSS (19.8%) : <strong style={{ color: '#0F0F0F' }}>{formatFCFA(viewModal.cnss_patronal)}</strong>
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