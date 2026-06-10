// Dashboard.js - Main dashboard page
// Displays key HR metrics, charts and recent activity

import React from 'react';
import { age, formatDate, formatMontant, joursRestants } from '../lib/helpers';
import { avatarColor, getInitials } from '../lib/helpers';
import {
  Users, FileText, AlertTriangle, TrendingUp,
  Clock, DollarSign, UserCheck, Eye,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Color palette for charts ──────────────────────────────
const CHART_COLORS = ['#E8920A', '#0F0F0F', '#16A34A', '#2563EB', '#8B5CF6', '#EC4899'];

// ── Custom tooltip for charts ─────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#fff',
        border: '1px solid #E5E5E5',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        fontFamily: 'Poppins, sans-serif',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}>
        <p style={{ fontWeight: 600, color: '#0F0F0F', marginBottom: 2 }}>
          {label || payload[0].name}
        </p>
        <p style={{ color: '#E8920A', fontWeight: 600 }}>
          {payload[0].value} agent(s)
        </p>
      </div>
    );
  }
  return null;
}

// ── Stat card component ───────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, onClick }) {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color: color || '#0F0F0F' }}>{value}</div>
          {sub && <div className="stat-sub">{sub}</div>}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: color ? `${color}15` : '#F5F5F5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} color={color || '#737373'} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard component ──────────────────────────────
export default function Dashboard({ agents, onOpenFiche }) {

  // ── Compute statistics ──
  const total     = agents.length;
  const cdi       = agents.filter(a => a.type_contrat === 'CDI').length;
  const cdd       = agents.filter(a => a.type_contrat === 'CDD').length;
  const actifs    = agents.filter(a => a.statut === 'Actif').length;
  const hommes    = agents.filter(a => a.sexe === 'Masculin').length;
  const femmes    = agents.filter(a => a.sexe === 'Féminin').length;
  const masseSalariale = agents.reduce((s, a) => s + (parseFloat(a.salaire_brut) || 0), 0);

  // ── Expiring contracts ──
  const expiring = agents.filter(a => {
    if (a.type_contrat !== 'CDD' || !a.date_fin_contrat) return false;
    const diff = joursRestants(a.date_fin_contrat);
    return diff >= 0 && diff <= 30;
  });

  // ── Average seniority ──
  const ancMoyenne = agents.filter(a => a.date_embauche).reduce((s, a) => {
    return s + (new Date() - new Date(a.date_embauche)) / (1000 * 3600 * 24 * 365.25);
  }, 0) / (agents.filter(a => a.date_embauche).length || 1);

  // ── Chart data ──
  const contratsData = [
    { name: 'CDI', value: cdi },
    { name: 'CDD', value: cdd },
  ].filter(d => d.value > 0);

  const sexeData = [
    { name: 'Hommes', value: hommes },
    { name: 'Femmes', value: femmes },
  ].filter(d => d.value > 0);

  const ageData = [
    { name: '< 30 ans',  count: agents.filter(a => age(a.date_naissance) < 30).length },
    { name: '30-40 ans', count: agents.filter(a => { const g = age(a.date_naissance); return g >= 30 && g <= 40; }).length },
    { name: '40-50 ans', count: agents.filter(a => { const g = age(a.date_naissance); return g > 40 && g <= 50; }).length },
    { name: '> 50 ans',  count: agents.filter(a => age(a.date_naissance) > 50).length },
  ];

  const postes = [...new Set(agents.map(a => a.poste))];
  const posteData = postes
    .map(p => ({
      poste: p.length > 14 ? p.substring(0, 14) + '…' : p,
      count: agents.filter(a => a.poste === p).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const cats = [...new Set(agents.map(a => a.categorie_socioprofessionnelle).filter(Boolean))];
  const catData = cats
    .map(c => ({
      name: c.length > 16 ? c.substring(0, 16) + '…' : c,
      count: agents.filter(a => a.categorie_socioprofessionnelle === c).length,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div>

      {/* ── Alert: expiring contracts ── */}
      {expiring.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>{expiring.length} contrat(s) CDD</strong> expirent dans les 30 prochains jours :&nbsp;
            {expiring.map(a => (
              <span
                key={a.id}
                onClick={() => onOpenFiche && onOpenFiche(a.id)}
                style={{
                  cursor: 'pointer', textDecoration: 'underline',
                  fontWeight: 600, marginRight: 8,
                }}
              >
                {a.prenom} {a.nom} ({formatDate(a.date_fin_contrat)})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 16,
        marginBottom: 24,
      }}>
        <StatCard
          label="Total agents"
          value={total}
          sub={`${actifs} actifs`}
          icon={Users}
          color="#E8920A"
        />
        <StatCard
          label="Contrats CDI"
          value={cdi}
          sub={`${total > 0 ? Math.round(cdi / total * 100) : 0}% des agents`}
          icon={UserCheck}
          color="#2563EB"
        />
        <StatCard
          label="Contrats CDD"
          value={cdd}
          sub={`${total > 0 ? Math.round(cdd / total * 100) : 0}% des agents`}
          icon={FileText}
          color="#D97706"
        />
        <StatCard
          label="Masse salariale"
          value={`${Math.round(masseSalariale / 1000)}K`}
          sub="FCFA / mois"
          icon={DollarSign}
          color="#16A34A"
        />
        <StatCard
          label="Ancienneté moy."
          value={`${ancMoyenne.toFixed(1)} ans`}
          sub="par agent"
          icon={Clock}
          color="#8B5CF6"
        />
      </div>

      {/* ── Charts row 1 ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 20,
        marginBottom: 20,
      }}>

        {/* Contracts pie */}
        <div className="card">
          <div className="card-header">
            <h3>Répartition contrats</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            {contratsData.length === 0
              ? <p style={{ color: '#A3A3A3', fontSize: 13 }}>Aucune donnée</p>
              : <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={contratsData}
                    cx="50%" cy="50%"
                    outerRadius={65}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}
                    fontSize={11}
                    fontFamily="Poppins"
                  >
                    {contratsData.map((_, i) => (
                      <Cell key={i} fill={['#E8920A', '#0F0F0F'][i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            }
          </div>
        </div>

        {/* Gender pie */}
        <div className="card">
          <div className="card-header">
            <h3>Hommes / Femmes</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            {sexeData.length === 0
              ? <p style={{ color: '#A3A3A3', fontSize: 13 }}>Aucune donnée</p>
              : <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={sexeData}
                    cx="50%" cy="50%"
                    outerRadius={65}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}
                    fontSize={11}
                    fontFamily="Poppins"
                  >
                    {sexeData.map((_, i) => (
                      <Cell key={i} fill={['#2563EB', '#EC4899'][i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            }
          </div>
        </div>

        {/* Age pyramid */}
        <div className="card">
          <div className="card-header">
            <h3>Pyramide des âges</h3>
          </div>
          <div className="card-body">
            {agents.length === 0
              ? <p style={{ color: '#A3A3A3', fontSize: 13 }}>Aucune donnée</p>
              : <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ageData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" fontSize={10} fontFamily="Poppins" tick={{ fill: '#A3A3A3' }} />
                  <YAxis type="category" dataKey="name" fontSize={10} fontFamily="Poppins" width={70} tick={{ fill: '#737373' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#E8920A" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            }
          </div>
        </div>
      </div>

      {/* ── Charts row 2 ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        marginBottom: 20,
      }}>

        {/* By post */}
        <div className="card">
          <div className="card-header"><h3>Agents par poste</h3></div>
          <div className="card-body">
            {posteData.length === 0
              ? <p style={{ color: '#A3A3A3', fontSize: 13 }}>Aucune donnée</p>
              : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={posteData} margin={{ bottom: 10 }}>
                  <XAxis dataKey="poste" fontSize={10} fontFamily="Poppins" tick={{ fill: '#737373' }} />
                  <YAxis fontSize={10} fontFamily="Poppins" tick={{ fill: '#A3A3A3' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#0F0F0F" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            }
          </div>
        </div>

        {/* By category */}
        <div className="card">
          <div className="card-header"><h3>Catégories socioprofessionnelles</h3></div>
          <div className="card-body">
            {catData.length === 0
              ? <p style={{ color: '#A3A3A3', fontSize: 13 }}>Aucune donnée</p>
              : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" fontSize={10} fontFamily="Poppins" tick={{ fill: '#A3A3A3' }} />
                  <YAxis type="category" dataKey="name" fontSize={10} fontFamily="Poppins" width={120} tick={{ fill: '#737373' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {catData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }
          </div>
        </div>
      </div>

      {/* ── Recent agents table ── */}
      <div className="card">
        <div className="card-header">
          <h3>Derniers agents ajoutés</h3>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: '#A3A3A3',
            fontFamily: 'Poppins, sans-serif',
          }}>
            <TrendingUp size={14} />
            5 derniers
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Poste</th>
                <th>Contrat</th>
                <th>Embauche</th>
                <th>Salaire brut</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#A3A3A3' }}>
                    Aucun agent enregistré
                  </td>
                </tr>
              ) : agents.slice(-5).reverse().map(a => {
                const c = avatarColor(a.nom);
                return (
                  <tr
                    key={a.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onOpenFiche && onOpenFiche(a.id)}
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
                    <td>
                      <span className={`badge ${a.type_contrat === 'CDI' ? 'badge-blue' : 'badge-orange'}`}>
                        {a.type_contrat}
                      </span>
                    </td>
                    <td style={{ color: '#737373' }}>{formatDate(a.date_embauche)}</td>
                    <td style={{ fontWeight: 600, color: '#0F0F0F' }}>
                      {formatMontant(a.salaire_brut)}
                    </td>
                    <td>
                      <span className={`badge ${a.statut === 'Actif' ? 'badge-green' : 'badge-gray'}`}>
                        {a.statut || 'Actif'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={e => { e.stopPropagation(); onOpenFiche && onOpenFiche(a.id); }}
                      >
                        <Eye size={13} />
                        Voir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}