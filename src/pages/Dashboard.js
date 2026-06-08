import React from 'react';
import { age, formatDate, joursRestants } from '../lib/helpers';
import { avatarColor, getInitials } from '../lib/helpers';

export default function Dashboard({ agents }) {
  const total = agents.length;
  const cdi = agents.filter(a => a.type_contrat === 'CDI').length;
  const cdd = agents.filter(a => a.type_contrat === 'CDD').length;
  const actifs = agents.filter(a => a.statut === 'Actif').length;

  const expiring = agents.filter(a => {
    if (a.type_contrat !== 'CDD' || !a.date_fin_contrat) return false;
    const diff = joursRestants(a.date_fin_contrat);
    return diff >= 0 && diff <= 30;
  });

  const postes = [...new Set(agents.map(a => a.poste))];
  const posteData = postes
    .map(p => ({ poste: p, count: agents.filter(a => a.poste === p).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Agents</div>
          <div className="stat-value">{total}</div>
          <div className="stat-sub">
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#00875A', marginRight: 4 }}></span>
            {actifs} actifs
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Contrats CDI</div>
          <div className="stat-value">{cdi}</div>
          <div className="stat-sub">{total > 0 ? Math.round(cdi / total * 100) : 0}% des agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Contrats CDD</div>
          <div className="stat-value">{cdd}</div>
          <div className="stat-sub">{total > 0 ? Math.round(cdd / total * 100) : 0}% des agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CDD expirant (30j)</div>
          <div className="stat-value" style={{ color: expiring.length > 0 ? '#F59E0B' : 'var(--text)' }}>
            {expiring.length}
          </div>
          <div className="stat-sub">à renouveler</div>
        </div>
      </div>

      {expiring.length > 0 && (
        <div className="alert alert-warning">
          ⚠️ {expiring.length} contrat(s) CDD expirent dans les 30 prochains jours :&nbsp;
          {expiring.map(a => (
            <strong key={a.id}>{a.prenom} {a.nom} ({formatDate(a.date_fin_contrat)}) </strong>
          ))}
        </div>
      )}

      <div className="two-col">
        <div className="card">
          <div className="card-header"><h3>Répartition par poste</h3></div>
          <div className="card-body">
            {posteData.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucun agent enregistré</p>
              : posteData.map(p => (
                <div key={p.poste} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{p.poste}</span>
                    <span style={{ fontWeight: 600 }}>{p.count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.round(p.count / total * 100)}%` }}></div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Derniers agents ajoutés</h3></div>
          <div style={{ padding: 0 }}>
            {agents.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: 13, padding: 20 }}>Aucun agent</p>
              : agents.slice(-5).reverse().map(a => {
                const c = avatarColor(a.nom);
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div className="avatar" style={{ background: c.bg, color: c.fg }}>
                      {getInitials(a.nom, a.prenom)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.prenom} {a.nom}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.poste}</div>
                    </div>
                    <span className={`badge ${a.type_contrat === 'CDI' ? 'badge-blue' : 'badge-orange'}`}>
                      {a.type_contrat}
                    </span>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}