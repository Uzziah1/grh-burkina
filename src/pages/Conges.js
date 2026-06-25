// Conges.js - Leave management page
// Features: leave requests, approval/rejection, PDF authorization generation

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, getInitials, avatarColor } from '../lib/helpers';
import { peutFaire } from '../lib/useProfil';
import { generateConge } from '../lib/generatePDF';
import {
  Calendar, Plus, Check, X, Trash2,
  Clock, CheckCircle, XCircle, Search, FileText,
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

// ── Main Conges component ─────────────────────────────────
export default function Conges({ conges, agents, onRefresh, profil, entreprise }) {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [form, setForm] = useState({
    agent_id: '', date_debut: '', date_fin: '',
    nombre_jours: '', motif: 'Congé annuel payé',
  });
  const [loading, setLoading] = useState(false);

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

  // ── Generate leave authorization PDF ──
  async function handleGenerateDoc(conge) {
    const agent = agents.find(a => a.id === conge.agent_id);
    if (!agent) { showToast('Agent introuvable', 'error'); return; }
    if (!entreprise || !entreprise.nom) {
      showToast('Veuillez configurer les informations de l\'entreprise', 'error');
      return;
    }
    try {
      await generateConge(agent, entreprise, conge);
      showToast('Document généré et téléchargé');
    } catch (e) {
      showToast('Erreur lors de la génération', 'error');
    }
  }

  // ── Filter leave requests ──
  const filtered = conges.filter(c => {
    const name = `${c.agents?.prenom || ''} ${c.agents?.nom || ''}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterStatut && c.statut !== filterStatut) return false;
    return true;
  });

  // ── Save leave request ──
  async function handleSubmit() {
    if (!form.agent_id || !form.date_debut || !form.date_fin) {
      showToast('Agent, date début et date fin sont obligatoires', 'error');
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
    if (error) showToast('Erreur lors de l\'enregistrement', 'error');
    else {
      showToast('Demande de congé enregistrée');
      setModal(false);
      setForm({ agent_id: '', date_debut: '', date_fin: '', nombre_jours: '', motif: 'Congé annuel payé' });
      onRefresh();
    }
    setLoading(false);
  }

  // ── Update leave status ──
  async function updateStatut(id, statut) {
    await supabase.from('conges').update({ statut }).eq('id', id);
    showToast(`Demande ${statut.toLowerCase()}`);
    onRefresh();
  }

  // ── Delete leave request ──
  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette demande ?')) return;
    await supabase.from('conges').delete().eq('id', id);
    showToast('Demande supprimée');
    onRefresh();
  }

  // ── Compute stats ──
  const enAttente = conges.filter(c => c.statut === 'En attente').length;
  const approuves = conges.filter(c => c.statut === 'Approuvé').length;
  const refuses   = conges.filter(c => c.statut === 'Refusé').length;

  return (
    <div>

      {/* ── Stats ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16, marginBottom: 24,
      }}>
        {[
          { label: 'Total demandes', value: conges.length,  icon: Calendar,     color: '#E8920A' },
          { label: 'En attente',     value: enAttente,      icon: Clock,        color: '#D97706' },
          { label: 'Approuvés',      value: approuves,      icon: CheckCircle,  color: '#16A34A' },
          { label: 'Refusés',        value: refuses,        icon: XCircle,      color: '#DC2626' },
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

      {/* ── Table card ── */}
      <div className="card">
        <div className="card-header">
          <h3>Demandes de congés ({filtered.length})</h3>
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                    Aucune demande de congé
                  </td>
                </tr>
              ) : filtered.map(c => {
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
                        <div style={{ display: 'flex', gap: 6 }}>
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
      </div>

      {/* ════════════════════════════════
          MODAL: New leave request
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
                <div className="form-group">
                  <label>Date début *</label>
                  <input type="date" value={form.date_debut} onChange={e => setF('date_debut', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Date fin *</label>
                  <input type="date" value={form.date_fin} onChange={e => setF('date_fin', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Nombre de jours</label>
                  <input type="number" min="1" value={form.nombre_jours} onChange={e => setF('nombre_jours', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Motif</label>
                  <input value={form.motif} onChange={e => setF('motif', e.target.value)} />
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