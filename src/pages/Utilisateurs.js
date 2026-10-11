// Utilisateurs.js — Gestion des utilisateurs
// Fonctionnalités : liste, changement de rôle, activation/désactivation,
//                  invitation par email (Edge Function invite-user)

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  UserCog, Shield, Users, Briefcase,
  ToggleLeft, ToggleRight, Crown, Plus, X, Send,
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

// ── Role config ───────────────────────────────────────────
const ROLES = {
  admin: {
    label:       'Administrateur',
    color:       '#E8920A',
    bg:          '#FEF3E2',
    icon:        Crown,
    permissions: [
      'Accès complet à toutes les fonctionnalités',
      'Gestion des agents, contrats, documents',
      'Gestion des congés et avances',
      'Gestion des utilisateurs',
      'Configuration de l\'entreprise',
    ],
  },
  rh: {
    label:       'Responsable RH',
    color:       '#2563EB',
    bg:          '#DBEAFE',
    icon:        Users,
    permissions: [
      'Gestion des agents et contrats',
      'Génération de documents',
      'Gestion des congés et avances',
      '✗ Gestion des utilisateurs',
      '✗ Configuration entreprise',
      '✗ Fiche entreprise',
    ],
  },
  comptable: {
    label:       'Comptable',
    color:       '#16A34A',
    bg:          '#DCFCE7',
    icon:        Briefcase,
    permissions: [
      'Consultation agents et contrats',
      'Gestion des avances',
      '✗ Modification des agents',
      '✗ Documents et congés',
      '✗ Gestion des utilisateurs',
    ],
  },
};

// ── Role badge ────────────────────────────────────────────
function RoleBadge({ role }) {
  const r = ROLES[role] || { label: role, color: '#737373', bg: '#F5F5F5' };
  const Icon = r.icon || Shield;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 20,
      background: r.bg, color: r.color,
      fontSize: 11, fontWeight: 600,
      fontFamily: 'Poppins, sans-serif',
    }}>
      <Icon size={11} strokeWidth={2.5} />
      {r.label}
    </span>
  );
}

// ── Permissions list ──────────────────────────────────────
function PermissionsList({ role }) {
  const r = ROLES[role];
  if (!r) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {r.permissions.map((p, i) => (
        <div key={i} style={{
          fontSize: 11, color: p.startsWith('✗') ? '#A3A3A3' : '#404040',
          padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'Poppins, sans-serif',
        }}>
          <span style={{
            width: 14, height: 14, borderRadius: '50%',
            background: p.startsWith('✗') ? '#F5F5F5' : '#DCFCE7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, flexShrink: 0,
          }}>
            {p.startsWith('✗') ? '✗' : '✓'}
          </span>
          {p.replace('✗ ', '')}
        </div>
      ))}
    </div>
  );
}

// ── Composant principal Utilisateurs ─────────────────────
export default function Utilisateurs({ profil }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(false);
  const [sending, setSending]           = useState(false);
  const [form, setForm] = useState({ email: '', prenom: '', nom: '', role: 'rh' });

  useEffect(() => { loadUtilisateurs(); }, []);

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function loadUtilisateurs() {
    setLoading(true);
    const { data } = await supabase.from('profils').select('*').order('created_at');
    setUtilisateurs(data || []);
    setLoading(false);
  }

  // ── Invitation d'un nouvel utilisateur ────────────────
  async function handleInviter() {
    if (!form.email || !form.role) {
      showToast('Veuillez renseigner l\'adresse email et le rôle', 'error');
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': process.env.REACT_APP_SUPABASE_KEY,
          },
          body: JSON.stringify(form),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Impossible d'envoyer l'invitation. Réessayez.", 'error');
      } else {
        showToast(`Invitation envoyée à ${form.email} avec succès`);
        setModal(false);
        setForm({ email: '', prenom: '', nom: '', role: 'rh' });
        loadUtilisateurs();
      }
    } catch {
      showToast('Problème de connexion. Vérifiez votre réseau.', 'error');
    }
    setSending(false);
  }

  // ── Mise à jour du rôle ───────────────────────────────
  async function handleUpdateRole(id, role) {
    await supabase.from('profils').update({ role }).eq('id', id);
    showToast('Rôle mis à jour avec succès');
    loadUtilisateurs();
  }

  // ── Activation / désactivation ────────────────────────
  async function handleToggleActif(id, actif) {
    await supabase.from('profils').update({ actif: !actif }).eq('id', id);
    showToast(!actif ? 'Compte activé avec succès' : 'Compte désactivé avec succès');
    loadUtilisateurs();
  }

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 300, color: '#A3A3A3', fontFamily: 'Poppins, sans-serif',
    }}>
      Chargement...
    </div>
  );

  return (
    <div>

      {/* ── Role cards ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 16, marginBottom: 24,
      }}>
        {Object.entries(ROLES).map(([key, r]) => {
          const Icon = r.icon;
          const count = utilisateurs.filter(u => u.role === key).length;
          return (
            <div key={key} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: r.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={20} color={r.color} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: '#0F0F0F',
                      fontFamily: 'Poppins, sans-serif',
                    }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 12, color: r.color, fontWeight: 600 }}>
                      {count} utilisateur(s)
                    </div>
                  </div>
                </div>
                <PermissionsList role={key} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Users table ── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: '#FEF3E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserCog size={15} color="#E8920A" strokeWidth={2} />
            </div>
            <h3>Utilisateurs ({utilisateurs.length})</h3>
          </div>

          {/* Bouton invitation (admin uniquement) */}
          {profil?.role === 'admin' && (
            <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
              <Plus size={14} />
              Inviter un utilisateur
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ minWidth: 540 }}>
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
            {utilisateurs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                  Aucun utilisateur
                </td>
              </tr>
            ) : utilisateurs.map(u => {
              const isCurrentUser = profil?.id === u.id;
              const initiale = (u.prenom || u.email || '?')[0].toUpperCase();
              const roleInfo = ROLES[u.role] || { color: '#737373', bg: '#F5F5F5' };
              return (
                <tr key={u.id} style={{ background: isCurrentUser ? '#FFFBF5' : undefined }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: roleInfo.bg, color: roleInfo.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                        fontFamily: 'Poppins, sans-serif',
                      }}>
                        {initiale}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F0F0F', fontSize: 13 }}>
                          {u.prenom || u.nom
                            ? `${u.prenom || ''} ${u.nom || ''}`.trim()
                            : '—'}
                          {isCurrentUser && (
                            <span style={{
                              fontSize: 10, color: '#E8920A', fontWeight: 600,
                              marginLeft: 6, fontFamily: 'Poppins, sans-serif',
                            }}>
                              (vous)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: '#737373', fontSize: 13 }}>{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>
                    <span className={`badge ${u.actif ? 'badge-green' : 'badge-gray'}`}>
                      {u.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  {profil?.role === 'admin' && (
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Role selector */}
                        <select
                          className="filter-select"
                          value={u.role}
                          onChange={e => handleUpdateRole(u.id, e.target.value)}
                          style={{ fontSize: 12, padding: '5px 10px' }}
                          disabled={isCurrentUser}
                        >
                          <option value="admin">Administrateur</option>
                          <option value="rh">Responsable RH</option>
                          <option value="comptable">Comptable</option>
                        </select>

                        {/* Toggle active */}
                        {!isCurrentUser && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleActif(u.id, u.actif)}
                            title={u.actif ? 'Désactiver' : 'Activer'}
                            style={{
                              color: u.actif ? '#DC2626' : '#16A34A',
                              borderColor: u.actif ? '#DC2626' : '#16A34A',
                            }}
                          >
                            {u.actif
                              ? <ToggleRight size={16} strokeWidth={2} />
                              : <ToggleLeft size={16} strokeWidth={2} />
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>{/* /overflowX wrapper */}
      </div>

      {/* ════════════════════════════════
          MODAL : Invitation utilisateur
      ════════════════════════════════ */}
      {modal && (
        <div className="modal-overlay" onClick={e => {
          if (e.target === e.currentTarget) setModal(false);
        }}>
          <div className="modal" style={{ width: 480 }}>
            <div className="modal-header">
              <h3>Inviter un utilisateur</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 12, color: '#737373', marginBottom: 16, marginTop: 0 }}>
                Un email d'invitation sera envoyé à l'adresse indiquée. L'utilisateur
                pourra définir son mot de passe via le lien reçu.
              </p>
              <div className="form-grid">

                {/* Email */}
                <div className="form-group full">
                  <label>Adresse email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setF('email', e.target.value)}
                    placeholder="exemple@email.com"
                    autoFocus
                  />
                </div>

                {/* Prénom */}
                <div className="form-group">
                  <label>Prénom</label>
                  <input
                    value={form.prenom}
                    onChange={e => setF('prenom', e.target.value)}
                    placeholder="Ex : Tégawendé"
                  />
                </div>

                {/* Nom */}
                <div className="form-group">
                  <label>Nom</label>
                  <input
                    value={form.nom}
                    onChange={e => setF('nom', e.target.value)}
                    placeholder="Ex : KABORE"
                  />
                </div>

                {/* Rôle */}
                <div className="form-group full">
                  <label>Rôle *</label>
                  <select value={form.role} onChange={e => setF('role', e.target.value)}>
                    <option value="admin">Administrateur — accès complet</option>
                    <option value="rh">Responsable RH — gestion agents, congés, paie</option>
                    <option value="comptable">Comptable — consultation et avances</option>
                  </select>
                </div>

              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleInviter} disabled={sending}>
                <Send size={14} />
                {sending ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}