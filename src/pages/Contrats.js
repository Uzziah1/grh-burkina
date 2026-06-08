import React from 'react';
import { formatDate, joursRestants } from '../lib/helpers';

export default function Contrats({ agents }) {
  const cddAgents = agents.filter(a => a.type_contrat === 'CDD');

  const expiring = cddAgents.filter(a => {
    const diff = joursRestants(a.date_fin_contrat);
    return diff !== null && diff >= 0 && diff <= 60;
  });

  function badgeJours(dateFin) {
    const diff = joursRestants(dateFin);
    if (diff === null) return <span className="badge badge-gray">-</span>;
    if (diff < 0) return <span className="badge badge-red">Expiré</span>;
    if (diff <= 30) return <span className="badge badge-red">{diff} j</span>;
    if (diff <= 60) return <span className="badge badge-orange">{diff} j</span>;
    return <span className="badge badge-green">{diff} j</span>;
  }

  return (
    <div>
      {expiring.length > 0 && (
        <div className="alert alert-warning">
          ⚠️ {expiring.length} contrat(s) CDD expirent dans les 60 prochains jours
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total CDD</div>
          <div className="stat-value">{cddAgents.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Expirant dans 30j</div>
          <div className="stat-value" style={{ color: '#F59E0B' }}>
            {cddAgents.filter(a => { const d = joursRestants(a.date_fin_contrat); return d !== null && d >= 0 && d <= 30; }).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Expirés</div>
          <div className="stat-value" style={{ color: '#DC3545' }}>
            {cddAgents.filter(a => { const d = joursRestants(a.date_fin_contrat); return d !== null && d < 0; }).length}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Suivi des contrats CDD ({cddAgents.length})</h3>
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
              </tr>
            </thead>
            <tbody>
              {cddAgents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    Aucun contrat CDD
                  </td>
                </tr>
              ) : cddAgents.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.prenom} {a.nom}</strong></td>
                  <td>{a.poste}</td>
                  <td>{a.departement || '-'}</td>
                  <td>{formatDate(a.date_embauche)}</td>
                  <td>{formatDate(a.date_fin_contrat)}</td>
                  <td>{badgeJours(a.date_fin_contrat)}</td>
                  <td>
                    <span className={`badge ${a.statut === 'Actif' ? 'badge-green' : 'badge-gray'}`}>
                      {a.statut || 'Actif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}