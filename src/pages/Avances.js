// Avances.js - Salary advance management page
// Features: advance requests, approval/rejection, total tracking

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, formatMontant, getInitials, avatarColor } from '../lib/helpers';
import { peutFaire } from '../lib/useProfil';
import {
  DollarSign, Plus, Check, X, Trash2,
  Clock, CheckCircle, XCircle, Search, TrendingUp,
} from 'lucide-react';

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

// ── Main Avances component ────────────────────────────────
export default function Avances({ avances, agents, onRefresh, profil }) {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [form, setForm] = useState({
    agent_id: '', montant: '',
    date_demande: new Date().toISOString().split('T')[0],
    motif: '',
  });
  const [loading, setLoading] = useState(false);

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

  // ── Filter advances ──
  const filtered = avances.filter(a => {
    const name = `${a.agents?.prenom || ''} ${a.agents?.nom || ''}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterStatut && a.statut !== filterStatut) return false;
    return true;
  });

  // ── Save advance request ──
  async function handleSubmit() {
    if (!form.agent_id || !form.montant) {
      showToast('Agent et montant sont obligatoires', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('avances').insert({
      agent_id:     form.agent_id,
      montant:      parseFloat(form.montant),
      date_demande: form.date_demande || null,
      motif:        form.motif || null,
    });
    if (error) showToast('Erreur lors de l\'enregistrement', 'error');
    else {
      showToast('Demande d\'avance enregistrée');
      setModal(false);
      setForm({
        agent_id: '', montant: '',
        date_demande: new Date().toISOString().split('T')[0],
        motif: '',
      });
      onRefresh();
    }
    setLoading(false);
  }

  // ── Update advance status ──
  async function updateStatut(id, statut) {
    await supabase.from('avances').update({ statut }).eq('id', id);
    showToast(`Demande ${statut.toLowerCase()}`);
    onRefresh();
  }

  // ── Delete advance request ──
  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette demande ?')) return;
    await supabase.from('avances').delete().eq('id', id);
    showToast('Demande supprimée');
    onRefresh();
  }

  // ── Compute stats ──
  const enAttente    = avances.filter(a => a.statut === 'En attente').length;
  const approuves    = avances.filter(a => a.statut === 'Approuvé').length;
  const refuses      = avances.filter(a => a.statut === 'Refusé').length;
  const totalMontant = avances
    .filter(a => a.statut === 'Approuvé')
    .reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);

  return (
    <div>

      {/* ── Stats ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16, marginBottom: 24,
      }}>
        {[
          { label: 'Total demandes',    value: avances.length,                 icon: DollarSign,  color: '#E8920A' },
          { label: 'En attente',        value: enAttente,                      icon: Clock,       color: '#D97706' },
          { label: 'Approuvées',        value: approuves,                      icon: CheckCircle, color: '#16A34A' },
          { label: 'Montant approuvé',  value: `${Math.round(totalMontant / 1000)}K FCFA`, icon: TrendingUp,  color: '#2563EB' },
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

      {/* ── Table card ── */}
      <div className="card">
        <div className="card-header">
          <h3>Avances sur salaire ({filtered.length})</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

            {/* Search */}
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
                style={{ paddingLeft: 32, width: 180, fontSize: 12 }}
              />
            </div>

            {/* Filter by status */}
            <select
              className="filter-select"
              value={filterStatut}
              onChange={e => setFilterStatut(e.target.value)}
              style={{ fontSize: 12 }}
            >
              <option value="">Tous les statuts</option>
              <option value="En attente">En attente</option>
              <option value="Approuvé">Approuvé</option>
              <option value="Refusé">Refusé</option>
            </select>

            {/* Add button */}
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                    Aucune demande d'avance
                  </td>
                </tr>
              ) : filtered.map(a => {
                const av = avatarColor(a.agents?.nom || '');
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: av.bg, color: av.fg }}>
                          {getInitials(a.agents?.nom, a.agents?.prenom)}
                        </div>
                        <span style={{ fontWeight: 600, color: '#0F0F0F' }}>
                          {a.agents?.prenom} {a.agents?.nom}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0F0F0F' }}>
                        {formatMontant(a.montant)}
                      </span>
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
                        <div style={{ display: 'flex', gap: 6 }}>
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════
          MODAL: New advance request
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
                <div className="form-group">
                  <label>Montant (FCFA) *</label>
                  <input
                    type="number" min="0"
                    value={form.montant}
                    onChange={e => setF('montant', e.target.value)}
                    placeholder="Ex: 50000"
                  />
                </div>
                <div className="form-group">
                  <label>Date de demande</label>
                  <input
                    type="date"
                    value={form.date_demande}
                    onChange={e => setF('date_demande', e.target.value)}
                  />
                </div>
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