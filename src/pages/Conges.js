import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/helpers';
import { peutFaire } from '../lib/useProfil';

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${type === 'error' ? '#DC3545' : '#1C2B3A'};color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;font-family:inherit`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

export default function Conges({ conges, agents, onRefresh, profil }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    agent_id: '', date_debut: '', date_fin: '', nombre_jours: '', motif: 'Congé annuel payé'
  });
  const [loading, setLoading] = useState(false);

  function setF(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    if (!form.agent_id || !form.date_debut || !form.date_fin) {
      showToast('Champs obligatoires manquants', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('conges').insert({
      agent_id: form.agent_id,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      nombre_jours: form.nombre_jours ? parseInt(form.nombre_jours) : null,
      motif: form.motif || null,
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

  async function updateStatut(id, statut) {
    await supabase.from('conges').update({ statut }).eq('id', id);
    showToast('Statut mis à jour');
    onRefresh();
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette demande ?')) return;
    await supabase.from('conges').delete().eq('id', id);
    showToast('Demande supprimée');
    onRefresh();
  }

  const enAttente = conges.filter(c => c.statut === 'En attente').length;
  const approuves = conges.filter(c => c.statut === 'Approuvé').length;

  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total demandes</div>
          <div className="stat-value">{conges.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">En attente</div>
          <div className="stat-value" style={{ color: '#F59E0B' }}>{enAttente}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approuvés</div>
          <div className="stat-value" style={{ color: '#00875A' }}>{approuves}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
        <h3>Demandes de congés</h3>
        {peutFaire(profil, 'modifierConges') && (
            <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
            + Nouvelle demande
            </button>
        )}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {conges.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    Aucune demande de congé
                  </td>
                </tr>
              ) : conges.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.agents?.prenom} {c.agents?.nom}</strong></td>
                  <td>{formatDate(c.date_debut)}</td>
                  <td>{formatDate(c.date_fin)}</td>
                  <td>{c.nombre_jours || '-'}</td>
                  <td>{c.motif || '-'}</td>
                  <td>
                    <span className={`badge ${c.statut === 'Approuvé' ? 'badge-green' : c.statut === 'Refusé' ? 'badge-red' : 'badge-orange'}`}>
                      {c.statut}
                    </span>
                  </td>
                  <td>
                <div style={{ display: 'flex', gap: 6 }}>
                    {peutFaire(profil, 'modifierConges') && c.statut === 'En attente' && <>
                    <button className="btn btn-secondary btn-sm" onClick={() => updateStatut(c.id, 'Approuvé')}>✓ Approuver</button>
                    <button className="btn btn-danger btn-sm" onClick={() => updateStatut(c.id, 'Refusé')}>✗ Refuser</button>
                    </>}
                    {peutFaire(profil, 'modifierConges') && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>🗑</button>
                    )}
                </div>
                </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="modal" style={{ width: 480 }}>
            <div className="modal-header">
              <h3>Nouvelle demande de congé</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full">
                  <label>Agent *</label>
                  <select value={form.agent_id} onChange={e => setF('agent_id', e.target.value)}>
                    <option value="">Sélectionner un agent...</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>
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
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}