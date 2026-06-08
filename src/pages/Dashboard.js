import React from 'react';
import { age, formatDate, formatMontant, joursRestants } from '../lib/helpers';
import { avatarColor, getInitials } from '../lib/helpers';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['#00875A', '#0059B3', '#F59E0B', '#DC3545', '#8B5CF6', '#EC4899'];

export default function Dashboard({ agents, onOpenFiche }) {
  const total = agents.length;
  const cdi = agents.filter(a => a.type_contrat === 'CDI').length;
  const cdd = agents.filter(a => a.type_contrat === 'CDD').length;
  const actifs = agents.filter(a => a.statut === 'Actif').length;
  const hommes = agents.filter(a => a.sexe === 'Masculin').length;
  const femmes = agents.filter(a => a.sexe === 'Féminin').length;

  const masseSalariale = agents.reduce((s, a) => s + (parseFloat(a.salaire_brut) || 0), 0);

  const expiring = agents.filter(a => {
    if (a.type_contrat !== 'CDD' || !a.date_fin_contrat) return false;
    const diff = joursRestants(a.date_fin_contrat);
    return diff >= 0 && diff <= 30;
  });

  // Données graphique contrats
  const contratsData = [
    { name: 'CDI', value: cdi },
    { name: 'CDD', value: cdd },
  ].filter(d => d.value > 0);

  // Données graphique sexe
  const sexeData = [
    { name: 'Hommes', value: hommes },
    { name: 'Femmes', value: femmes },
  ].filter(d => d.value > 0);

  // Données par catégorie
  const cats = [...new Set(agents.map(a => a.categorie_socioprofessionnelle).filter(Boolean))];
  const catData = cats.map(c => ({
    name: c.length > 15 ? c.substring(0, 15) + '...' : c,
    count: agents.filter(a => a.categorie_socioprofessionnelle === c).length,
  })).sort((a, b) => b.count - a.count);

  // Données pyramide des âges
  const ageData = [
    { name: '< 30 ans', count: agents.filter(a => age(a.date_naissance) < 30).length },
    { name: '30-40 ans', count: agents.filter(a => { const g = age(a.date_naissance); return g >= 30 && g <= 40; }).length },
    { name: '40-50 ans', count: agents.filter(a => { const g = age(a.date_naissance); return g > 40 && g <= 50; }).length },
    { name: '> 50 ans', count: agents.filter(a => age(a.date_naissance) > 50).length },
  ];

  // Données par poste
  const postes = [...new Set(agents.map(a => a.poste))];
  const posteData = postes.map(p => ({
    poste: p.length > 15 ? p.substring(0, 15) + '...' : p,
    count: agents.filter(a => a.poste === p).length,
  })).sort((a, b) => b.count - a.count).slice(0, 6);

  // Ancienneté moyenne
  const ancMoyenne = agents.filter(a => a.date_embauche).reduce((s, a) => {
    return s + (new Date() - new Date(a.date_embauche)) / (1000 * 3600 * 24 * 365.25);
  }, 0) / (agents.filter(a => a.date_embauche).length || 1);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
          <p style={{ fontWeight: 600 }}>{label || payload[0].name}</p>
          <p style={{ color: 'var(--accent)' }}>{payload[0].value} agent(s)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Stats principales */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Total Agents</div>
          <div className="stat-value">{total}</div>
          <div className="stat-sub" style={{ color: 'var(--accent)' }}>{actifs} actifs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CDI</div>
          <div className="stat-value" style={{ color: '#0059B3' }}>{cdi}</div>
          <div className="stat-sub">{total > 0 ? Math.round(cdi / total * 100) : 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CDD</div>
          <div className="stat-value" style={{ color: '#F59E0B' }}>{cdd}</div>
          <div className="stat-sub">{total > 0 ? Math.round(cdd / total * 100) : 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Masse salariale</div>
          <div className="stat-value" style={{ fontSize: 16 }}>{Math.round(masseSalariale / 1000)}K</div>
          <div className="stat-sub">FCFA / mois</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ancienneté moy.</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{ancMoyenne.toFixed(1)}</div>
          <div className="stat-sub">années</div>
        </div>
      </div>

      {expiring.length > 0 && (
        <div className="alert alert-warning">
          ⚠️ {expiring.length} contrat(s) CDD expirent dans les 30 prochains jours :&nbsp;
          {expiring.map(a => (
            <strong key={a.id} style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => onOpenFiche && onOpenFiche(a.id)}>
              {a.prenom} {a.nom} ({formatDate(a.date_fin_contrat)})&nbsp;
            </strong>
          ))}
        </div>
      )}

      {/* Graphiques ligne 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Répartition contrats */}
        <div className="card">
          <div className="card-header"><h3>Répartition contrats</h3></div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            {contratsData.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucune donnée</p>
              : <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={contratsData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false} fontSize={11}>
                    {contratsData.map((_, i) => <Cell key={i} fill={['#0059B3', '#F59E0B'][i]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            }
          </div>
        </div>

        {/* Répartition sexe */}
        <div className="card">
          <div className="card-header"><h3>Répartition Hommes / Femmes</h3></div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            {sexeData.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucune donnée</p>
              : <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sexeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false} fontSize={11}>
                    {sexeData.map((_, i) => <Cell key={i} fill={['#0059B3', '#EC4899'][i]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            }
          </div>
        </div>

        {/* Pyramide des âges */}
        <div className="card">
          <div className="card-header"><h3>Pyramide des âges</h3></div>
          <div className="card-body">
            {agents.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucune donnée</p>
              : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ageData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#00875A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            }
          </div>
        </div>
      </div>

      {/* Graphiques ligne 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Répartition par poste */}
        <div className="card">
          <div className="card-header"><h3>Agents par poste</h3></div>
          <div className="card-body">
            {posteData.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucune donnée</p>
              : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={posteData} margin={{ left: 0 }}>
                  <XAxis dataKey="poste" fontSize={10} />
                  <YAxis fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#0059B3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            }
          </div>
        </div>

        {/* Répartition par catégorie */}
        <div className="card">
          <div className="card-header"><h3>Catégories socioprofessionnelles</h3></div>
          <div className="card-body">
            {catData.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucune donnée</p>
              : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={catData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }
          </div>
        </div>
      </div>

      {/* Derniers agents */}
      <div className="card">
        <div className="card-header">
          <h3>Derniers agents ajoutés</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Agent</th><th>Poste</th><th>Contrat</th>
                <th>Embauche</th><th>Salaire brut</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0
                ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>Aucun agent</td></tr>
                : agents.slice(-5).reverse().map(a => {
                  const c = avatarColor(a.nom);
                  return (
                    <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => onOpenFiche && onOpenFiche(a.id)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ background: c.bg, color: c.fg }}>{getInitials(a.nom, a.prenom)}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{a.prenom} {a.nom}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.matricule || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>{a.poste}</td>
                      <td><span className={`badge ${a.type_contrat === 'CDI' ? 'badge-blue' : 'badge-orange'}`}>{a.type_contrat}</span></td>
                      <td>{formatDate(a.date_embauche)}</td>
                      <td>{formatMontant(a.salaire_brut)}</td>
                      <td><span className={`badge ${a.statut === 'Actif' ? 'badge-green' : 'badge-gray'}`}>{a.statut || 'Actif'}</span></td>
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