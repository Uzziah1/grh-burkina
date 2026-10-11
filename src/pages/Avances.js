// Avances.js — Gestion des avances sur salaire
// Fonctionnalités : dépôt de demande, approbation/refus, suivi des montants,
//                  génération du document de demande d'avance en PDF

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, formatMontant, getInitials, avatarColor } from '../lib/helpers';
import { peutFaire } from '../lib/useProfil';
import {
  DollarSign, Plus, Check, X, Trash2,
  Clock, CheckCircle, Search, TrendingUp, FileText,
} from 'lucide-react';
import { generateAvance } from '../lib/generatePDF';
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

// ── Composant principal Avances ───────────────────────────
export default function Avances({ agents, profil, entreprise }) {
  const [avances, setAvances] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, enAttente: 0, approuves: 0, totalMontant: 0 });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [form, setForm] = useState({
    agent_id: '', montant: '',
    date_demande: new Date().toISOString().split('T')[0],
    motif: '',
  });
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadAvances = useCallback(async () => {
    setDataLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;
    let q = supabase
      .from('avances')
      .select('*,agents(nom,prenom)', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (filterStatut) q = q.eq('statut', filterStatut);
    if (search) {
      const matched = agents.filter(a =>
        `${a.prenom} ${a.nom}`.toLowerCase().includes(search.toLowerCase())
      ).map(a => a.id);
      if (matched.length === 0) { setAvances([]); setTotal(0); setDataLoading(false); return; }
      q = q.in('agent_id', matched);
    }
    q = q.range(from, to);
    const { data, count } = await q;
    setAvances(data || []);
    setTotal(count || 0);
    setDataLoading(false);
  }, [page, search, filterStatut, agents]);

  const loadStats = useCallback(async () => {
    const { data } = await supabase.from('avances').select('statut,montant');
    const all = data || [];
    setStats({
      total:        all.length,
      enAttente:    all.filter(a => a.statut === 'En attente').length,
      approuves:    all.filter(a => a.statut === 'Approuvé').length,
      totalMontant: all.filter(a => a.statut === 'Approuvé').reduce((s, a) => s + (parseFloat(a.montant) || 0), 0),
    });
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadAvances(); }, [loadAvances]);

  // Mise à jour d'un champ du formulaire
  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

  // ── Génération du document de demande d'avance ─────────
  async function handleGenerateDoc(avance) {
    const agent = agents.find(a => a.id === avance.agent_id);
    if (!agent) { showToast('Agent introuvable. Actualisez la page.', 'error'); return; }
    if (!entreprise || !entreprise.nom) {
      showToast('Configurez d\'abord les informations de l\'entreprise', 'error');
      return;
    }
    try {
      await generateAvance(agent, entreprise, avance);
      showToast('Document PDF téléchargé avec succès');
    } catch (e) {
      showToast('Impossible de générer le document. Réessayez.', 'error');
    }
  }

  // ── Enregistrement d'une nouvelle demande ─────────────
  async function handleSubmit() {
    if (!form.agent_id || !form.montant) {
      showToast('Veuillez sélectionner un agent et saisir le montant', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('avances').insert({
      agent_id:     form.agent_id,
      montant:      parseFloat(form.montant),
      date_demande: form.date_demande || null,
      motif:        form.motif || null,
    });
    if (error) {
      showToast('L\'enregistrement a échoué. Réessayez.', 'error');
    } else {
      showToast('Demande d\'avance enregistrée avec succès');
      setModal(false);
      setForm({
        agent_id: '', montant: '',
        date_demande: new Date().toISOString().split('T')[0],
        motif: '',
      });
      loadAvances(); loadStats();
    }
    setLoading(false);
  }

  // ── Mise à jour du statut (approbation / refus) ───────
  async function updateStatut(id, statut) {
    const { error } = await supabase.from('avances').update({ statut }).eq('id', id);
    if (error) { showToast('Impossible de mettre à jour la demande. Réessayez.', 'error'); return; }
    showToast(statut === 'Approuvé' ? 'Demande approuvée' : statut === 'Rejeté' ? 'Demande rejetée' : 'Statut mis à jour');
    loadAvances(); loadStats();
  }

  // ── Suppression d'une demande ─────────────────────────
  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette demande ?')) return;
    await supabase.from('avances').delete().eq('id', id);
    showToast('Demande d\'avance supprimée');
    loadAvances(); loadStats();
  }

  return (
    <div>

      {/* ── Cartes statistiques ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16, marginBottom: 24,
      }}>
        {[
          { label: 'Total demandes',   value: stats.total,                                        icon: DollarSign,  color: '#E8920A' },
          { label: 'En attente',       value: stats.enAttente,                                    icon: Clock,       color: '#D97706' },
          { label: 'Approuvées',       value: stats.approuves,                                    icon: CheckCircle, color: '#16A34A' },
          { label: 'Montant approuvé', value: `${Math.round(stats.totalMontant / 1000)}K FCFA`,   icon: TrendingUp,  color: '#2563EB' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: s.label === 'Montant approuvé' ? 18 : 28 }}>
                  {s.value}
                </div>
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
          <h3>Avances sur salaire ({total})</h3>
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
            {peutFaire(profil, 'modifierAvances') && (
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
                <th>Montant</th>
                <th>Date demande</th>
                <th>Motif</th>
                <th>Statut</th>
                {peutFaire(profil, 'modifierAvances') && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {dataLoading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                    Chargement...
                  </td>
                </tr>
              ) : avances.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                    Aucune demande d'avance
                  </td>
                </tr>
              ) : avances.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{
                        background: avatarColor(a.agents?.nom || '').bg,
                        color:      avatarColor(a.agents?.nom || '').fg,
                      }}>
                        {getInitials(a.agents?.nom, a.agents?.prenom)}
                      </div>
                      <span style={{ fontWeight: 600, color: '#0F0F0F' }}>
                        {a.agents ? `${a.agents.prenom} ${a.agents.nom}` : 'Agent inconnu'}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: 14, color: '#0F0F0F' }}>
                    {formatMontant(a.montant)}
                  </td>
                  <td style={{ color: '#737373' }}>{formatDate(a.date_demande)}</td>
                  <td style={{ color: '#404040' }}>{a.motif || '—'}</td>
                  <td>
                    <span className={`badge ${
                      a.statut === 'Approuvé' ? 'badge-green' :
                      a.statut === 'Refusé'   ? 'badge-red'   : 'badge-orange'
                    }`}>
                      {a.statut}
                    </span>
                  </td>
                  {peutFaire(profil, 'modifierAvances') && (
                    <td>
                      <div className="row-actions">
                        {/* Boutons d'approbation / refus pour les demandes en attente */}
                        {a.statut === 'En attente' && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#16A34A', borderColor: '#16A34A' }}
                              onClick={() => updateStatut(a.id, 'Approuvé')}
                              title="Approuver"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#DC2626', borderColor: '#DC2626' }}
                              onClick={() => updateStatut(a.id, 'Refusé')}
                              title="Refuser"
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}
                        {/* Génération du document pour les avances approuvées */}
                        {a.statut === 'Approuvé' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#2563EB', borderColor: '#2563EB' }}
                            onClick={() => handleGenerateDoc(a)}
                            title="Générer le document de demande d'avance"
                          >
                            <FileText size={13} />
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(a.id)}
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div style={{ padding: '0 20px' }}>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* ════════════════════════════════
          MODAL : Nouvelle demande d'avance
      ════════════════════════════════ */}
      {modal && (
        <div className="modal-overlay" onClick={e => {
          if (e.target === e.currentTarget) setModal(false);
        }}>
          <div className="modal" style={{ width: 500 }}>
            <div className="modal-header">
              <h3>Nouvelle demande d'avance</h3>
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
                        {a.prenom} {a.nom} — {a.poste}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Montant */}
                <div className="form-group">
                  <label>Montant (FCFA) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.montant}
                    onChange={e => setF('montant', e.target.value)}
                    placeholder="Ex : 50000"
                  />
                </div>

                {/* Date de demande */}
                <div className="form-group">
                  <label>Date de demande</label>
                  <input
                    type="date"
                    value={form.date_demande}
                    onChange={e => setF('date_demande', e.target.value)}
                  />
                </div>

                {/* Motif */}
                <div className="form-group full">
                  <label>Motif</label>
                  <input
                    value={form.motif}
                    onChange={e => setF('motif', e.target.value)}
                    placeholder="Raison de la demande..."
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
