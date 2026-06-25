// Agents.js - HR agents management page
// Features: search, filters, add/edit/delete, document generation, Excel import/export

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { age, formatDate, getInitials, avatarColor, joursRestants } from '../lib/helpers';
import { peutFaire } from '../lib/useProfil';
import * as XLSX from 'xlsx';
import {
  Search, SlidersHorizontal, Download, Upload,
  Plus, Eye, Pencil, Trash2, FileText,
  X, Save, AlertTriangle, Award,
  CalendarCheck, CalendarOff, Wallet,
} from 'lucide-react';
import {
  generateAttestation, generateConge,
  generateAvance, generateCDI, generateCDD,
} from '../lib/generatePDF';

// ── Constants ─────────────────────────────────────────────
const CATEGORIES = [
  'Cadre supérieur', 'Cadre', 'Agent de maîtrise',
  'Employé qualifié', 'Employé non qualifié',
  'Ouvrier qualifié', 'Ouvrier non qualifié',
];

const SITUATIONS = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'];

const EMPTY_FORM = {
  matricule: '', nom: '', prenom: '', sexe: '', date_naissance: '',
  lieu_naissance: '', nationalite: 'Burkinabè', situation_matrimoniale: '',
  nombre_enfants: 0, nin: '', cnss: '', adresse: '', telephone: '',
  email: '', urgence_nom: '', urgence_telephone: '', niveau_etudes: '',
  diplome: '', specialite: '', poste: '', departement: '',
  categorie_socioprofessionnelle: '', type_contrat: 'CDI',
  date_embauche: '', date_fin_contrat: '', salaire_brut: '', statut: 'Actif',
};

// ── Document types config ─────────────────────────────────
const DOC_TYPES = [
  { type: 'cdi',         Icon: FileText,      titre: 'Contrat CDI',            desc: 'Contrat à durée indéterminée', color: '#2563EB' },
  { type: 'cdd',         Icon: FileText,      titre: 'Contrat CDD',            desc: 'Contrat à durée déterminée',   color: '#D97706' },
  { type: 'attestation', Icon: Award,         titre: 'Attestation de travail', desc: 'Certifie l\'emploi',           color: '#16A34A' },
  { type: 'conge',       Icon: CalendarCheck, titre: 'Autorisation de congé',  desc: 'Congés payés',                 color: '#8B5CF6' },
  { type: 'absence',     Icon: CalendarOff,   titre: 'Autorisation d\'absence', desc: 'Absence ponctuelle',          color: '#EC4899' },
  { type: 'avance',      Icon: Wallet,        titre: 'Avance sur salaire',     desc: 'Demande d\'avance',            color: '#E8920A' },
];

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

// ── Form section title ────────────────────────────────────
function FormSection({ title }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#E8920A',
      textTransform: 'uppercase', letterSpacing: '0.8px',
      margin: '22px 0 14px', paddingBottom: 8,
      borderBottom: '2px solid #FEF3E2',
      fontFamily: 'Poppins, sans-serif',
    }}>
      {title}
    </div>
  );
}

// ── Main Agents component ─────────────────────────────────
export default function Agents({ agents, onRefresh, entreprise, onOpenFiche, profil }) {
  const [filters, setFilters] = useState({
    search: '', type: '', poste: '', categorie: '', age: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [docModal, setDocModal] = useState(null);
  const [step, setStep] = useState(1);

  // ── Unique filter options ──
  const postes = [...new Set(agents.map(a => a.poste))].sort();
  const cats   = [...new Set(agents.map(a => a.categorie_socioprofessionnelle).filter(Boolean))].sort();

  // ── Filter agents ──
  const filtered = agents.filter(a => {
    const name = `${a.prenom} ${a.nom} ${a.matricule || ''}`.toLowerCase();
    if (filters.search && !name.includes(filters.search.toLowerCase())) return false;
    if (filters.type && a.type_contrat !== filters.type) return false;
    if (filters.poste && a.poste !== filters.poste) return false;
    if (filters.categorie && a.categorie_socioprofessionnelle !== filters.categorie) return false;
    if (filters.age) {
      const a_ = age(a.date_naissance);
      if (filters.age === '<30'   && a_ >= 30)              return false;
      if (filters.age === '30-40' && (a_ < 30 || a_ > 40)) return false;
      if (filters.age === '40-50' && (a_ < 40 || a_ > 50)) return false;
      if (filters.age === '>50'   && a_ <= 50)              return false;
    }
    return true;
  });

  // ── Open add modal ──
  function openAdd() {
    setForm(EMPTY_FORM);
    setEditAgent(null);
    setModal(true);
  }

  // ── Open edit modal ──
  function openEdit(a) {
    setForm({
      ...EMPTY_FORM, ...a,
      salaire_brut:   a.salaire_brut || '',
      nombre_enfants: a.nombre_enfants || 0,
    });
    setEditAgent(a);
    setModal(true);
  }

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

  // ── Save agent ──
  async function handleSubmit() {
    if (!form.nom || !form.prenom || !form.poste) {
      showToast('Nom, prénom et poste sont obligatoires', 'error');
      return;
    }
    setLoading(true);
    const data = {
      ...form,
      matricule:        form.matricule || null,
      salaire_brut:     form.salaire_brut ? parseFloat(form.salaire_brut) : null,
      nombre_enfants:   parseInt(form.nombre_enfants) || 0,
      date_naissance:   form.date_naissance || null,
      date_embauche:    form.date_embauche || null,
      date_fin_contrat: form.date_fin_contrat || null,
    };
    if (editAgent) {
      const { error } = await supabase.from('agents').update(data).eq('id', editAgent.id);
      if (error) showToast('Erreur lors de la modification', 'error');
      else { showToast('Agent modifié avec succès'); setModal(false); onRefresh(); }
    } else {
      const { error } = await supabase.from('agents').insert(data);
      if (error) showToast('Erreur lors de l\'ajout', 'error');
      else { showToast('Agent ajouté avec succès'); setModal(false); onRefresh(); }
    }
    setLoading(false);
  }

  // ── Delete agent ──
  async function handleDelete(id) {
    if (!window.confirm('Supprimer cet agent ? Cette action est irréversible.')) return;
    await supabase.from('agents').delete().eq('id', id);
    showToast('Agent supprimé');
    onRefresh();
  }

  // ── Generate document ──
  async function generateDoc(type, a) {
    if (!entreprise || !entreprise.nom) {
      showToast('Veuillez configurer les informations de l\'entreprise', 'error');
      return;
    }
    try {
      if (type === 'cdi')          await generateCDI(a, entreprise);
      else if (type === 'cdd')     await generateCDD(a, entreprise);
      else if (type === 'attestation') await generateAttestation(a, entreprise);
      else if (type === 'conge')   await generateConge(a, entreprise);
      else if (type === 'avance')  await generateAvance(a, entreprise);
      showToast('PDF généré et téléchargé');
      setDocModal(null);
    } catch (e) {
      showToast('Erreur lors de la génération du PDF', 'error');
    }
  }

// ── Convert Excel date to ISO string ──
function excelDateToISO(val) {
  if (!val) return null;
  if (val === '' || val === 'undefined') return null;

  // Already ISO format YYYY-MM-DD
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;

  // Format DD/MM/YYYY
  if (typeof val === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
    const [d, m, y] = val.split('/');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // Format DD-MM-YYYY
  if (typeof val === 'string' && /^\d{1,2}-\d{1,2}-\d{4}$/.test(val)) {
    const [d, m, y] = val.split('-');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // Excel serial number (e.g. 46023)
  if (typeof val === 'number' || (typeof val === 'string' && !isNaN(val))) {
    const serial = parseInt(val);
    // Excel epoch starts 1900-01-01 (with leap year bug)
    const date = new Date((serial - 25569) * 86400 * 1000);
    if (isNaN(date.getTime())) return null;
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    // Sanity check - year must be reasonable
    if (y < 1900 || y > 2100) return null;
    return `${y}-${m}-${d}`;
  }

  // JS Date object (when cellDates:true works)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    if (y < 1900 || y > 2100) return null;
    return `${y}-${m}-${d}`;
  }

  return null;
}

// ── Export Excel ──
function exportExcel() {
  const data = agents.map(a => ({
    'Matricule':        a.matricule || '',
    'Nom':              a.nom,
    'Prenom':           a.prenom,
    'Sexe':             a.sexe || '',
    'Date naissance':   a.date_naissance || '',
    'Age':              age(a.date_naissance),
    'Telephone':        a.telephone || '',
    'Email':            a.email || '',
    'Poste':            a.poste,
    'Departement':      a.departement || '',
    'Categorie':        a.categorie_socioprofessionnelle || '',
    'Type contrat':     a.type_contrat,
    'Date embauche':    a.date_embauche || '',
    'Date fin contrat': a.date_fin_contrat || '',
    'Salaire brut':     a.salaire_brut || '',
    'Statut':           a.statut || 'Actif',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  try {
    const wb = XLSX.utils.book_new();
    wb.SheetNames.push('Agents');
    wb.Sheets['Agents'] = ws;
    XLSX.writeFile(wb, 'agents_export.xlsx');
    showToast('Export Excel téléchargé');
  } catch (e) {
    console.error('Export error:', e);
    showToast('Erreur lors de l\'export', 'error');
  }
}

// ── Import Excel ──
function importExcel(file) {
  const reader = new FileReader();
  reader.onload = async e => {
    const wb   = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

    console.log('Colonnes détectées:', data.length > 0 ? Object.keys(data[0]) : 'Aucune');
    console.log('Première ligne:', data[0]);

    let ok = 0;
    let errors = 0;

    for (const row of data) {
      // Normalize keys
      const r = {};
      Object.keys(row).forEach(k => {
        const normalized = k.trim().toLowerCase()
          .replace(/[éèêë]/g, 'e')
          .replace(/[àâ]/g, 'a')
          .replace(/[î]/g, 'i')
          .replace(/[ô]/g, 'o')
          .replace(/[û]/g, 'u')
          .replace(/[ç]/g, 'c');
        r[normalized] = row[k];
      });

      // Map to agent fields
      const agent = {
        nom:       (r['nom'] || r['name'] || '').toString().trim(),
        prenom:    (r['prenom'] || r['prenoms'] || r['first name'] || '').toString().trim(),
        matricule: r['matricule'] || r['mat'] || null,
        sexe:      r['sexe'] || r['genre'] || null,
        date_naissance:   excelDateToISO(r['date naissance'] || r['dob'] || r['naissance']),
        lieu_naissance:   r['lieu naissance'] || r['lieu'] || null,
        nationalite:      r['nationalite'] || 'Burkinabè',
        telephone:        r['telephone'] || r['tel'] || null,
        email:            r['email'] || r['mail'] || null,
        adresse:          r['adresse'] || r['address'] || null,
        nin:              r['nin'] || null,
        cnss:             r['cnss'] || null,
        poste:            (r['poste'] || r['fonction'] || r['job'] || '').toString().trim(),
        departement:      r['departement'] || r['service'] || null,
        categorie_socioprofessionnelle: r['categorie'] || r['cat'] || null,
        type_contrat:     r['type contrat'] || r['contrat'] || 'CDI',
        date_embauche:    excelDateToISO(r['date embauche'] || r['embauche']),
        date_fin_contrat: excelDateToISO(r['date fin contrat'] || r['fin contrat']),
        salaire_brut:     r['salaire brut'] || r['salaire'] ? parseFloat(r['salaire brut'] || r['salaire']) || null : null,
        statut:           r['statut'] || 'Actif',
      };

      // Clean empty strings to null
      Object.keys(agent).forEach(k => {
        if (agent[k] === '' || agent[k] === 'undefined') agent[k] = null;
      });

      if (agent.nom && agent.poste) {
        const { error } = await supabase.from('agents').insert(agent);
        if (!error) ok++;
        else {
          errors++;
          console.error('Erreur insertion:', error.message, agent);
        }
      } else {
        console.warn('Ligne ignorée (nom ou poste manquant):', row);
      }
    }

    if (ok > 0)    showToast(`${ok} agent(s) importé(s) avec succès`);
    if (errors > 0) showToast(`${errors} ligne(s) en erreur — vérifiez la console`, 'warning');
    if (ok === 0 && errors === 0) showToast('Aucun agent importé — vérifiez les colonnes', 'warning');

    onRefresh();
  };
  reader.readAsBinaryString(file);
}

  return (
    <div>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10, marginBottom: 20, flexWrap: 'wrap',
      }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: '#A3A3A3',
          }} />
          <input
            className="search-input"
            placeholder="Rechercher un agent..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>

        {/* Filter toggle */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowFilters(!showFilters)}
          style={{
            borderColor: showFilters ? '#E8920A' : undefined,
            color: showFilters ? '#E8920A' : undefined,
          }}
        >
          <SlidersHorizontal size={14} />
          Filtres
          {Object.values(filters).filter((v, i) => i > 0 && v).length > 0 && (
            <span style={{
              background: '#E8920A', color: '#fff',
              borderRadius: '50%', width: 16, height: 16,
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {Object.values(filters).filter((v, i) => i > 0 && v).length}
            </span>
          )}
        </button>

        {/* Export */}
        <button className="btn btn-secondary btn-sm" onClick={exportExcel}>
          <Download size={14} />
          Exporter
        </button>

        {/* Import */}
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
          <Upload size={14} />
          Importer
          <input
            type="file" accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => importExcel(e.target.files[0])}
          />
        </label>

        {/* Add agent */}
        {peutFaire(profil, 'modifierAgents') && (
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={14} />
            Nouvel agent
          </button>
        )}
      </div>

      {/* ── Filters panel ── */}
      {showFilters && (
        <div style={{
          background: '#FAFAFA', border: '1px solid #E5E5E5',
          borderRadius: 12, padding: '16px 20px',
          marginBottom: 20,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <select
            className="filter-select"
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          >
            <option value="">Tous les contrats</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
          </select>

          <select
            className="filter-select"
            value={filters.poste}
            onChange={e => setFilters(f => ({ ...f, poste: e.target.value }))}
          >
            <option value="">Tous les postes</option>
            {postes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            className="filter-select"
            value={filters.categorie}
            onChange={e => setFilters(f => ({ ...f, categorie: e.target.value }))}
          >
            <option value="">Toutes catégories</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            className="filter-select"
            value={filters.age}
            onChange={e => setFilters(f => ({ ...f, age: e.target.value }))}
          >
            <option value="">Tous les âges</option>
            <option value="<30">Moins de 30 ans</option>
            <option value="30-40">30 — 40 ans</option>
            <option value="40-50">40 — 50 ans</option>
            <option value=">50">Plus de 50 ans</option>
          </select>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setFilters({ search: '', type: '', poste: '', categorie: '', age: '' })}
          >
            <X size={13} />
            Réinitialiser
          </button>
        </div>
      )}

      {/* ── Agents table ── */}
      <div className="card">
        <div className="card-header">
          <h3>
            {filtered.length} agent(s)
            {filtered.length !== agents.length && (
              <span style={{ fontSize: 12, color: '#A3A3A3', fontWeight: 400, marginLeft: 6 }}>
                sur {agents.length} au total
              </span>
            )}
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Poste</th>
                <th>Département</th>
                <th>Catégorie</th>
                <th>Contrat</th>
                <th>Embauche</th>
                <th>Âge</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                    Aucun agent trouvé
                  </td>
                </tr>
              ) : filtered.map(a => {
                const c = avatarColor(a.nom);
                const jours = joursRestants(a.date_fin_contrat);
                const isExpiring = a.type_contrat === 'CDD' && jours !== null && jours <= 30 && jours >= 0;
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: c.bg, color: c.fg }}>
                          {getInitials(a.nom, a.prenom)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0F0F0F' }}>
                            {a.prenom} {a.nom}
                          </div>
                          <div style={{ fontSize: 11, color: '#A3A3A3' }}>
                            {a.matricule || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#404040' }}>{a.poste}</td>
                    <td style={{ color: '#737373' }}>{a.departement || '—'}</td>
                    <td style={{ color: '#737373' }}>{a.categorie_socioprofessionnelle || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className={`badge ${a.type_contrat === 'CDI' ? 'badge-blue' : 'badge-orange'}`}>
                          {a.type_contrat}
                        </span>
                        {isExpiring && (
                          <span className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <AlertTriangle size={10} /> Expire
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: '#737373' }}>{formatDate(a.date_embauche)}</td>
                    <td style={{ color: '#737373' }}>{age(a.date_naissance)}</td>
                    <td>
                      <span className={`badge ${a.statut === 'Actif' ? 'badge-green' : 'badge-gray'}`}>
                        {a.statut || 'Actif'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenFiche(a.id)}
                          title="Voir la fiche"
                        >
                          <Eye size={13} />
                        </button>
                        {peutFaire(profil, 'modifierAgents') && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEdit(a)}
                            title="Modifier"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setDocModal(a)}
                          title="Générer un document"
                        >
                          <FileText size={13} />
                        </button>
                        {peutFaire(profil, 'supprimerAgents') && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(a.id)}
                            title="Supprimer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
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
    MODAL: Add / Edit agent (multi-step)
════════════════════════════════ */}
{modal && (
  <div className="modal-overlay" onClick={e => {
    if (e.target === e.currentTarget) { setModal(false); setEditAgent(null); setStep(1); }
  }}>
    <div className="modal">
      <div className="modal-header">
        <div>
          <h3>{editAgent ? 'Modifier l\'agent' : 'Nouvel agent'}</h3>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[
              { n: 1, label: 'Identité' },
              { n: 2, label: 'Coordonnées' },
              { n: 3, label: 'Formation' },
              { n: 4, label: 'Poste & Contrat' },
            ].map(s => (
              <div
                key={s.n}
                onClick={() => setStep(s.n)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11, fontWeight: 600,
                  fontFamily: 'Poppins, sans-serif',
                  background: step === s.n ? '#E8920A' : step > s.n ? '#FEF3E2' : '#F5F5F5',
                  color: step === s.n ? '#fff' : step > s.n ? '#E8920A' : '#A3A3A3',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: step === s.n ? 'rgba(255,255,255,0.3)' : step > s.n ? '#E8920A' : '#E5E5E5',
                  color: step === s.n ? '#fff' : step > s.n ? '#fff' : '#A3A3A3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                {s.label}
              </div>
            ))}
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setModal(false); setEditAgent(null); setStep(1); }}
        >
          <X size={14} />
        </button>
      </div>

      <div className="modal-body">

        {/* ── Step 1: Personal info ── */}
        {step === 1 && (
          <div>
            <FormSection title="Informations personnelles" />
            <div className="form-grid">
              <div className="form-group"><label>Matricule</label><input value={form.matricule} onChange={e => setF('matricule', e.target.value)} placeholder="Ex: AG001" /></div>
              <div className="form-group"><label>Nom *</label><input value={form.nom} onChange={e => setF('nom', e.target.value)} placeholder="Ex: OUEDRAOGO" /></div>
              <div className="form-group"><label>Prénom(s) *</label><input value={form.prenom} onChange={e => setF('prenom', e.target.value)} placeholder="Ex: Jean" /></div>
              <div className="form-group">
                <label>Sexe</label>
                <select value={form.sexe} onChange={e => setF('sexe', e.target.value)}>
                  <option value="">—</option>
                  <option>Masculin</option>
                  <option>Féminin</option>
                </select>
              </div>
              <div className="form-group"><label>Date de naissance</label><input type="date" value={form.date_naissance} onChange={e => setF('date_naissance', e.target.value)} /></div>
              <div className="form-group"><label>Lieu de naissance</label><input value={form.lieu_naissance} onChange={e => setF('lieu_naissance', e.target.value)} placeholder="Ex: Ouagadougou" /></div>
              <div className="form-group"><label>Nationalité</label><input value={form.nationalite} onChange={e => setF('nationalite', e.target.value)} /></div>
              <div className="form-group">
                <label>Situation matrimoniale</label>
                <select value={form.situation_matrimoniale} onChange={e => setF('situation_matrimoniale', e.target.value)}>
                  <option value="">—</option>
                  {SITUATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Nombre d'enfants</label><input type="number" min="0" value={form.nombre_enfants} onChange={e => setF('nombre_enfants', e.target.value)} /></div>
              <div className="form-group"><label>NIN</label><input value={form.nin} onChange={e => setF('nin', e.target.value)} placeholder="Numéro d'identification" /></div>
              <div className="form-group"><label>N° CNSS</label><input value={form.cnss} onChange={e => setF('cnss', e.target.value)} placeholder="N° CNSS" /></div>
            </div>
          </div>
        )}

        {/* ── Step 2: Contact ── */}
        {step === 2 && (
          <div>
            <FormSection title="Coordonnées" />
            <div className="form-grid">
              <div className="form-group full">
                <label>Adresse complète</label>
                <input value={form.adresse} onChange={e => setF('adresse', e.target.value)} placeholder="Ex: Secteur 12, Ouagadougou" />
              </div>
              <div className="form-group"><label>Téléphone principal</label><input value={form.telephone} onChange={e => setF('telephone', e.target.value)} placeholder="Ex: +226 70 00 00 00" /></div>
              <div className="form-group"><label>Email professionnel</label><input type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="Ex: jean@entreprise.bf" /></div>
            </div>

            <FormSection title="Personne à contacter en cas d'urgence" />
            <div className="form-grid">
              <div className="form-group"><label>Nom complet</label><input value={form.urgence_nom} onChange={e => setF('urgence_nom', e.target.value)} placeholder="Nom et prénom" /></div>
              <div className="form-group"><label>Téléphone urgence</label><input value={form.urgence_telephone} onChange={e => setF('urgence_telephone', e.target.value)} placeholder="Ex: +226 70 00 00 00" /></div>
            </div>
          </div>
        )}

        {/* ── Step 3: Education ── */}
        {step === 3 && (
          <div>
            <FormSection title="Formation et qualifications" />
            <div className="form-grid">
              <div className="form-group">
                <label>Niveau d'études</label>
                <select value={form.niveau_etudes} onChange={e => setF('niveau_etudes', e.target.value)}>
                  <option value="">—</option>
                  {['Sans diplôme', 'CEPE', 'BEPC', 'CAP/BEP', 'Baccalauréat', 'BTS/DUT', 'Licence', 'Master', 'Doctorat'].map(n =>
                    <option key={n}>{n}</option>
                  )}
                </select>
              </div>
              <div className="form-group"><label>Diplôme obtenu</label><input value={form.diplome} onChange={e => setF('diplome', e.target.value)} placeholder="Ex: Licence en Droit" /></div>
              <div className="form-group full"><label>Spécialité / Filière</label><input value={form.specialite} onChange={e => setF('specialite', e.target.value)} placeholder="Ex: Droit du travail" /></div>
            </div>
          </div>
        )}

        {/* ── Step 4: Job & Contract ── */}
        {step === 4 && (
          <div>
            <FormSection title="Poste & Contrat" />
            <div className="form-grid">
              <div className="form-group"><label>Intitulé du poste *</label><input value={form.poste} onChange={e => setF('poste', e.target.value)} placeholder="Ex: Comptable" /></div>
              <div className="form-group"><label>Département / Service</label><input value={form.departement} onChange={e => setF('departement', e.target.value)} placeholder="Ex: Finance" /></div>
              <div className="form-group">
                <label>Catégorie socioprofessionnelle</label>
                <select value={form.categorie_socioprofessionnelle} onChange={e => setF('categorie_socioprofessionnelle', e.target.value)}>
                  <option value="">—</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Type de contrat *</label>
                <select value={form.type_contrat} onChange={e => setF('type_contrat', e.target.value)}>
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                </select>
              </div>
              <div className="form-group"><label>Date d'embauche</label><input type="date" value={form.date_embauche} onChange={e => setF('date_embauche', e.target.value)} /></div>
              <div className="form-group"><label>Date fin contrat (CDD)</label><input type="date" value={form.date_fin_contrat} onChange={e => setF('date_fin_contrat', e.target.value)} /></div>
              <div className="form-group"><label>Salaire brut mensuel (FCFA)</label><input type="number" value={form.salaire_brut} onChange={e => setF('salaire_brut', e.target.value)} placeholder="Ex: 150000" /></div>
              <div className="form-group">
                <label>Statut</label>
                <select value={form.statut} onChange={e => setF('statut', e.target.value)}>
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer navigation ── */}
      <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
        <button
          className="btn btn-secondary"
          onClick={() => step > 1 ? setStep(step - 1) : (setModal(false), setEditAgent(null), setStep(1))}
        >
          {step === 1 ? <><X size={14} /> Annuler</> : <>← Précédent</>}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Step dots */}
          {[1,2,3,4].map(n => (
            <div
              key={n}
              onClick={() => setStep(n)}
              style={{
                width: n === step ? 20 : 8,
                height: 8, borderRadius: 4,
                background: n === step ? '#E8920A' : n < step ? '#FDDBA0' : '#E5E5E5',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        {step < 4 ? (
          <button
            className="btn btn-primary"
            onClick={() => {
              if (step === 1 && (!form.nom || !form.prenom)) {
                showToast('Nom et prénom sont obligatoires', 'error');
                return;
              }
              setStep(step + 1);
            }}
          >
            Suivant →
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            <Save size={14} />
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        )}
      </div>
    </div>
  </div>
)}
      {/* ════════════════════════════════
          MODAL: Document generation
      ════════════════════════════════ */}
      {docModal && (
        <div className="modal-overlay" onClick={e => {
          if (e.target === e.currentTarget) setDocModal(null);
        }}>
          <div className="modal" style={{ width: 500 }}>
            <div className="modal-header">
              <div>
                <h3>Générer un document</h3>
                <p style={{ fontSize: 12, color: '#A3A3A3', marginTop: 2, fontFamily: 'Poppins, sans-serif' }}>
                  {docModal.prenom} {docModal.nom} — {docModal.poste}
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setDocModal(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {DOC_TYPES.map(d => {
                  const Icon = d.Icon;
                  return (
                    <div
                      key={d.type}
                      className="doc-card"
                      onClick={() => generateDoc(d.type, docModal)}
                    >
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: `${d.color}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 10px',
                      }}>
                        <Icon size={22} color={d.color} strokeWidth={1.8} />
                      </div>
                      <h4>{d.titre}</h4>
                      <p>{d.desc}</p>
                      <div style={{
                        marginTop: 10, fontSize: 11,
                        color: d.color, fontWeight: 600,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 4,
                      }}>
                        <Download size={11} /> PDF
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}