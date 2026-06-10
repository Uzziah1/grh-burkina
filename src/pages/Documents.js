// Documents.js - Document generation page
// Features: agent selection, PDF generation for all document types

import React, { useState } from 'react';
import {
  generateAttestation, generateConge, generateAbsence,
  generateAvance, generateCDI, generateCDD,
} from '../lib/generatePDF';
import {
  Search, Download, FileText, Award,
  CalendarCheck, CalendarOff, Wallet, AlertCircle,
  ChevronRight, User,
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

// ── Document types ────────────────────────────────────────
const DOC_TYPES = [
  {
    type:  'cdi',
    titre: 'Contrat CDI',
    desc:  'Contrat à durée indéterminée',
    icon:  FileText,
    color: '#2563EB',
  },
  {
    type:  'cdd',
    titre: 'Contrat CDD',
    desc:  'Contrat à durée déterminée',
    icon:  FileText,
    color: '#D97706',
  },
  {
    type:  'attestation',
    titre: 'Attestation de travail',
    desc:  'Certifie l\'emploi de l\'agent',
    icon:  Award,
    color: '#16A34A',
  },
  {
    type:  'conge',
    titre: 'Autorisation de congé',
    desc:  'Validation des congés payés',
    icon:  CalendarCheck,
    color: '#8B5CF6',
  },
  {
    type:  'absence',
    titre: 'Autorisation d\'absence',
    desc:  'Absence ponctuelle',
    icon:  CalendarOff,
    color: '#EC4899',
  },
  {
    type:  'avance',
    titre: 'Avance sur salaire',
    desc:  'Demande d\'avance sur salaire',
    icon:  Wallet,
    color: '#E8920A',
  },
];

// ── Document card component ───────────────────────────────
function DocCard({ doc, onClick, disabled }) {
  const Icon = doc.icon;
  return (
    <div
      onClick={disabled ? null : onClick}
      style={{
        background: '#FFFFFF',
        border: '1.5px solid #E5E5E5',
        borderRadius: 14,
        padding: '20px 18px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 10,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.borderColor = doc.color;
          e.currentTarget.style.boxShadow = `0 4px 16px ${doc.color}25`;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          e.currentTarget.style.borderColor = '#E5E5E5';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {/* Icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: `${doc.color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={24} color={doc.color} strokeWidth={1.8} />
      </div>

      {/* Title */}
      <div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: '#0F0F0F',
          marginBottom: 3, fontFamily: 'Poppins, sans-serif',
        }}>
          {doc.titre}
        </div>
        <div style={{ fontSize: 11, color: '#A3A3A3' }}>
          {doc.desc}
        </div>
      </div>

      {/* Download label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 600,
        color: disabled ? '#A3A3A3' : doc.color,
        marginTop: 'auto',
      }}>
        <Download size={12} />
        Générer PDF
      </div>
    </div>
  );
}

// ── Main Documents component ──────────────────────────────
export default function Documents({ agents, entreprise }) {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(null);

  // ── Filter agents by search ──
  const filtered = agents.filter(a => {
    const name = `${a.prenom} ${a.nom}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const agent = agents.find(a => a.id === selectedAgent);

  // ── Generate PDF document ──
  async function handleGenerate(type) {
    if (!agent) {
      showToast('Veuillez sélectionner un agent', 'error');
      return;
    }
    if (!entreprise || !entreprise.nom) {
      showToast('Veuillez d\'abord configurer les informations de l\'entreprise', 'error');
      return;
    }
    setGenerating(type);
    try {
      if (type === 'cdi')         await generateCDI(agent, entreprise);
      else if (type === 'cdd')    await generateCDD(agent, entreprise);
      else if (type === 'attestation') await generateAttestation(agent, entreprise);
      else if (type === 'conge')  await generateConge(agent, entreprise);
      else if (type === 'absence') await generateAbsence(agent, entreprise);
      else if (type === 'avance') await generateAvance(agent, entreprise);
      showToast('PDF généré et téléchargé avec succès');
    } catch (e) {
      showToast('Erreur lors de la génération du PDF', 'error');
    }
    setGenerating(null);
  }

  return (
    <div>

      {/* ── Warning: no company info ── */}
      {(!entreprise || !entreprise.nom) && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
          <div>
            Les informations de l'entreprise ne sont pas configurées.
            Rendez-vous dans <strong>Paramètres → Entreprise</strong> pour les renseigner
            avant de générer des documents.
          </div>
        </div>
      )}

      {/* ── Agent selection card ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: '#FEF3E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={15} color="#E8920A" strokeWidth={2} />
            </div>
            <h3>Sélection de l'agent</h3>
          </div>
        </div>
        <div className="card-body">
          <p style={{
            fontSize: 13, color: '#A3A3A3',
            marginBottom: 16, fontFamily: 'Poppins, sans-serif',
          }}>
            Sélectionnez un agent pour générer ses documents administratifs en PDF.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>

            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={15} style={{
                position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', color: '#A3A3A3',
              }} />
              <input
                className="search-input"
                placeholder="Rechercher un agent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 36, width: '100%' }}
              />
            </div>

            {/* Agent select */}
            <select
              className="filter-select"
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              style={{ flex: 2, minWidth: 200 }}
            >
              <option value="">— Sélectionner un agent —</option>
              {filtered.map(a => (
                <option key={a.id} value={a.id}>
                  {a.prenom} {a.nom} — {a.poste} ({a.type_contrat})
                </option>
              ))}
            </select>
          </div>

          {/* Selected agent info */}
          {agent && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: '#FFFBF5',
              border: '1px solid #FDDBA0',
              borderRadius: 10,
              display: 'flex', alignItems: 'center',
              gap: 12, flexWrap: 'wrap',
            }}>
              <ChevronRight size={14} color="#E8920A" />
              {[
                { label: 'Agent',       value: `${agent.prenom} ${agent.nom}` },
                { label: 'Poste',       value: agent.poste },
                { label: 'Contrat',     value: agent.type_contrat },
                { label: 'Département', value: agent.departement || '—' },
                ...(agent.date_embauche ? [{
                  label: 'Embauché le',
                  value: new Date(agent.date_embauche).toLocaleDateString('fr-FR'),
                }] : []),
                ...(agent.salaire_brut ? [{
                  label: 'Salaire brut',
                  value: `${parseInt(agent.salaire_brut).toLocaleString('fr-FR')} FCFA`,
                }] : []),
              ].map(info => (
                <div key={info.label} style={{ fontSize: 12, fontFamily: 'Poppins, sans-serif' }}>
                  <span style={{ color: '#A3A3A3' }}>{info.label} : </span>
                  <span style={{ fontWeight: 600, color: '#0F0F0F' }}>{info.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Document grid ── */}
      {!agent ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: '#A3A3A3',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: '#F5F5F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <FileText size={32} color="#D4D4D4" strokeWidth={1.5} />
          </div>
          <p style={{
            fontSize: 15, fontWeight: 600,
            color: '#737373', marginBottom: 6,
            fontFamily: 'Poppins, sans-serif',
          }}>
            Aucun agent sélectionné
          </p>
          <p style={{ fontSize: 13 }}>
            Choisissez un agent dans la liste ci-dessus pour générer ses documents
          </p>
        </div>
      ) : (
        <>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: '#737373', marginBottom: 16,
            fontFamily: 'Poppins, sans-serif',
          }}>
            Documents disponibles pour <span style={{ color: '#0F0F0F' }}>
              {agent.prenom} {agent.nom}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}>
            {DOC_TYPES.map(d => (
              <DocCard
                key={d.type}
                doc={d}
                disabled={generating === d.type}
                onClick={() => handleGenerate(d.type)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}