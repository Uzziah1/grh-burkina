// Utilisateurs.js - User management page
// Features: view users, change roles, activate/deactivate

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  UserCog, Shield, Users, Briefcase,
  ToggleLeft, ToggleRight, ExternalLink, Crown,
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

// ── Main Utilisateurs component ───────────────────────────
export default function Utilisateurs({ profil }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUtilisateurs(); }, []);

  async function loadUtilisateurs() {
    setLoading(true);
    const { data } = await supabase.from('profils').select('*').order('created_at');
    setUtilisateurs(data || []);
    setLoading(false);
  }

  // ── Update user role ──
  async function handleUpdateRole(id, role) {
    await supabase.from('profils').update({ role }).eq('id', id);
    showToast('Rôle mis à jour');
    loadUtilisateurs();
  }

  // ── Toggle user active status ──
  async function handleToggleActif(id, actif) {
    await supabase.from('profils').update({ actif: !actif }).eq('id', id);
    showToast(!actif ? 'Utilisateur activé' : 'Utilisateur désactivé');
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

          {/* Link to Supabase to add users */}
          {profil?.role === 'admin' && (
            
             <a href="https://supabase.com/dashboard/project/scbncfieuetgclmlodmw/auth/users"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              <ExternalLink size={14} />
              Ajouter dans Supabase
            </a>
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
      </div>
    </div>
  );
}