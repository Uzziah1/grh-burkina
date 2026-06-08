import React from 'react';
import { peutFaire } from '../lib/useProfil';

const allNavItems = [
  {
    id: 'dashboard', label: 'Tableau de bord', permission: null,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  },
  {
    id: 'agents', label: 'Agents', permission: 'voirAgents',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    id: 'contrats', label: 'Contrats', permission: 'voirContrats',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  },
  {
    id: 'conges', label: 'Congés', permission: 'voirConges',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  },
  {
    id: 'avances', label: 'Avances salaire', permission: 'voirAvances',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  },
  {
    id: 'documents', label: 'Documents', permission: 'voirDocuments',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
  },
];

const settingsNavItems = [
  {
    id: 'utilisateurs', label: 'Utilisateurs', permission: 'voirUtilisateurs',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>
  },
  {
    id: 'entreprise', label: 'Entreprise', permission: 'voirEntreprise',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><rect x="9" y="14" width="6" height="7"/></svg>
  },
];

const pageTitles = {
  dashboard: 'Tableau de bord',
  agents: 'Gestion des agents',
  contrats: 'Suivi des contrats',
  conges: 'Congés',
  avances: 'Avances sur salaire',
  documents: 'Documents',
  entreprise: 'Mon Entreprise',
  utilisateurs: 'Gestion des utilisateurs',
  fiche: 'Fiche agent',
};

function getRoleLabel(role) {
  if (role === 'admin') return { label: '👑 Administrateur', color: '#DC3545' };
  if (role === 'rh') return { label: '👤 Responsable RH', color: '#0059B3' };
  if (role === 'comptable') return { label: '💼 Comptable', color: '#00875A' };
  return { label: role, color: '#6B6B6B' };
}

export default function Layout({ children, page, setPage, user, profil, onLogout }) {
  const roleInfo = profil ? getRoleLabel(profil.role) : null;

  const visibleNav = allNavItems.filter(n =>
    n.permission === null || peutFaire(profil, n.permission)
  );

  const visibleSettings = settingsNavItems.filter(n =>
    peutFaire(profil, n.permission)
  );

  return (
    <div className="app">
      <div className="sidebar">
        <div className="logo">
          <h1>GRH Burkina</h1>
          <p>Gestion des Ressources Humaines</p>
        </div>
        <nav className="nav">
          <div className="nav-section">Menu</div>
          {visibleNav.map(n => (
            <div
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => setPage(n.id)}
            >
              {n.icon}
              {n.label}
            </div>
          ))}

          {visibleSettings.length > 0 && (
            <>
              <div className="nav-section">Paramètres</div>
              {visibleSettings.map(n => (
                <div
                  key={n.id}
                  className={`nav-item ${page === n.id ? 'active' : ''}`}
                  onClick={() => setPage(n.id)}
                >
                  {n.icon}
                  {n.label}
                </div>
              ))}
            </>
          )}
        </nav>

        <div className="nav-footer">
          {/* Infos utilisateur connecté */}
          {profil && (
            <div style={{
              padding: '10px 12px', marginBottom: 4,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 8, marginLeft: 4, marginRight: 4
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                {profil.prenom || profil.email}
              </div>
              <div style={{ fontSize: 11, color: roleInfo?.color, marginTop: 2 }}>
                {roleInfo?.label}
              </div>
            </div>
          )}
          <div className="nav-item" onClick={onLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Déconnexion
          </div>
        </div>
      </div>
      <div className="main">
        <div className="topbar">
          <h2>{pageTitles[page]}</h2>
          <div className="topbar-right">
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{user?.email}</span>
          </div>
        </div>
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}