import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { peutFaire } from '../lib/useProfil';
import { age, formatDate, getInitials, avatarColor, joursRestants } from '../lib/helpers';
import * as XLSX from 'xlsx';
import {
  generateAttestation,
  generateConge,
  generateAbsence,
  generateAvance,
  generateCDI,
  generateCDD,
} from '../lib/generatePDF';

const CATEGORIES = ['Cadre supérieur', 'Cadre', 'Agent de maîtrise', 'Employé qualifié', 'Employé non qualifié', 'Ouvrier qualifié', 'Ouvrier non qualifié'];
const SITUATIONS = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'];

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${type === 'error' ? '#DC3545' : type === 'warning' ? '#F59E0B' : '#1C2B3A'};color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;font-family:inherit`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

const emptyForm = {
  matricule: '', nom: '', prenom: '', sexe: '', date_naissance: '', lieu_naissance: '',
  nationalite: 'Burkinabè', situation_matrimoniale: '', nombre_enfants: 0,
  nin: '', cnss: '', adresse: '', telephone: '', email: '',
  urgence_nom: '', urgence_telephone: '', niveau_etudes: '', diplome: '', specialite: '',
  poste: '', departement: '', categorie_socioprofessionnelle: '', type_contrat: 'CDI',
  date_embauche: '', date_fin_contrat: '', salaire_brut: '', statut: 'Actif',
};

export default function Agents({ agents, onRefresh, entreprise, onOpenFiche, profil }) {
  const [filters, setFilters] = useState({ search: '', type: '', poste: '', categorie: '', age: '' });
  const [modal, setModal] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [docModal, setDocModal] = useState(null);

  const postes = [...new Set(agents.map(a => a.poste))].sort();
  const cats = [...new Set(agents.map(a => a.categorie_socioprofessionnelle).filter(Boolean))].sort();

  const filtered = agents.filter(a => {
    const name = `${a.prenom} ${a.nom} ${a.matricule || ''}`.toLowerCase();
    if (filters.search && !name.includes(filters.search.toLowerCase())) return false;
    if (filters.type && a.type_contrat !== filters.type) return false;
    if (filters.poste && a.poste !== filters.poste) return false;
    if (filters.categorie && a.categorie_socioprofessionnelle !== filters.categorie) return false;
    if (filters.age) {
      const a_ = age(a.date_naissance);
      if (filters.age === '<30' && a_ >= 30) return false;
      if (filters.age === '30-40' && (a_ < 30 || a_ > 40)) return false;
      if (filters.age === '40-50' && (a_ < 40 || a_ > 50)) return false;
      if (filters.age === '>50' && a_ <= 50) return false;
    }
    return true;
  });

  async function openAdd() {
    setForm(emptyForm);
    setEditAgent(null);
    setModal(true);
  }

  async function openEdit(a) {
    setForm({ ...emptyForm, ...a, salaire_brut: a.salaire_brut || '', nombre_enfants: a.nombre_enfants || 0 });
    setEditAgent(a);
    setModal(true);
  }

  function setF(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    if (!form.nom || !form.prenom || !form.poste) {
      showToast('Nom, prénom et poste sont obligatoires', 'error');
      return;
    }
    setLoading(true);
    const data = {
      ...form,
      matricule: form.matricule || null,
      salaire_brut: form.salaire_brut ? parseFloat(form.salaire_brut) : null,
      nombre_enfants: parseInt(form.nombre_enfants) || 0,
      date_naissance: form.date_naissance || null,
      date_embauche: form.date_embauche || null,
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

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cet agent ?')) return;
    await supabase.from('agents').delete().eq('id', id);
    showToast('Agent supprimé');
    onRefresh();
  }

  async function generateDoc(type, a) {
    if (!entreprise || !entreprise.nom) {
      showToast('Veuillez d\'abord configurer les informations de l\'entreprise', 'error');
      return;
    }
    try {
      if (type === 'cdi') await generateCDI(a, entreprise);
      else if (type === 'cdd') await generateCDD(a, entreprise);
      else if (type === 'attestation') await generateAttestation(a, entreprise);
      else if (type === 'conge') await generateConge(a, entreprise);
      else if (type === 'absence') await generateAbsence(a, entreprise);
      else if (type === 'avance') await generateAvance(a, entreprise);
      showToast('PDF généré et téléchargé');
      setDocModal(null);
    } catch (e) {
      showToast('Erreur lors de la génération du PDF', 'error');
    }
  }

  async function exportExcel() {
    const data = agents.map(a => ({
      'Matricule': a.matricule || '', 'Nom': a.nom, 'Prénom': a.prenom,
      'Sexe': a.sexe || '', 'Date naissance': a.date_naissance || '', 'Âge': age(a.date_naissance),
      'Téléphone': a.telephone || '', 'Email': a.email || '', 'Poste': a.poste,
      'Département': a.departement || '', 'Catégorie': a.categorie_socioprofessionnelle || '',
      'Type contrat': a.type_contrat, 'Date embauche': a.date_embauche || '',
      'Date fin contrat': a.date_fin_contrat || '', 'Salaire brut': a.salaire_brut || '',
      'Statut': a.statut || 'Actif',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, 'Agents', ws);
    XLSX.writeFile(wb, 'agents_export.xlsx');
    showToast('Export Excel téléchargé');
  }

  function importExcel(file) {
    const reader = new FileReader();
    reader.onload = async e => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      let ok = 0;
      for (const row of data) {
        const agent = {
          nom: row['Nom'] || '', prenom: row['Prénom'] || '',
          matricule: row['Matricule'] || null, sexe: row['Sexe'] || null,
          date_naissance: row['Date naissance'] || null, telephone: row['Téléphone'] || null,
          email: row['Email'] || null, poste: row['Poste'] || '',
          departement: row['Département'] || null,
          categorie_socioprofessionnelle: row['Catégorie'] || null,
          type_contrat: row['Type contrat'] || 'CDI',
          date_embauche: row['Date embauche'] || null,
          salaire_brut: row['Salaire brut'] || null,
        };
        if (agent.nom && agent.poste) {
          const r = await supabase.from('agents').insert(agent);
          if (!r.error) ok++;
        }
      }
      showToast(`${ok} agent(s) importé(s) avec succès`);
      onRefresh();
    };
    reader.readAsBinaryString(file);
  }

  return (
    <div>
      <div className="filters">
        <input className="search-input" placeholder="🔍 Rechercher..." value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        <select className="filter-select" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
          <option value="">Tous les contrats</option>
          <option value="CDI">CDI</option>
          <option value="CDD">CDD</option>
        </select>
        <select className="filter-select" value={filters.poste} onChange={e => setFilters(f => ({ ...f, poste: e.target.value }))}>
          <option value="">Tous les postes</option>
          {postes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="filter-select" value={filters.categorie} onChange={e => setFilters(f => ({ ...f, categorie: e.target.value }))}>
          <option value="">Toutes catégories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filters.age} onChange={e => setFilters(f => ({ ...f, age: e.target.value }))}>
          <option value="">Tous les âges</option>
          <option value="<30">Moins de 30 ans</option>
          <option value="30-40">30 - 40 ans</option>
          <option value="40-50">40 - 50 ans</option>
          <option value=">50">Plus de 50 ans</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={exportExcel}>⬇ Excel</button>
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
          ⬆ Importer
          <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => importExcel(e.target.files[0])} />
        </label>
      </div>

      <div className="card">
        <div className="card-header">
        <h3>{filtered.length} agent(s)</h3>
        {peutFaire(profil, 'modifierAgents') && (
            <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Ajouter un agent</button>
        )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Agent</th><th>Poste</th><th>Département</th><th>Catégorie</th>
                <th>Contrat</th><th>Embauche</th><th>Âge</th><th>Statut</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Aucun agent trouvé</td></tr>
              ) : filtered.map(a => {
                const c = avatarColor(a.nom);
                const jours = joursRestants(a.date_fin_contrat);
                const isExpiring = a.type_contrat === 'CDD' && jours !== null && jours <= 30 && jours >= 0;
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: c.bg, color: c.fg }}>{getInitials(a.nom, a.prenom)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{a.prenom} {a.nom}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.matricule || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>{a.poste}</td>
                    <td>{a.departement || '-'}</td>
                    <td>{a.categorie_socioprofessionnelle || '-'}</td>
                    <td>
                      <span className={`badge ${a.type_contrat === 'CDI' ? 'badge-blue' : 'badge-orange'}`}>{a.type_contrat}</span>
                      {isExpiring && <span className="badge badge-red" style={{ marginLeft: 4 }}>⚠ Expire</span>}
                    </td>
                    <td>{formatDate(a.date_embauche)}</td>
                    <td>{age(a.date_naissance)}</td>
                    <td><span className={`badge ${a.statut === 'Actif' ? 'badge-green' : 'badge-gray'}`}>{a.statut || 'Actif'}</span></td>
                    <td>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => onOpenFiche(a.id)}>👁</button>
                    {peutFaire(profil, 'modifierAgents') && (
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>✏</button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => setDocModal(a)}>📄</button>
                    {peutFaire(profil, 'supprimerAgents') && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>🗑</button>
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

      {/* Modal Ajout/Modification */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editAgent ? 'Modifier l\'agent' : 'Nouvel agent'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="section-title">👤 Informations personnelles</div>
              <div className="form-grid">
                <div className="form-group"><label>Matricule</label><input value={form.matricule} onChange={e => setF('matricule', e.target.value)} /></div>
                <div className="form-group"><label>Nom *</label><input value={form.nom} onChange={e => setF('nom', e.target.value)} /></div>
                <div className="form-group"><label>Prénom(s) *</label><input value={form.prenom} onChange={e => setF('prenom', e.target.value)} /></div>
                <div className="form-group"><label>Sexe</label>
                  <select value={form.sexe} onChange={e => setF('sexe', e.target.value)}>
                    <option value="">-</option>
                    <option>Masculin</option><option>Féminin</option>
                  </select>
                </div>
                <div className="form-group"><label>Date de naissance</label><input type="date" value={form.date_naissance} onChange={e => setF('date_naissance', e.target.value)} /></div>
                <div className="form-group"><label>Lieu de naissance</label><input value={form.lieu_naissance} onChange={e => setF('lieu_naissance', e.target.value)} /></div>
                <div className="form-group"><label>Nationalité</label><input value={form.nationalite} onChange={e => setF('nationalite', e.target.value)} /></div>
                <div className="form-group"><label>Situation matrimoniale</label>
                  <select value={form.situation_matrimoniale} onChange={e => setF('situation_matrimoniale', e.target.value)}>
                    <option value="">-</option>
                    {SITUATIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Nombre d'enfants</label><input type="number" min="0" value={form.nombre_enfants} onChange={e => setF('nombre_enfants', e.target.value)} /></div>
                <div className="form-group"><label>NIN</label><input value={form.nin} onChange={e => setF('nin', e.target.value)} /></div>
                <div className="form-group"><label>N° CNSS</label><input value={form.cnss} onChange={e => setF('cnss', e.target.value)} /></div>
              </div>

              <div className="section-title">📞 Coordonnées</div>
              <div className="form-grid">
                <div className="form-group full"><label>Adresse</label><input value={form.adresse} onChange={e => setF('adresse', e.target.value)} /></div>
                <div className="form-group"><label>Téléphone</label><input value={form.telephone} onChange={e => setF('telephone', e.target.value)} /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setF('email', e.target.value)} /></div>
                <div className="form-group"><label>Personne urgence</label><input value={form.urgence_nom} onChange={e => setF('urgence_nom', e.target.value)} /></div>
                <div className="form-group"><label>Tél. urgence</label><input value={form.urgence_telephone} onChange={e => setF('urgence_telephone', e.target.value)} /></div>
              </div>

              <div className="section-title">🎓 Formation</div>
              <div className="form-grid">
                <div className="form-group"><label>Niveau d'études</label><input value={form.niveau_etudes} onChange={e => setF('niveau_etudes', e.target.value)} /></div>
                <div className="form-group"><label>Diplôme</label><input value={form.diplome} onChange={e => setF('diplome', e.target.value)} /></div>
                <div className="form-group full"><label>Spécialité</label><input value={form.specialite} onChange={e => setF('specialite', e.target.value)} /></div>
              </div>

              <div className="section-title">💼 Poste & Contrat</div>
              <div className="form-grid">
                <div className="form-group"><label>Poste *</label><input value={form.poste} onChange={e => setF('poste', e.target.value)} /></div>
                <div className="form-group"><label>Département</label><input value={form.departement} onChange={e => setF('departement', e.target.value)} /></div>
                <div className="form-group"><label>Catégorie socioprofessionnelle</label>
                  <select value={form.categorie_socioprofessionnelle} onChange={e => setF('categorie_socioprofessionnelle', e.target.value)}>
                    <option value="">-</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Type de contrat *</label>
                  <select value={form.type_contrat} onChange={e => setF('type_contrat', e.target.value)}>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                  </select>
                </div>
                <div className="form-group"><label>Date d'embauche</label><input type="date" value={form.date_embauche} onChange={e => setF('date_embauche', e.target.value)} /></div>
                <div className="form-group"><label>Date fin contrat (CDD)</label><input type="date" value={form.date_fin_contrat} onChange={e => setF('date_fin_contrat', e.target.value)} /></div>
                <div className="form-group"><label>Salaire brut mensuel (FCFA)</label><input type="number" value={form.salaire_brut} onChange={e => setF('salaire_brut', e.target.value)} /></div>
                <div className="form-group"><label>Statut</label>
                  <select value={form.statut} onChange={e => setF('statut', e.target.value)}>
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Documents */}
      {docModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDocModal(null); }}>
          <div className="modal" style={{ width: 480 }}>
            <div className="modal-header">
              <h3>Documents — {docModal.prenom} {docModal.nom}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setDocModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { type: 'cdi', icon: '📋', titre: 'Contrat CDI' },
                  { type: 'cdd', icon: '📋', titre: 'Contrat CDD' },
                  { type: 'attestation', icon: '🏆', titre: 'Attestation de travail' },
                  { type: 'conge', icon: '🌴', titre: 'Autorisation de congé' },
                  { type: 'absence', icon: '📅', titre: 'Autorisation d\'absence' },
                  { type: 'avance', icon: '💰', titre: 'Avance sur salaire' },
                ].map(d => (
                  <div key={d.type} className="doc-card" onClick={() => generateDoc(d.type, docModal)}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{d.icon}</div>
                    <h4 style={{ fontSize: 12 }}>{d.titre}</h4>
                    <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>⬇ PDF</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}