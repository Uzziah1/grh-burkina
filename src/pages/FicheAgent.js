import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { age, formatDate, formatMontant, getInitials, avatarColor, joursRestants } from '../lib/helpers';
import {
  generateAttestation, generateConge, generateAbsence,
  generateAvance, generateCDI, generateCDD,
} from '../lib/generatePDF';

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${type === 'error' ? '#DC3545' : '#1C2B3A'};color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;font-family:inherit`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

export default function FicheAgent({ agentId, entreprise, onBack }) {
  const [agent, setAgent] = useState(null);
  const [contrats, setContrats] = useState([]);
  const [conges, setConges] = useState([]);
  const [avances, setAvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => { loadAgent(); }, [agentId]);

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

  function generateDoc(type) {
    if (!entreprise || !entreprise.nom) {
      showToast('Veuillez configurer les informations de l\'entreprise', 'error');
      return;
    }
    try {
      if (type === 'cdi') generateCDI(agent, entreprise);
      else if (type === 'cdd') generateCDD(agent, entreprise);
      else if (type === 'attestation') generateAttestation(agent, entreprise);
      else if (type === 'conge') generateConge(agent, entreprise);
      else if (type === 'absence') generateAbsence(agent, entreprise);
      else if (type === 'avance') generateAvance(agent, entreprise);
      showToast('PDF généré et téléchargé');
    } catch (e) {
      showToast('Erreur lors de la génération', 'error');
    }
  }

  // Calcul solde congés
  function soldeConges() {
    if (!agent?.date_embauche) return 0;
    const mois = Math.floor((new Date() - new Date(agent.date_embauche)) / (1000 * 3600 * 24 * 30.44));
    const acquis = mois * 2.5;
    const pris = conges.filter(c => c.statut === 'Approuvé').reduce((s, c) => s + (c.nombre_jours || 0), 0);
    return Math.max(0, Math.round(acquis - pris));
  }

  function anciennete() {
    if (!agent?.date_embauche) return '-';
    const diff = new Date() - new Date(agent.date_embauche);
    const ans = Math.floor(diff / (1000 * 3600 * 24 * 365.25));
    const mois = Math.floor((diff % (1000 * 3600 * 24 * 365.25)) / (1000 * 3600 * 24 * 30.44));
    if (ans === 0) return `${mois} mois`;
    return `${ans} an(s) et ${mois} mois`;
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Chargement...</div>;
  if (!agent) return <div style={{ padding: 40, color: 'var(--muted)' }}>Agent introuvable</div>;

  const c = avatarColor(agent.nom);
  const jours = joursRestants(agent.date_fin_contrat);
  const isExpiring = agent.type_contrat === 'CDD' && jours !== null && jours <= 30 && jours >= 0;
  const totalAvances = avances.filter(a => a.statut === 'Approuvé').reduce((s, a) => s + (parseFloat(a.montant) || 0), 0);

  return (
    <div>
      {/* Bouton retour */}
      <button className="btn btn-secondary" style={{ marginBottom: 20 }} onClick={onBack}>
        ← Retour à la liste
      </button>

      {/* En-tête agent */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, background: c.bg, color: c.fg }}>
              {getInitials(agent.nom, agent.prenom)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{agent.prenom} {agent.nom}</h2>
                <span className={`badge ${agent.type_contrat === 'CDI' ? 'badge-blue' : 'badge-orange'}`}>
                  {agent.type_contrat}
                </span>
                <span className={`badge ${agent.statut === 'Actif' ? 'badge-green' : 'badge-gray'}`}>
                  {agent.statut || 'Actif'}
                </span>
                {isExpiring && <span className="badge badge-red">⚠ Contrat expire bientôt</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {agent.poste} {agent.departement ? `— ${agent.departement}` : ''}
                {agent.matricule ? ` | Matricule : ${agent.matricule}` : ''}
              </div>
            </div>

            {/* Actions rapides */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { type: 'attestation', label: '🏆 Attestation' },
                { type: agent.type_contrat === 'CDI' ? 'cdi' : 'cdd', label: '📋 Contrat' },
                { type: 'conge', label: '🌴 Congé' },
                { type: 'avance', label: '💰 Avance' },
              ].map(d => (
                <button key={d.type} className="btn btn-secondary btn-sm" onClick={() => generateDoc(d.type)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats rapides */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
            {[
              { label: 'Âge', value: age(agent.date_naissance) + ' ans' },
              { label: 'Ancienneté', value: anciennete() },
              { label: 'Solde congés', value: soldeConges() + ' jours' },
              { label: 'Avances approuvées', value: totalAvances.toLocaleString('fr-FR') + ' FCFA' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="tabs">
        {[
          { id: 'info', label: '👤 Informations' },
          { id: 'contrats', label: `📄 Contrats (${contrats.length})` },
          { id: 'conges', label: `🌴 Congés (${conges.length})` },
          { id: 'avances', label: `💰 Avances (${avances.length})` },
        ].map(t => (
          <div
            key={t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* Onglet Informations */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-header"><h3>👤 Informations personnelles</h3></div>
            <div className="card-body">
              {[
                { label: 'Nom complet', value: `${agent.prenom} ${agent.nom}` },
                { label: 'Sexe', value: agent.sexe },
                { label: 'Date de naissance', value: formatDate(agent.date_naissance) },
                { label: 'Lieu de naissance', value: agent.lieu_naissance },
                { label: 'Nationalité', value: agent.nationalite },
                { label: 'Situation matrimoniale', value: agent.situation_matrimoniale },
                { label: 'Nombre d\'enfants', value: agent.nombre_enfants },
                { label: 'NIN', value: agent.nin },
                { label: 'N° CNSS', value: agent.cnss },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{r.label}</span>
                  <span style={{ fontWeight: 600 }}>{r.value || '-'}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header"><h3>📞 Coordonnées</h3></div>
              <div className="card-body">
                {[
                  { label: 'Adresse', value: agent.adresse },
                  { label: 'Téléphone', value: agent.telephone },
                  { label: 'Email', value: agent.email },
                  { label: 'Urgence', value: agent.urgence_nom },
                  { label: 'Tél. urgence', value: agent.urgence_telephone },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{r.label}</span>
                    <span style={{ fontWeight: 600 }}>{r.value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>💼 Poste & Contrat</h3></div>
              <div className="card-body">
                {[
                  { label: 'Poste', value: agent.poste },
                  { label: 'Département', value: agent.departement },
                  { label: 'Catégorie', value: agent.categorie_socioprofessionnelle },
                  { label: 'Type contrat', value: agent.type_contrat },
                  { label: 'Date embauche', value: formatDate(agent.date_embauche) },
                  { label: 'Date fin contrat', value: formatDate(agent.date_fin_contrat) },
                  { label: 'Salaire brut', value: formatMontant(agent.salaire_brut) },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{r.label}</span>
                    <span style={{ fontWeight: 600 }}>{r.value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>🎓 Formation</h3></div>
              <div className="card-body">
                {[
                  { label: 'Niveau d\'études', value: agent.niveau_etudes },
                  { label: 'Diplôme', value: agent.diplome },
                  { label: 'Spécialité', value: agent.specialite },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{r.label}</span>
                    <span style={{ fontWeight: 600 }}>{r.value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Contrats */}
      {activeTab === 'contrats' && (
        <div className="card">
          <div className="card-header">
            <h3>Historique des contrats</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Type</th><th>Poste</th><th>Date début</th>
                <th>Date fin</th><th>Salaire brut</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {/* Contrat actuel */}
              <tr style={{ background: '#F0FDF4' }}>
                <td><span className={`badge ${agent.type_contrat === 'CDI' ? 'badge-blue' : 'badge-orange'}`}>{agent.type_contrat}</span></td>
                <td><strong>{agent.poste}</strong> <span style={{ fontSize: 11, color: 'var(--accent)' }}>(actuel)</span></td>
                <td>{formatDate(agent.date_embauche)}</td>
                <td>{formatDate(agent.date_fin_contrat) || '—'}</td>
                <td>{formatMontant(agent.salaire_brut)}</td>
                <td><span className="badge badge-green">En cours</span></td>
              </tr>
              {contrats.length === 0
                ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>Aucun historique</td></tr>
                : contrats.map(c => (
                  <tr key={c.id}>
                    <td><span className={`badge ${c.type_contrat === 'CDI' ? 'badge-blue' : 'badge-orange'}`}>{c.type_contrat}</span></td>
                    <td>{c.poste}</td>
                    <td>{formatDate(c.date_debut)}</td>
                    <td>{formatDate(c.date_fin) || '—'}</td>
                    <td>{formatMontant(c.salaire_brut)}</td>
                    <td><span className="badge badge-gray">{c.statut}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Onglet Congés */}
      {activeTab === 'conges' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-label">Jours acquis</div>
              <div className="stat-value">
                {agent.date_embauche ? Math.floor((new Date() - new Date(agent.date_embauche)) / (1000 * 3600 * 24 * 30.44) * 2.5) : 0}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Jours pris</div>
              <div className="stat-value">
                {conges.filter(c => c.statut === 'Approuvé').reduce((s, c) => s + (c.nombre_jours || 0), 0)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Solde disponible</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{soldeConges()}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Historique des contrats</h3></div>
            <table>
              <thead>
                <tr><th>Du</th><th>Au</th><th>Jours</th><th>Motif</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {conges.length === 0
                  ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>Aucun congé enregistré</td></tr>
                  : conges.map(c => (
                    <tr key={c.id}>
                      <td>{formatDate(c.date_debut)}</td>
                      <td>{formatDate(c.date_fin)}</td>
                      <td>{c.nombre_jours || '-'}</td>
                      <td>{c.motif || '-'}</td>
                      <td><span className={`badge ${c.statut === 'Approuvé' ? 'badge-green' : c.statut === 'Refusé' ? 'badge-red' : 'badge-orange'}`}>{c.statut}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onglet Avances */}
      {activeTab === 'avances' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-label">Total demandes</div>
              <div className="stat-value">{avances.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total approuvé</div>
              <div className="stat-value" style={{ fontSize: 16 }}>{totalAvances.toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">En attente</div>
              <div className="stat-value" style={{ color: '#F59E0B' }}>
                {avances.filter(a => a.statut === 'En attente').length}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Historique des avances</h3></div>
            <table>
              <thead>
                <tr><th>Date</th><th>Montant</th><th>Motif</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {avances.length === 0
                  ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>Aucune avance enregistrée</td></tr>
                  : avances.map(a => (
                    <tr key={a.id}>
                      <td>{formatDate(a.date_demande)}</td>
                      <td><strong>{formatMontant(a.montant)}</strong></td>
                      <td>{a.motif || '-'}</td>
                      <td><span className={`badge ${a.statut === 'Approuvé' ? 'badge-green' : a.statut === 'Refusé' ? 'badge-red' : 'badge-orange'}`}>{a.statut}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}