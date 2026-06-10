// Historique.js - Audit trail page
// Tracks all create/update/delete actions on agents, contracts, leaves, advances

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  History, Search, Filter, UserPlus,
  UserMinus, Pencil, Trash2, FileText,
  Calendar, DollarSign, RefreshCw,
} from 'lucide-react';

// ── Action config ─────────────────────────────────────────
const ACTION_CONFIG = {
  INSERT: { label: 'Ajout',        color: '#16A34A', bg: '#DCFCE7', icon: UserPlus },
  UPDATE: { label: 'Modification', color: '#E8920A', bg: '#FEF3E2', icon: Pencil },
  DELETE: { label: 'Suppression',  color: '#DC2626', bg: '#FEE2E2', icon: Trash2 },
};

// ── Table config ──────────────────────────────────────────
const TABLE_CONFIG = {
  agents:        { label: 'Agent',    icon: FileText },
  contrats:      { label: 'Contrat',  icon: FileText },
  conges:        { label: 'Congé',    icon: Calendar },
  avances:       { label: 'Avance',   icon: DollarSign },
  bulletins_paie:{ label: 'Bulletin', icon: DollarSign },
};

// ── Format date ───────────────────────────────────────────
function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Diff viewer component ─────────────────────────────────
function DiffViewer({ ancien, nouveau }) {
  if (!ancien && !nouveau) return null;

  const keys = [...new Set([
    ...Object.keys(ancien || {}),
    ...Object.keys(nouveau || {}),
  ])].filter(k => !['id', 'created_at', 'updated_at'].includes(k));

  const changed = keys.filter(k => {
    const a = JSON.stringify((ancien || {})[k]);
    const n = JSON.stringify((nouveau || {})[k]);
    return a !== n;
  });

  if (changed.length === 0) return (
    <p style={{ fontSize: 12, color: '#A3A3A3', fontStyle: 'italic' }}>Aucune différence détectée</p>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {changed.map(k => (
        <div key={k} style={{
          background: '#FAFAFA', borderRadius: 6,
          padding: '6px 10px', fontSize: 12,
          border: '1px solid #F0F0F0',
        }}>
          <div style={{ fontWeight: 600, color: '#737373', marginBottom: 4, textTransform: 'uppercase', fontSize: 10 }}>
            {k.replace(/_/g, ' ')}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {ancien && (ancien)[k] !== undefined && (
              <span style={{
                background: '#FEE2E2', color: '#DC2626',
                padding: '2px 8px', borderRadius: 4, fontSize: 11,
                textDecoration: 'line-through',
              }}>
                {String((ancien)[k] ?? '—')}
              </span>
            )}
            <span style={{ color: '#A3A3A3', fontSize: 11 }}>→</span>
            {nouveau && (nouveau)[k] !== undefined && (
              <span style={{
                background: '#DCFCE7', color: '#16A34A',
                padding: '2px 8px', borderRadius: 4, fontSize: 11,
                fontWeight: 600,
              }}>
                {String((nouveau)[k] ?? '—')}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Historique component ─────────────────────────────
export default function Historique() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterTable, setFilterTable] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;

  useEffect(() => { loadLogs(); }, []);

  // ── Load audit logs ──
  async function loadLogs() {
    setLoading(true);
    const { data } = await supabase
      .from('historique')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setLogs(data || []);
    setLoading(false);
  }

  // ── Filter logs ──
  const filtered = logs.filter(l => {
    if (filterAction && l.action !== filterAction) return false;
    if (filterTable && l.table_name !== filterTable) return false;
    if (search) {
      const s = search.toLowerCase();
      const email = (l.user_email || '').toLowerCase();
      const table = (l.table_name || '').toLowerCase();
      if (!email.includes(s) && !table.includes(s)) return false;
    }
    return true;
  });

  // ── Pagination ──
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  // ── Stats ──
  const inserts = logs.filter(l => l.action === 'INSERT').length;
  const updates = logs.filter(l => l.action === 'UPDATE').length;
  const deletes = logs.filter(l => l.action === 'DELETE').length;

  return (
    <div>

      {/* ── Stats ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16, marginBottom: 24,
      }}>
        {[
          { label: 'Total actions',  value: logs.length, color: '#E8920A', icon: History },
          { label: 'Ajouts',         value: inserts,     color: '#16A34A', icon: UserPlus },
          { label: 'Modifications',  value: updates,     color: '#E8920A', icon: Pencil },
          { label: 'Suppressions',   value: deletes,     color: '#DC2626', icon: Trash2 },
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

      {/* ── Filters + table ── */}
      <div className="card">
        <div className="card-header">
          <h3>Journal des modifications</h3>
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
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                style={{ paddingLeft: 32, width: 180, fontSize: 12 }}
              />
            </div>

            {/* Filter action */}
            <select
              className="filter-select"
              value={filterAction}
              onChange={e => { setFilterAction(e.target.value); setPage(0); }}
              style={{ fontSize: 12 }}
            >
              <option value="">Toutes les actions</option>
              <option value="INSERT">Ajout</option>
              <option value="UPDATE">Modification</option>
              <option value="DELETE">Suppression</option>
            </select>

            {/* Filter table */}
            <select
              className="filter-select"
              value={filterTable}
              onChange={e => { setFilterTable(e.target.value); setPage(0); }}
              style={{ fontSize: 12 }}
            >
              <option value="">Toutes les tables</option>
              {Object.entries(TABLE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {/* Refresh */}
            <button className="btn btn-secondary btn-sm" onClick={loadLogs}>
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
            <History size={40} color="#D4D4D4" strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#737373' }}>Aucune action enregistrée</p>
            <p style={{ fontSize: 13 }}>Les modifications apparaîtront ici automatiquement</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date / Heure</th>
                    <th>Action</th>
                    <th>Table</th>
                    <th>Utilisateur</th>
                    <th>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(log => {
                    const action = ACTION_CONFIG[log.action] || { label: log.action, color: '#737373', bg: '#F5F5F5', icon: FileText };
                    const table  = TABLE_CONFIG[log.table_name] || { label: log.table_name, icon: FileText };
                    const ActionIcon = action.icon;
                    const TableIcon  = table.icon;
                    const isExpanded = expanded === log.id;

                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpanded(isExpanded ? null : log.id)}
                        >
                          <td style={{ color: '#737373', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {formatDateTime(log.created_at)}
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '3px 10px', borderRadius: 20,
                              background: action.bg, color: action.color,
                              fontSize: 11, fontWeight: 600,
                            }}>
                              <ActionIcon size={11} strokeWidth={2.5} />
                              {action.label}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: 12, color: '#404040', fontWeight: 500,
                            }}>
                              <TableIcon size={13} color="#A3A3A3" />
                              {table.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#737373' }}>
                            {log.user_email || '—'}
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={e => { e.stopPropagation(); setExpanded(isExpanded ? null : log.id); }}
                              style={{ fontSize: 11 }}
                            >
                              {isExpanded ? 'Masquer' : 'Voir'}
                            </button>
                          </td>
                        </tr>

                        {/* ── Expanded detail row ── */}
                        {isExpanded && (
                          <tr style={{ background: '#FAFAFA' }}>
                            <td colSpan="5" style={{ padding: '12px 20px' }}>
                              <div style={{ fontSize: 11, color: '#A3A3A3', marginBottom: 8, fontWeight: 600 }}>
                                ID enregistrement : {log.record_id}
                              </div>
                              {log.action === 'UPDATE' ? (
                                <DiffViewer
                                  ancien={log.ancien_valeur}
                                  nouveau={log.nouvelle_valeur}
                                />
                              ) : log.action === 'INSERT' ? (
                                <div style={{ fontSize: 12 }}>
                                  <div style={{ fontWeight: 600, color: '#16A34A', marginBottom: 6 }}>Données ajoutées :</div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {Object.entries(log.nouvelle_valeur || {})
                                      .filter(([k, v]) => v && !['id', 'created_at'].includes(k))
                                      .map(([k, v]) => (
                                        <span key={k} style={{
                                          background: '#DCFCE7', color: '#16A34A',
                                          padding: '2px 8px', borderRadius: 4,
                                          fontSize: 11, fontWeight: 500,
                                        }}>
                                          {k.replace(/_/g, ' ')}: {String(v)}
                                        </span>
                                      ))
                                    }
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>
                                  Enregistrement supprimé
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderTop: '1px solid #F0F0F0',
              }}>
                <span style={{ fontSize: 12, color: '#A3A3A3' }}>
                  {filtered.length} résultat(s) — Page {page + 1} / {totalPages}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    ← Précédent
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}