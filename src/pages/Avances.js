import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, formatMontant } from '../lib/helpers';

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${type === 'error' ? '#DC3545' : '#1C2B3A'};color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;font-family:inherit`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

export default function Avances({ avances, agents, onRefresh }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    agent_id: '', montant: '', date_demande: new Date().toISOString().split('T')[0], motif: ''
  });
  const [loading, setLoading] = useState(false);

  function setF(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    if (!form.agent_id || !form.montant) {
      showToast('Agent et montant sont obligatoires', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('avances').insert({
      agent_id: form.agent_id,
      montant: parseFloat(form.montant),
      date_demande: form.date_demande || null,
      motif: form.motif || null,
    });
    if (error) showToast('Erreur lors de l\'enregistrement', 'error');
    else {
      showToast('Demande d\'avance enregistrée');
      setModal(false);
      setForm({ agent_id: '', montant: '', date_demande: new Date().toISOString().split('T')[0], motif: '' });
      onRefresh();
    }
    setLoading(false);
  }

  async function updateStatut(id, statut) {
    await supabase.from('avances').update({ statut }).eq('id', id);
    showToast('Statut mis à jour');
    onRefresh();
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette demande ?')) return;
    await supabase.from('avances').delete().eq('id', id);
    showToast('Demande supprimée');
    onRefresh();
  }

  const enAttente = avances.filter(a => a.statut === 'En attente').length;
  const totalMontant = avances
    .filter(a => a.statut === 'Approuvé')
    .reduce((sum, a) => sum + (parseFloat(a.montant) || 0), 0);

  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total demandes</div>
          <div className="stat-value">{avances.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">En attente</div>
          <div className="stat-value" style={{ color: '#F59E0B' }}>{enAttente}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total approuvé</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {totalMontant.toLocaleString('fr-FR')} FCFA
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Avances sur salaire</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
            + Nouvelle demande
          </button>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {avances.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    Aucune demande d'avance
                  </td>
                </tr>
              ) : avances.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.agents?.prenom} {a.agents?.nom}</strong></td>
                  <td><strong>{formatMontant(a.montant)}</strong></td>
                  <td>{formatDate(a.date_demande)}</td>
                  <td>{a.motif || '-'}</td>
                  <td>
                    <span className={`badge ${a.statut === 'Approuvé' ? 'badge-green' : a.statut === 'Refusé' ? 'badge-red' : 'badge-orange'}`}>
                      {a.statut}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {a.statut === 'En attente' && <>
                        <button className="btn btn-secondary btn-sm" onClick={() => updateStatut(a.id, 'Approuvé')}>✓ Approuver</button>
                        <button className="btn btn-danger btn-sm" onClick={() => updateStatut(a.id, 'Refusé')}>✗ Refuser</button>
                      </>}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>🗑</button>
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
              <h3>Nouvelle demande d'avance</h3>
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
                  <label>Montant (FCFA) *</label>
                  <input type="number" min="0" value={form.montant}
                    onChange={e => setF('montant', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Date de demande</label>
                  <input type="date" value={form.date_demande}
                    onChange={e => setF('date_demande', e.target.value)} />
                </div>
                <div className="form-group full">
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