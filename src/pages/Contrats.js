// Contrats.js - CDD contract tracking page
// Displays contract status, expiry alerts and timeline

import React, { useState } from 'react';
import { formatDate, joursRestants, getInitials, avatarColor } from '../lib/helpers';
import {
  FileText, AlertTriangle, CheckCircle,
  Clock, XCircle, Search, Eye,
} from 'lucide-react';

// ── Status badge for contract days remaining ──────────────
function JoursBadge({ dateFin }) {
  const diff = joursRestants(dateFin);
  if (diff === null) return <span className="badge badge-gray">—</span>;
  if (diff < 0)  return <span className="badge badge-red"><XCircle size={10} style={{ marginRight: 3 }} />Expiré</span>;
  if (diff <= 30) return <span className="badge badge-red"><AlertTriangle size={10} style={{ marginRight: 3 }} />{diff} j</span>;
  if (diff <= 60) return <span className="badge badge-orange"><Clock size={10} style={{ marginRight: 3 }} />{diff} j</span>;
  return <span className="badge badge-green"><CheckCircle size={10} style={{ marginRight: 3 }} />{diff} j</span>;
}

// ── Main Contrats component ───────────────────────────────
export default function Contrats({ agents, onOpenFiche }) {
  const [search, setSearch] = useState('');

  // ── Filter CDD agents ──
  const cddAgents = agents
    .filter(a => a.type_contrat === 'CDD')
    .filter(a => {
      if (!search) return true;
      return `${a.prenom} ${a.nom} ${a.poste}`.toLowerCase().includes(search.toLowerCase());
    });

  // ── Compute stats ──
  const total    = cddAgents.length;
  const expires30 = cddAgents.filter(a => {
    const d = joursRestants(a.date_fin_contrat);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const expires60 = cddAgents.filter(a => {
    const d = joursRestants(a.date_fin_contrat);
    return d !== null && d > 30 && d <= 60;
  }).length;
  const expires = cddAgents.filter(a => {
    const d = joursRestants(a.date_fin_contrat);
    return d !== null && d < 0;
  }).length;

  return (
    <div>

      {/* ── Alert: expiring soon ── */}
      {expires30 > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
          <div>
            <strong>{expires30} contrat(s)</strong> expirent dans les 30 prochains jours.
            Pensez à les renouveler ou à préparer les documents de fin de contrat.
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16, marginBottom: 24,
      }}>
        {[
          {
            label: 'Total CDD',
            value: total,
            icon: FileText,
            color: '#E8920A',
          },
          {
            label: 'Expirent dans 30j',
            value: expires30,
            icon: AlertTriangle,
            color: '#DC2626',
          },
          {
            label: 'Expirent dans 60j',
            value: expires60,
            icon: Clock,
            color: '#D97706',
          },
          {
            label: 'Expirés',
            value: expires,
            icon: XCircle,
            color: '#737373',
          },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}>
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

      {/* ── Contracts table ── */}
      <div className="card">
        <div className="card-header">
          <h3>Suivi des contrats CDD ({cddAgents.length})</h3>
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
              style={{ paddingLeft: 32, width: 200, fontSize: 12 }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Poste</th>
                <th>Département</th>
                <th>Date début</th>
                <th>Date fin</th>
                <th>Jours restants</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cddAgents.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{
                    textAlign: 'center', padding: 48,
                    color: '#A3A3A3', fontSize: 14,
                  }}>
                    {search ? 'Aucun résultat pour cette recherche' : 'Aucun contrat CDD'}
                  </td>
                </tr>
              ) : cddAgents
                  // Sort by days remaining (ascending — most urgent first)
                  .sort((a, b) => {
                    const da = joursRestants(a.date_fin_contrat) ?? 9999;
                    const db = joursRestants(b.date_fin_contrat) ?? 9999;
                    return da - db;
                  })
                  .map(a => {
                    const c = avatarColor(a.nom);
                    const diff = joursRestants(a.date_fin_contrat);
                    const isUrgent = diff !== null && diff >= 0 && diff <= 30;
                    return (
                      <tr
                        key={a.id}
                        style={{
                          background: isUrgent ? '#FFF7ED' : undefined,
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar" style={{ background: c.bg, color: c.fg }}>
                              {getInitials(a.nom, a.prenom)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0F0F0F' }}>
                                {a.prenom} {a.nom}
                              </div>
                              <div style={{ fontSize: 11, color: '#A3A3A3' }}>
                                {a.matricule || '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#404040' }}>{a.poste}</td>
                        <td style={{ color: '#737373' }}>{a.departement || '—'}</td>
                        <td style={{ color: '#737373' }}>{formatDate(a.date_embauche)}</td>
                        <td style={{ color: '#737373', fontWeight: isUrgent ? 600 : 400 }}>
                          {formatDate(a.date_fin_contrat)}
                        </td>
                        <td><JoursBadge dateFin={a.date_fin_contrat} /></td>
                        <td>
                          <span className={`badge ${a.statut === 'Actif' ? 'badge-green' : 'badge-gray'}`}>
                            {a.statut || 'Actif'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onOpenFiche && onOpenFiche(a.id)}
                            title="Voir la fiche"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}