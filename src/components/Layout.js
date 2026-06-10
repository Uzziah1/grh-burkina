// Layout.js - Main application layout with collapsible sidebar
// White sidebar | Orange accent | Poppins font | Lucide icons
// Features: collapsible sidebar with tooltips on collapsed state

import React, { useState } from 'react';
import { peutFaire } from '../lib/useProfil';
import {
  LayoutDashboard, Users, FileText, Calendar,
  DollarSign, FolderOpen, Building2, UserCog,
  LogOut, ChevronRight, ChevronLeft, Banknote, History,
} from 'lucide-react';

// ── Navigation items ──────────────────────────────────────
const mainNavItems = [
  { id: 'dashboard',    label: 'Tableau de bord', permission: null,               icon: LayoutDashboard },
  { id: 'agents',       label: 'Agents',           permission: 'voirAgents',       icon: Users },
  { id: 'contrats',     label: 'Contrats',         permission: 'voirContrats',     icon: FileText },
  { id: 'conges',       label: 'Congés',           permission: 'voirConges',       icon: Calendar },
  {
  id: 'paie', label: 'Paie', permission: 'voirAvances', icon: Banknote,
},
  { id: 'avances',      label: 'Avances salaire',  permission: 'voirAvances',      icon: DollarSign },
  { id: 'documents',    label: 'Documents',        permission: 'voirDocuments',    icon: FolderOpen },
  { id: 'historique', label: 'Journalisation', permission: 'voirAgents', icon: History },
];


const settingsNavItems = [
  { id: 'utilisateurs', label: 'Utilisateurs',     permission: 'voirUtilisateurs', icon: UserCog },
  { id: 'entreprise',   label: 'Entreprise',       permission: 'voirEntreprise',   icon: Building2 },
];

// ── Page titles ───────────────────────────────────────────
const pageTitles = {
  dashboard:    'Tableau de bord',
  agents:       'Gestion des agents',
  contrats:     'Suivi des contrats',
  conges:       'Congés',
  paie: 'Bulletins de paie',
  avances:      'Avances sur salaire',
  documents:    'Documents',
  historique: 'Journalisation',
  entreprise:   'Mon Entreprise',
  utilisateurs: 'Gestion des utilisateurs',
  fiche:        'Fiche agent',
};

// ── Role display helper ───────────────────────────────────
function getRoleInfo(role) {
  const roles = {
    admin:     { label: 'Administrateur', color: '#E8920A' },
    rh:        { label: 'Responsable RH', color: '#2563EB' },
    comptable: { label: 'Comptable',      color: '#16A34A' },
  };
  return roles[role] || { label: role, color: '#737373' };
}

// ── NavItem component ─────────────────────────────────────
function NavItem({ item, isActive, onClick, collapsed }) {
  const Icon = item.icon;
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => onClick(item.id)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 10,
          padding: collapsed ? '11px 0' : '10px 20px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: isActive ? 600 : 500,
          color: isActive ? '#E8920A' : '#737373',
          background: isActive ? '#FEF3E2' : 'transparent',
          borderLeft: isActive && !collapsed ? '3px solid #E8920A' : '3px solid transparent',
          transition: 'all 0.15s',
          width: '100%',
          boxSizing: 'border-box',
          marginBottom: 1,
        }}
      >
        <Icon size={18} strokeWidth={2} />
        {!collapsed && (
          <>
            <span style={{ flex: 1, fontFamily: 'Poppins, sans-serif' }}>{item.label}</span>
            {isActive && <ChevronRight size={13} strokeWidth={2.5} style={{ opacity: 0.6 }} />}
          </>
        )}
      </div>

      {collapsed && showTooltip && (
        <div style={{
          position: 'absolute', left: '110%', top: '50%',
          transform: 'translateY(-50%)',
          background: '#1A1A1A', color: '#fff',
          padding: '6px 12px', borderRadius: 8,
          fontSize: 12, fontWeight: 500,
          whiteSpace: 'nowrap', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontFamily: 'Poppins, sans-serif',
          pointerEvents: 'none',
        }}>
          {item.label}
          <div style={{
            position: 'absolute', left: -5, top: '50%',
            transform: 'translateY(-50%)',
            width: 0, height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderRight: '5px solid #1A1A1A',
          }} />
        </div>
      )}
    </div>
  );
}
// ── Main Layout ───────────────────────────────────────────
export default function Layout({ children, page, setPage, user, profil, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const roleInfo = profil ? getRoleInfo(profil.role) : null;
  const sidebarWidth = collapsed ? 64 : 240;

  const visibleMain = mainNavItems.filter(n =>
    n.permission === null || peutFaire(profil, n.permission)
  );
  const visibleSettings = settingsNavItems.filter(n =>
    peutFaire(profil, n.permission)
  );

  return (
    <div className="app">

      {/* ════════════════════════════════
          SIDEBAR
      ════════════════════════════════ */}
      <div style={{
        width: sidebarWidth,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        flexShrink: 0,
        borderRight: '1px solid #E5E5E5',
        boxShadow: '1px 0 8px rgba(0,0,0,0.04)',
        transition: 'width 0.25s ease',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? '22px 0 18px' : '22px 20px 18px',
          borderBottom: '1px solid #F5F5F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          overflow: 'hidden',
          transition: 'padding 0.25s ease',
        }}>
          <div style={{
            width: 36, height: 36,
            background: '#E8920A',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(232,146,10,0.3)',
          }}>
            <Users size={18} color="#fff" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                color: '#0F0F0F', fontSize: 15,
                fontWeight: 700, letterSpacing: '-0.3px',
                fontFamily: 'Poppins, sans-serif',
                whiteSpace: 'nowrap',
              }}>
                RH Manager
              </div>
              <div style={{
                color: '#A3A3A3', fontSize: 11,
                marginTop: 1, fontFamily: 'Poppins, sans-serif',
                whiteSpace: 'nowrap',
              }}>
                Gestion RH
              </div>
            </div>
          )}
        </div>

        {/* Toggle button */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute',
            top: 22,
            right: -12,
            width: 24, height: 24,
            background: '#FFFFFF',
            border: '1.5px solid #E5E5E5',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#E8920A';
            e.currentTarget.style.borderColor = '#E8920A';
            e.currentTarget.querySelector('svg').style.color = '#fff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E5E5E5';
            e.currentTarget.querySelector('svg').style.color = '#737373';
          }}
        >
          {collapsed
            ? <ChevronRight size={13} color="#737373" strokeWidth={2.5} />
            : <ChevronLeft size={13} color="#737373" strokeWidth={2.5} />
          }
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '14px 0', overflowY: 'auto', overflowX: 'hidden' }}>

          {/* Section label */}
          {!collapsed && (
            <div style={{
              color: '#A3A3A3', fontSize: 10, fontWeight: 600,
              letterSpacing: '1.2px', textTransform: 'uppercase',
              padding: '10px 20px 6px',
              fontFamily: 'Poppins, sans-serif',
              whiteSpace: 'nowrap',
            }}>
              Menu principal
            </div>
          )}

          {collapsed && <div style={{ height: 10 }} />}

          {visibleMain.map(n => (
            <NavItem
              key={n.id}
              item={n}
              isActive={page === n.id || (page === 'fiche' && n.id === 'agents')}
              onClick={setPage}
              collapsed={collapsed}
            />
          ))}

          {visibleSettings.length > 0 && (
            <>
              {!collapsed && (
                <div style={{
                  color: '#A3A3A3', fontSize: 10, fontWeight: 600,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  padding: '16px 20px 6px',
                  fontFamily: 'Poppins, sans-serif',
                  whiteSpace: 'nowrap',
                }}>
                  Paramètres
                </div>
              )}
              {collapsed && <div style={{ height: 10 }} />}
              {visibleSettings.map(n => (
                <NavItem
                  key={n.id}
                  item={n}
                  isActive={page === n.id}
                  onClick={setPage}
                  collapsed={collapsed}
                />
              ))}
            </>
          )}
        </nav>

        {/* User info + logout */}
        <div style={{
          padding: '12px 0',
          borderTop: '1px solid #F5F5F5',
        }}>
          {/* User card - only when expanded */}
          {profil && !collapsed && (
            <div style={{
              margin: '0 12px 8px',
              padding: '10px 12px',
              background: '#FAFAFA',
              border: '1px solid #E5E5E5',
              borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: roleInfo?.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {(profil.prenom || profil.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: '#1A1A1A',
                    whiteSpace: 'nowrap', overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontFamily: 'Poppins, sans-serif',
                  }}>
                    {profil.prenom
                      ? `${profil.prenom} ${profil.nom || ''}`.trim()
                      : profil.email}
                  </div>
                  <div style={{
                    fontSize: 10, color: roleInfo?.color,
                    marginTop: 1, fontFamily: 'Poppins, sans-serif',
                    fontWeight: 500,
                  }}>
                    {roleInfo?.label}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Avatar only when collapsed */}
          {profil && collapsed && (
            <div style={{
              display: 'flex', justifyContent: 'center',
              marginBottom: 6,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: roleInfo?.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}>
                {(profil.prenom || profil.email || '?')[0].toUpperCase()}
              </div>
            </div>
          )}

          {/* Logout */}
          <div
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 10,
              padding: collapsed ? '9px 0' : '9px 20px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              color: '#DC2626',
              transition: 'all 0.15s',
              fontFamily: 'Poppins, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={17} strokeWidth={2} />
            {!collapsed && <span>Déconnexion</span>}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════ */}
      <div className="main" style={{ transition: 'all 0.25s ease' }}>

        {/* Topbar */}
        <div style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E5E5',
          padding: '0 28px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{
            fontSize: 16, fontWeight: 700,
            color: '#0F0F0F', letterSpacing: '-0.2px',
            fontFamily: 'Poppins, sans-serif',
          }}>
            {pageTitles[page] || 'RH Manager'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 12px',
              background: '#FAFAFA',
              border: '1px solid #E5E5E5',
              borderRadius: 8, fontSize: 12,
              color: '#737373',
              fontFamily: 'Poppins, sans-serif',
            }}>
              <div style={{
                width: 7, height: 7,
                borderRadius: '50%',
                background: '#16A34A',
              }} />
              {user?.email}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}