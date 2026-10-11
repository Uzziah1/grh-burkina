// Conges.js — Gestion des demandes de congés
// Fonctionnalités : dépôt, approbation/refus, calcul auto des jours ouvrables,
//                  génération PDF de l'autorisation de congé

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, getInitials, avatarColor } from '../lib/helpers';
import { peutFaire } from '../lib/useProfil';
import { generateConge } from '../lib/generatePDF';
import {
  Calendar, Plus, Check, X, Trash2,
  Clock, CheckCircle, XCircle, Search, FileText,
} from 'lucide-react';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 20;

// ── Notification toast ────────────────────────────────────
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

// ── Calcul des jours ouvrables entre deux dates ───────────
// Exclut les samedis (6) et dimanches (0). Inclut les bornes.
function calculerJoursOuvrables(dateDebut, dateFin) {
  if (!dateDebut || !dateFin) return '';
  const debut = new Date(dateDebut);
  const fin   = new Date(dateFin);
  if (isNaN(debut) || isNaN(fin) || fin < debut) return '';

  let jours = 0;
  const courant = new Date(debut);
  while (courant <= fin) {
    const jour = courant.getDay();
    if (jour !== 0 && jour !== 6) jours++;          // exclure dimanche (0) et samedi (6)
    courant.setDate(courant.getDate() + 1);
  }
  return jours;
}

// ── Composant principal Conges ────────────────────────────
export default function Conges({ agents, profil, entreprise }) {
  const [conges, setConges] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, enAttente: 0, approuves: 0, refuses: 0 });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [form, setForm] = useState({
    agent_id: '', date_debut: '', date_fin: '',
    nombre_jours: '', motif: 'Congé annuel payé',
  });
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadConges = useCallback(async () => {
    setDataLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;
    let q = supabase
      .from('conges')
      .select('*,agents(nom,prenom)', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (filterStatut) q = q.eq('statut', filterStatut);
    if (search) {
      // Filter by agent name via agents relation
      const matched = agents.filter(a =>
        `${a.prenom} ${a.nom}`.toLowerCase().includes(search.toLowerCase())
      ).map(a => a.id);
      if (matched.length === 0) { setConges([]); setTotal(0); setDataLoading(false); return; }
      q = q.in('agent_id', matched);
    }
    q = q.range(from, to);
    const { data, count } = await q;
    setConges(data || []);
    setTotal(count || 0);
    setDataLoading(false);
  }, [page, search, filterStatut, agents]);

  const loadStats = useCallback(async () => {
    const { data } = await supabase.from('conges').select('statut');
    const all = data || [];
    setStats({
      total:     all.length,
      enAttente: all.filter(c => c.statut === 'En attente').length,
      approuves: all.filter(c => c.statut === 'Approuvé').length,
      refuses:   all.filter(c => c.statut === 'Refusé').length,
    });
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadConges(); }, [loadConges]);

  // Mise à jour d'un champ du formulaire
  function setF(key, val) {
    setForm(f => {
      const updated = { ...f, [key]: val };
      // Recalcul automatique des jours ouvrables dès que les deux dates sont renseignées
      if (key === 'date_debut' || key === 'date_fin') {
        const debut = key === 'date_debut' ? val : f.date_debut;
        const fin   = key === 'date_fin'   ? val : f.date_fin;
        const jours = calculerJoursOuvrables(debut, fin);
        updated.nombre_jours = jours !== '' ? String(jours) : f.nombre_jours;
      }
      return updated;
    });
  }

  // ── Génération du PDF d'autorisation de congé ──────────
  async function handleGenerateDoc(conge) {
    const agent = agents.find(a => a.id === conge.agent_id);
    if (!agent) { showToast('Agent introuvable. Actualisez la page.', 'error'); return; }
    if (!entreprise || !entreprise.nom) {
      showToast('Configurez d\'abord les informations de l\'entreprise', 'error');
      return;
    }
    try {
      await generateConge(agent, entreprise, conge);
      showToast('Document PDF téléchargé avec succès');
    } catch (e) {
      showToast('Impossible de générer le document. Réessayez.', 'error');
    }
  }

  // ── Enregistrement d'une nouvelle demande ─────────────
  async function handleSubmit() {
    if (!form.agent_id || !form.date_debut || !form.date_fin) {
      showToast('Veuillez sélectionner un agent et les dates de congé', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('conges').insert({
      agent_id:     form.agent_id,
      date_debut:   form.date_debut,
      date_fin:     form.date_fin,
      nombre_jours: form.nombre_jours ? parseInt(form.nombre_jours) : null,
      motif:        form.motif || null,
    });
    if (error) {
      showToast('L\'enregistrement a échoué. Réessayez.', 'error');
    } else {
      showToast('Demande de congé enregistrée avec succès');
      setModal(false);
      setForm({ agent_id: '', date_debut: '', date_fin: '', nombre_jours: '', motif: 'Congé annuel payé' });
      loadConges(); loadStats();
    }
    setLoading(false);
  }

  // ── Mise à jour du statut (approbation / refus) ───────
  async function updateStatut(id, statut) {
    const { error } = await supabase.from('conges').update({ statut }).eq('id', id);
    if (error) { showToast('Impossible de mettre à jour la demande. Réessayez.', 'error'); return; }
    showToast(statut === 'Approuvé' ? 'Congé approuvé' : statut === 'Rejeté' ? 'Congé rejeté' : 'Statut mis à jour');
    loadConges(); loadStats();
  }

  // ── Suppression d'une demande ─────────────────────────
  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette demande ?')) return;
    await supabase.from('conges').delete().eq('id', id);
    showToast('Demande de congé supprimée');
    loadConges(); loadStats();
  }

  return (
    <div>

      {/* ── Cartes statistiques ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16, marginBottom: 24,
      }}>
        {[
          { label: 'Total demandes', value: stats.total,     icon: Calendar,    color: '#E8920A' },
          { label: 'En attente',     value: stats.enAttente, icon: Clock,       color: '#D97706' },
          { label: 'Approuvés',      value: stats.approuves, icon: CheckCircle, color: '#16A34A' },
          { label: 'Refusés',        value: stats.refuses,   icon: XCircle,     color: '#DC2626' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${s.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={20} color={s.color} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tableau des demandes ── */}
      <div className="card">
        <div className="card-header">
          <h3>Demandes de congés ({total})</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

            {/* Recherche par nom */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{
                position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)', color: '#A3A3A3',
              }} />
              <input
                className="search-input"
                placeholder="Rechercher..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: 32, width: 180, fontSize: 12 }}
              />
            </div>

            {/* Filtre par statut */}
            <select
              className="filter-select"
              value={filterStatut}
              onChange={e => { setFilterStatut(e.target.value); setPage(1); }}
              style={{ fontSize: 12 }}
            >
              <option value="">Tous les statuts</option>
              <option value="En attente">En attente</option>
              <option value="Approuvé">Approuvé</option>
              <option value="Refusé">Refusé</option>
            </select>

            {/* Bouton nouvelle demande (selon permission) */}
            {peutFaire(profil, 'modifierConges') && (
              <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
                <Plus size={14} />
                Nouvelle demande
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Du</th>
                <th>Au</th>
                <th>Jours</th>
                <th>Motif</th>
                <th>Statut</th>
                {peutFaire(profil, 'modifierConges') && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {dataLoading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                    Chargement...
                  </td>
                </tr>
              ) : conges.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                    Aucune demande de congé
                  </td>
                </tr>
              ) : conges.map(c => {
                const av = avatarColor(c.agents?.nom || '');
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: av.bg, color: av.fg }}>
                          {getInitials(c.agents?.nom, c.agents?.prenom)}
                        </div>
                        <span style={{ fontWeight: 600, color: '#0F0F0F' }}>
                          {c.agents?.prenom} {c.agents?.nom}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: '#737373' }}>{formatDate(c.date_debut)}</td>
                    <td style={{ color: '#737373' }}>{formatDate(c.date_fin)}</td>
                    <td style={{ fontWeight: 600 }}>{c.nombre_jours || '—'}</td>
                    <td style={{ color: '#404040' }}>{c.motif || '—'}</td>
                    <td>
                      <span className={`badge ${
                        c.statut === 'Approuvé' ? 'badge-green' :
                        c.statut === 'Refusé'   ? 'badge-red'   : 'badge-orange'
                      }`}>
                        {c.statut}
                      </span>
                    </td>
                    {peutFaire(profil, 'modifierConges') && (
                      <td>
                        <div className="row-actions">
                          {c.statut === 'En attente' && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#16A34A', borderColor: '#16A34A' }}
                                onClick={() => updateStatut(c.id, 'Approuvé')}
                                title="Approuver"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#DC2626', borderColor: '#DC2626' }}
                                onClick={() => updateStatut(c.id, 'Refusé')}
                                title="Refuser"
                              >
                                <X size={13} />
                              </button>
                            </>
                          )}
                          {c.statut === 'Approuvé' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#2563EB', borderColor: '#2563EB' }}
                              onClick={() => handleGenerateDoc(c)}
                              title="Générer l'autorisation de congé"
                            >
                              <FileText size={13} />
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(c.id)}
                            title="Supprimer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '0 20px' }}>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>

      {/* ════════════════════════════════
          MODAL : Nouvelle demande de congé
      ════════════════════════════════ */}
      {modal && (
        <div className="modal-overlay" onClick={e => {
          if (e.target === e.currentTarget) setModal(false);
        }}>
          <div className="modal" style={{ width: 500 }}>
            <div className="modal-header">
              <h3>Nouvelle demande de congé</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">

                {/* Sélection de l'agent */}
                <div className="form-group full">
                  <label>Agent *</label>
                  <select value={form.agent_id} onChange={e => setF('agent_id', e.target.value)}>
                    <option value="">Sélectionner un agent...</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.prenom} {a.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates de début et de fin */}
                <div className="form-group">
                  <label>Date début *</label>
                  <input
                    type="date"
                    value={form.date_debut}
                    onChange={e => setF('date_debut', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Date fin *</label>
                  <input
                    type="date"
                    value={form.date_fin}
                    onChange={e => setF('date_fin', e.target.value)}
                  />
                </div>

                {/* Nombre de jours (calculé automatiquement, modifiable manuellement) */}
                <div className="form-group">
                  <label>
                    Nombre de jours ouvrables
                    {form.date_debut && form.date_fin && (
                      <span style={{ fontWeight: 400, color: '#A3A3A3', marginLeft: 6, fontSize: 11 }}>
                        (calculé automatiquement)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.nombre_jours}
                    onChange={e => setF('nombre_jours', e.target.value)}
                    placeholder="Ex : 10"
                  />
                </div>

                {/* Motif */}
                <div className="form-group">
                  <label>Motif</label>
                  <input
                    value={form.motif}
                    onChange={e => setF('motif', e.target.value)}
                  />
                </div>

              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                <Plus size={14} />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
