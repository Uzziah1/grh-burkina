import React, { useState } from 'react';
import {
  generateAttestation,
  generateConge,
  generateAbsence,
  generateAvance,
  generateCDI,
  generateCDD,
} from '../lib/generatePDF';

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${type === 'error' ? '#DC3545' : '#1C2B3A'};color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;font-family:inherit`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

export default function Documents({ agents, entreprise }) {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [search, setSearch] = useState('');

  const filtered = agents.filter(a => {
    const name = `${a.prenom} ${a.nom}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const agent = agents.find(a => a.id === selectedAgent);

  async function handleGenerate(type) {
    if (!agent) { showToast('Veuillez sélectionner un agent', 'error'); return; }
    if (!entreprise || !entreprise.nom) {
      showToast('Veuillez d\'abord remplir les informations de l\'entreprise', 'error');
      return;
    }
    try {
      if (type === 'cdi') await generateCDI(agent, entreprise);
      else if (type === 'cdd') await generateCDD(agent, entreprise);
      else if (type === 'attestation') await generateAttestation(agent, entreprise);
      else if (type === 'conge') await generateConge(agent, entreprise);
      else if (type === 'absence') await generateAbsence(agent, entreprise);
      else if (type === 'avance') await generateAvance(agent, entreprise);
      showToast('PDF généré et téléchargé avec succès');
    } catch (e) {
      showToast('Erreur lors de la génération du PDF', 'error');
    }
  }

  const docs = [
    { type: 'cdi', icon: '📋', titre: 'Contrat CDI', desc: 'Contrat à durée indéterminée', color: '#DBEAFE' },
    { type: 'cdd', icon: '📋', titre: 'Contrat CDD', desc: 'Contrat à durée déterminée', color: '#FEF3C7' },
    { type: 'attestation', icon: '🏆', titre: 'Attestation de travail', desc: 'Certifie l\'emploi de l\'agent', color: '#D1FAE5' },
    { type: 'conge', icon: '🌴', titre: 'Autorisation de congé', desc: 'Validation des congés payés', color: '#EDE9FE' },
    { type: 'absence', icon: '📅', titre: 'Autorisation d\'absence', desc: 'Absence ponctuelle', color: '#FCE7F3' },
    { type: 'avance', icon: '💰', titre: 'Avance sur salaire', desc: 'Demande d\'avance', color: '#FEE2E2' },
  ];

  return (
    <div>
      {/* Avertissement si entreprise non configurée */}
      {(!entreprise || !entreprise.nom) && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          ⚠️ Les informations de l'entreprise ne sont pas configurées.
          Allez dans <strong>Entreprise</strong> pour les renseigner avant de générer des documents.
        </div>
      )}

      {/* Sélection agent */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3>Sélection de l'agent</h3>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Sélectionnez un agent pour générer ses documents administratifs en PDF.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className="search-input"
              placeholder="🔍 Rechercher un agent..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <select
              className="filter-select"
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              style={{ flex: 2 }}
            >
              <option value="">-- Sélectionner un agent --</option>
              {filtered.map(a => (
                <option key={a.id} value={a.id}>
                  {a.prenom} {a.nom} — {a.poste} ({a.type_contrat})
                </option>
              ))}
            </select>
          </div>

          {agent && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: 'var(--bg)', borderRadius: 8,
              fontSize: 13, display: 'flex', gap: 24, flexWrap: 'wrap'
            }}>
              <span><strong>Agent :</strong> {agent.prenom} {agent.nom}</span>
              <span><strong>Poste :</strong> {agent.poste}</span>
              <span><strong>Contrat :</strong> {agent.type_contrat}</span>
              <span><strong>Département :</strong> {agent.departement || '-'}</span>
              {agent.date_embauche && (
                <span><strong>Embauché le :</strong> {new Date(agent.date_embauche).toLocaleDateString('fr-FR')}</span>
              )}
              {agent.salaire_brut && (
                <span><strong>Salaire brut :</strong> {parseInt(agent.salaire_brut).toLocaleString('fr-FR')} FCFA</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grille documents */}
      {!agent ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📄</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            Sélectionnez un agent
          </p>
          <p style={{ fontSize: 13 }}>
            Choisissez un agent dans la liste ci-dessus pour générer ses documents
          </p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 16 }}>
            Documents disponibles pour {agent.prenom} {agent.nom}
          </div>
          <div className="doc-grid">
            {docs.map(d => (
              <div
                key={d.type}
                className="doc-card"
                onClick={() => handleGenerate(d.type)}
                style={{ borderTop: `4px solid ${d.color.replace('FE', 'E').replace('DB', 'B').replace('D1', 'A').replace('ED', 'C').replace('FC', 'D')}` }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: d.color, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, margin: '0 auto 12px'
                }}>
                  {d.icon}
                </div>
                <h4>{d.titre}</h4>
                <p style={{ marginTop: 4 }}>{d.desc}</p>
                <div style={{
                  marginTop: 12, fontSize: 11, color: 'var(--accent)',
                  fontWeight: 600, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 4
                }}>
                  ⬇ Télécharger PDF
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}