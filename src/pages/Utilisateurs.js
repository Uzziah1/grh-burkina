import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${type === 'error' ? '#DC3545' : '#1C2B3A'};color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;font-family:inherit`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

const ROLES = [
  { value: 'admin', label: '👑 Administrateur', desc: 'Accès complet à toutes les fonctionnalités' },
  { value: 'rh', label: '👤 Responsable RH', desc: 'Gestion agents, contrats, documents, congés, avances' },
  { value: 'comptable', label: '💼 Comptable', desc: 'Consultation uniquement, gestion des avances' },
];

export default function Utilisateurs({ profil }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
const [loading, setLoading] = useState(true);
const [modal, setModal] = useState(false);
const [form, setForm] = useState({ email: '', nom: '', prenom: '', role: 'rh', password: '' });

  useEffect(() => { loadUtilisateurs(); }, []);

  async function loadUtilisateurs() {
    setLoading(true);
    const { data } = await supabase.from('profils').select('*').order('created_at');
    setUtilisateurs(data || []);
    setLoading(false);
  }

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleUpdateRole(id, role) {
    await supabase.from('profils').update({ role }).eq('id', id);
    showToast('Rôle mis à jour');
    loadUtilisateurs();
  }

  async function handleToggleActif(id, actif) {
    await supabase.from('profils').update({ actif: !actif }).eq('id', id);
    showToast(!actif ? 'Utilisateur activé' : 'Utilisateur désactivé');
    loadUtilisateurs();
  }

  function getRoleBadge(role) {
    if (role === 'admin') return <span className="badge badge-red">👑 Admin</span>;
    if (role === 'rh') return <span className="badge badge-blue">👤 RH</span>;
    if (role === 'comptable') return <span className="badge badge-green">💼 Comptable</span>;
    return <span className="badge badge-gray">{role}</span>;
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Chargement...</div>;

  return (
    <div>
      {/* Rôles disponibles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {ROLES.map(r => (
          <div key={r.value} className="card">
            <div className="card-body">
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.desc}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginTop: 8 }}>
                {utilisateurs.filter(u => u.role === r.value).length} utilisateur(s)
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Utilisateurs ({utilisateurs.length})</h3>
          {profil?.role === 'admin' && (
            <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
              + Nouvel utilisateur
            </button>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              {profil?.role === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>
                    {u.prenom || u.nom ? `${u.prenom || ''} ${u.nom || ''}`.trim() : '—'}
                  </div>
                </td>
                <td>{u.email}</td>
                <td>{getRoleBadge(u.role)}</td>
                <td>
                  <span className={`badge ${u.actif ? 'badge-green' : 'badge-gray'}`}>
                    {u.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                {profil?.role === 'admin' && (
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select
                        className="filter-select"
                        value={u.role}
                        onChange={e => handleUpdateRole(u.id, e.target.value)}
                        style={{ fontSize: 12, padding: '4px 8px' }}
                      >
                        <option value="admin">Admin</option>
                        <option value="rh">RH</option>
                        <option value="comptable">Comptable</option>
                      </select>
                      <button
                        className={`btn btn-sm ${u.actif ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => handleToggleActif(u.id, u.actif)}
                      >
                        {u.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal création */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="modal" style={{ width: 480 }}>
            <div className="modal-header">
              <h3>Nouvel utilisateur</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Prénom</label>
                  <input value={form.prenom} onChange={e => setF('prenom', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Nom</label>
                  <input value={form.nom} onChange={e => setF('nom', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={e => setF('email', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label>Mot de passe *</label>
                  <input type="password" value={form.password} onChange={e => setF('password', e.target.value)} placeholder="Minimum 6 caractères" />
                </div>
                <div className="form-group full">
                  <label>Rôle *</label>
                  <select value={form.role} onChange={e => setF('role', e.target.value)}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Aperçu des permissions */}
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Permissions du rôle sélectionné :</div>
                {form.role === 'admin' && (
                  <div>✅ Accès complet — gestion agents, documents, congés, avances, utilisateurs</div>
                )}
                {form.role === 'rh' && (
                  <div>✅ Gestion agents, contrats, documents, congés, avances<br />❌ Gestion des utilisateurs</div>
                )}
                {form.role === 'comptable' && (
                  <div>✅ Consultation agents et contrats<br />✅ Gestion des avances<br />❌ Modification agents, documents, congés, utilisateurs</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
  <button className="btn btn-secondary" onClick={() => setModal(false)}>Fermer</button>
  
    <a href="https://supabase.com/dashboard/project/scbncfieuetgclmlodmw/auth/users"
    target="_blank"
    rel="noreferrer"
    className="btn btn-primary"
  >
    Ouvrir Supabase ↗
  </a>
</div>
          </div>
        </div>
      )}
    </div>
  );
}