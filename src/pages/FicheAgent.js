// FicheAgent.js - Complete agent profile page
// Displays personal info, contract history, leave and advance records

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  age, formatDate, formatMontant,
  getInitials, avatarColor, joursRestants,
} from '../lib/helpers';
import {
  generateAttestation, generateConge, generateAbsence,
  generateAvance, generateCDI, generateCDD,
} from '../lib/generatePDF';
import {
  ArrowLeft, FileText, Award, Palmtree,
  Clock, DollarSign, User, Phone, GraduationCap,
  Briefcase, Download, AlertTriangle,
} from 'lucide-react';
import {ChevronDown,
  FileBadge, CalendarCheck, CalendarOff, Wallet,
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

// ── Info row component ────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '9px 0',
      borderBottom: '1px solid #F5F5F5',
      fontSize: 13,
    }}>
      <span style={{ color: '#A3A3A3', fontWeight: 500, minWidth: 140 }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#0F0F0F', textAlign: 'right' }}>
        {value || '—'}
      </span>
    </div>
  );
}

// ── Accordion section card ────────────────────────────────
function SectionCard({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <div
        className="card-header"
        onClick={() => setOpen(!open)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: '#FEF3E2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={15} color="#E8920A" strokeWidth={2} />
          </div>
          <h3>{title}</h3>
        </div>
        <div style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          color: '#A3A3A3',
        }}>
          <ChevronDown size={16} strokeWidth={2} />
        </div>
      </div>
      {open && <div className="card-body">{children}</div>}
    </div>
  );
}

// ── Quick action button ───────────────────────────────────
function QuickAction({ label, icon: Icon, onClick }) {
  return (
    <button
      className="btn btn-secondary btn-sm"
      onClick={onClick}
      style={{ fontSize: 12, justifyContent: 'flex-start' }}
    >
      <Icon size={14} strokeWidth={2} />
      {label}
    </button>
  );
}

// ── Main FicheAgent component ─────────────────────────────
export default function FicheAgent({ agentId, entreprise, onBack }) {
  const [agent, setAgent] = useState(null);
  const [contrats, setContrats] = useState([]);
  const [conges, setConges] = useState([]);
  const [avances, setAvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // ── Load agent data ──
  useEffect(() => {
    if (agentId) loadAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  async function loadAgent() {
    setLoading(true);
    const [a, c, cg, av] = await Promise.all([
      supabase.from('agents').select('*').eq('id', agentId).single(),
      supabase.from('historique_contrats').select('*').eq('agent_id', agentId).order('date_debut', { ascending: false }),
      supabase.from('conges').select('*').eq('agent_id', agentId).order('created_at', { ascending: false }),
      supabase.from('avances').select('*').eq('agent_id', agentId).order('created_at', { ascending: false }),
    ]);
    setAgent(a.data);
    setContrats(c.data || []);
    setConges(cg.data || []);
    setAvances(av.data || []);
    setLoading(false);
  }

  // ── Generate PDF document ──
  async function generateDoc(type) {
    if (!entreprise || !entreprise.nom) {
      showToast('Veuillez configurer les informations de l\'entreprise', 'error');
      return;
    }
    try {
      if (type === 'cdi')         await generateCDI(agent, entreprise);
      else if (type === 'cdd')    await generateCDD(agent, entreprise);
      else if (type === 'attestation') await generateAttestation(agent, entreprise);
      else if (type === 'conge')  await generateConge(agent, entreprise);
      else if (type === 'absence') await generateAbsence(agent, entreprise);
      else if (type === 'avance') await generateAvance(agent, entreprise);
      showToast('PDF généré et téléchargé');
    } catch (e) {
      showToast('Erreur lors de la génération', 'error');
    }
  }

  // ── Compute leave balance ──
  function soldeConges() {
    if (!agent?.date_embauche) return 0;
    const mois = Math.floor(
      (new Date() - new Date(agent.date_embauche)) / (1000 * 3600 * 24 * 30.44)
    );
    const acquis = mois * 2.5;
    const pris = conges
      .filter(c => c.statut === 'Approuvé')
      .reduce((s, c) => s + (c.nombre_jours || 0), 0);
    return Math.max(0, Math.round(acquis - pris));
  }

  // ── Compute seniority ──
  function anciennete() {
    if (!agent?.date_embauche) return '—';
    const diff = new Date() - new Date(agent.date_embauche);
    const ans  = Math.floor(diff / (1000 * 3600 * 24 * 365.25));
    const mois = Math.floor((diff % (1000 * 3600 * 24 * 365.25)) / (1000 * 3600 * 24 * 30.44));
    if (ans === 0) return `${mois} mois`;
    return `${ans} an(s) et ${mois} mois`;
  }

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 300, color: '#A3A3A3', fontFamily: 'Poppins, sans-serif',
    }}>
      Chargement...
    </div>
  );

  if (!agent) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 300, color: '#A3A3A3', fontFamily: 'Poppins, sans-serif',
    }}>
      Agent introuvable
    </div>
  );

  const c = avatarColor(agent.nom);
  const jours = joursRestants(agent.date_fin_contrat);
  const isExpiring = agent.type_contrat === 'CDD' && jours !== null && jours <= 30 && jours >= 0;
  const totalAvances = avances
    .filter(a => a.statut === 'Approuvé')
    .reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);

  return (
    <div>

      {/* ── Back button ── */}
      <button
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: 20 }}
        onClick={onBack}
      >
        <ArrowLeft size={14} />
        Retour à la liste
      </button>

      {/* ── Agent header card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            gap: 20, flexWrap: 'wrap',
          }}>

            {/* Avatar */}
            <div style={{
              width: 68, height: 68, borderRadius: 18,
              background: c.bg, color: c.fg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, flexShrink: 0,
              fontFamily: 'Poppins, sans-serif',
            }}>
              {getInitials(agent.nom, agent.prenom)}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h2 style={{
                  fontSize: 20, fontWeight: 800, color: '#0F0F0F',
                  letterSpacing: '-0.3px', fontFamily: 'Poppins, sans-serif',
                }}>
                  {agent.prenom} {agent.nom}
                </h2>
                <span className={`badge ${agent.type_contrat === 'CDI' ? 'badge-blue' : 'badge-orange'}`}>
                  {agent.type_contrat}
                </span>
                <span className={`badge ${agent.statut === 'Actif' ? 'badge-green' : 'badge-gray'}`}>
                  {agent.statut || 'Actif'}
                </span>
                {isExpiring && (
                  <span className="badge badge-red">
                    <AlertTriangle size={10} style={{ marginRight: 3 }} />
                    Contrat expire bientôt
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#737373', fontFamily: 'Poppins, sans-serif' }}>
                {agent.poste}
                {agent.departement ? ` — ${agent.departement}` : ''}
                {agent.matricule ? ` | Matricule : ${agent.matricule}` : ''}
              </div>

              {/* Quick stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12, marginTop: 16,
              }}>
                {[
                  { label: 'Âge',               value: age(agent.date_naissance) !== '-' ? `${age(agent.date_naissance)} ans` : '—' },
                  { label: 'Ancienneté',         value: anciennete() },
                  { label: 'Solde congés',       value: `${soldeConges()} jours` },
                  { label: 'Avances approuvées', value: formatMontant(totalAvances) },
                ].map(s => (
                  <div key={s.label} style={{
                    background: '#FAFAFA', borderRadius: 10,
                    padding: '10px 14px', border: '1px solid #F0F0F0',
                  }}>
                    <div style={{ fontSize: 11, color: '#A3A3A3', fontWeight: 500, marginBottom: 2 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0F0F0F', fontFamily: 'Poppins, sans-serif' }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                Documents rapides
              </div>
              <QuickAction label="Attestation"    icon={FileBadge}    onClick={() => generateDoc('attestation')} />
                <QuickAction
                label={agent.type_contrat === 'CDI' ? 'Contrat CDI' : 'Contrat CDD'}
                icon={FileText}
                onClick={() => generateDoc(agent.type_contrat === 'CDI' ? 'cdi' : 'cdd')}
                />
                <QuickAction label="Congé"  icon={CalendarCheck} onClick={() => generateDoc('conge')} />
                <QuickAction label="Avance" icon={Wallet}         onClick={() => generateDoc('avance')} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        {[
          { id: 'info',     label: 'Informations',                    icon: User },
          { id: 'contrats', label: `Contrats (${contrats.length})`,   icon: FileText },
          { id: 'conges',   label: `Congés (${conges.length})`,       icon: Palmtree },
          { id: 'avances',  label: `Avances (${avances.length})`,     icon: DollarSign },
        ].map(t => {
          const Icon = t.icon;
          return (
            <div
              key={t.id}
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon size={14} strokeWidth={2} />
              {t.label}
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════
          TAB: Informations
      ════════════════════════════════ */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Personal info */}
          <SectionCard title="Informations personnelles" icon={User}>
            {[
              { label: 'Nom complet',           value: `${agent.prenom} ${agent.nom}` },
              { label: 'Sexe',                  value: agent.sexe },
              { label: 'Date de naissance',     value: formatDate(agent.date_naissance) },
              { label: 'Lieu de naissance',     value: agent.lieu_naissance },
              { label: 'Nationalité',           value: agent.nationalite },
              { label: 'Situation matrimoniale', value: agent.situation_matrimoniale },
              { label: 'Nombre d\'enfants',     value: agent.nombre_enfants },
              { label: 'NIN',                   value: agent.nin },
              { label: 'N° CNSS',               value: agent.cnss },
            ].map(r => <InfoRow key={r.label} label={r.label} value={r.value} />)}
          </SectionCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Contact */}
            <SectionCard title="Coordonnées" icon={Phone}>
              {[
                { label: 'Adresse',     value: agent.adresse },
                { label: 'Téléphone',   value: agent.telephone },
                { label: 'Email',       value: agent.email },
                { label: 'Urgence',     value: agent.urgence_nom },
                { label: 'Tél. urgence', value: agent.urgence_telephone },
              ].map(r => <InfoRow key={r.label} label={r.label} value={r.value} />)}
            </SectionCard>

            {/* Education */}
            <SectionCard title="Formation" icon={GraduationCap}>
              {[
                { label: 'Niveau d\'études', value: agent.niveau_etudes },
                { label: 'Diplôme',          value: agent.diplome },
                { label: 'Spécialité',       value: agent.specialite },
              ].map(r => <InfoRow key={r.label} label={r.label} value={r.value} />)}
            </SectionCard>

            {/* Job */}
            <SectionCard title="Poste & Contrat" icon={Briefcase}>
              {[
                { label: 'Poste',           value: agent.poste },
                { label: 'Département',     value: agent.departement },
                { label: 'Catégorie',       value: agent.categorie_socioprofessionnelle },
                { label: 'Type contrat',    value: agent.type_contrat },
                { label: 'Date embauche',   value: formatDate(agent.date_embauche) },
                { label: 'Date fin contrat', value: formatDate(agent.date_fin_contrat) },
                { label: 'Salaire brut',    value: formatMontant(agent.salaire_brut) },
              ].map(r => <InfoRow key={r.label} label={r.label} value={r.value} />)}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          TAB: Contrats
      ════════════════════════════════ */}
      {activeTab === 'contrats' && (
        <div className="card">
          <div className="card-header"><h3>Historique des contrats</h3></div>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Poste</th>
                <th>Date début</th>
                <th>Date fin</th>
                <th>Salaire brut</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {/* Current contract */}
              <tr style={{ background: '#FFFBF5' }}>
                <td>
                  <span className={`badge ${agent.type_contrat === 'CDI' ? 'badge-blue' : 'badge-orange'}`}>
                    {agent.type_contrat}
                  </span>
                </td>
                <td>
                  <strong>{agent.poste}</strong>
                  <span style={{
                    fontSize: 11, color: '#E8920A',
                    fontWeight: 600, marginLeft: 6,
                  }}>
                    (en cours)
                  </span>
                </td>
                <td style={{ color: '#737373' }}>{formatDate(agent.date_embauche)}</td>
                <td style={{ color: '#737373' }}>{formatDate(agent.date_fin_contrat) || '—'}</td>
                <td style={{ fontWeight: 600 }}>{formatMontant(agent.salaire_brut)}</td>
                <td><span className="badge badge-green">En cours</span></td>
              </tr>

              {contrats.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 30, color: '#A3A3A3' }}>
                    Aucun historique de contrat
                  </td>
                </tr>
              ) : contrats.map(c => (
                <tr key={c.id}>
                  <td>
                    <span className={`badge ${c.type_contrat === 'CDI' ? 'badge-blue' : 'badge-orange'}`}>
                      {c.type_contrat}
                    </span>
                  </td>
                  <td style={{ color: '#404040' }}>{c.poste}</td>
                  <td style={{ color: '#737373' }}>{formatDate(c.date_debut)}</td>
                  <td style={{ color: '#737373' }}>{formatDate(c.date_fin) || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{formatMontant(c.salaire_brut)}</td>
                  <td><span className="badge badge-gray">{c.statut}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ════════════════════════════════
          TAB: Congés
      ════════════════════════════════ */}
      {activeTab === 'conges' && (
        <div>
          {/* Leave stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 16, marginBottom: 20,
          }}>
            {[
              {
                label: 'Jours acquis',
                value: agent.date_embauche
                  ? Math.floor((new Date() - new Date(agent.date_embauche)) / (1000 * 3600 * 24 * 30.44) * 2.5)
                  : 0,
                icon: Award,
                color: '#2563EB',
              },
              {
                label: 'Jours pris',
                value: conges
                  .filter(c => c.statut === 'Approuvé')
                  .reduce((s, c) => s + (c.nombre_jours || 0), 0),
                icon: Clock,
                color: '#D97706',
              },
              {
                label: 'Solde disponible',
                value: soldeConges(),
                icon: Palmtree,
                color: '#16A34A',
              },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                    <div className="stat-sub">jours</div>
                  </div>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${s.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <s.icon size={18} color={s.color} strokeWidth={2} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Leave history */}
          <div className="card">
            <div className="card-header"><h3>Historique des congés</h3></div>
            <table>
              <thead>
                <tr>
                  <th>Du</th><th>Au</th><th>Jours</th><th>Motif</th><th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {conges.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 30, color: '#A3A3A3' }}>
                      Aucun congé enregistré
                    </td>
                  </tr>
                ) : conges.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: '#737373' }}>{formatDate(c.date_debut)}</td>
                    <td style={{ color: '#737373' }}>{formatDate(c.date_fin)}</td>
                    <td style={{ fontWeight: 600 }}>{c.nombre_jours || '—'}</td>
                    <td style={{ color: '#404040' }}>{c.motif || '—'}</td>
                    <td>
                      <span className={`badge ${
                        c.statut === 'Approuvé' ? 'badge-green' :
                        c.statut === 'Refusé'   ? 'badge-red'   : 'badge-orange'
                      }`}>
                        {c.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          TAB: Avances
      ════════════════════════════════ */}
      {activeTab === 'avances' && (
        <div>
          {/* Advance stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 16, marginBottom: 20,
          }}>
            {[
              { label: 'Total demandes', value: avances.length,                                               color: '#E8920A', icon: FileText },
              { label: 'Total approuvé', value: formatMontant(totalAvances),                                  color: '#16A34A', icon: DollarSign },
              { label: 'En attente',     value: avances.filter(a => a.statut === 'En attente').length,        color: '#D97706', icon: Clock },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color: s.color, fontSize: 20 }}>{s.value}</div>
                  </div>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${s.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <s.icon size={18} color={s.color} strokeWidth={2} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Advance history */}
          <div className="card">
            <div className="card-header"><h3>Historique des avances</h3></div>
            <table>
              <thead>
                <tr><th>Date</th><th>Montant</th><th>Motif</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {avances.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: 30, color: '#A3A3A3' }}>
                      Aucune avance enregistrée
                    </td>
                  </tr>
                ) : avances.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: '#737373' }}>{formatDate(a.date_demande)}</td>
                    <td style={{ fontWeight: 700, color: '#0F0F0F' }}>{formatMontant(a.montant)}</td>
                    <td style={{ color: '#404040' }}>{a.motif || '—'}</td>
                    <td>
                      <span className={`badge ${
                        a.statut === 'Approuvé' ? 'badge-green' :
                        a.statut === 'Refusé'   ? 'badge-red'   : 'badge-orange'
                      }`}>
                        {a.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}