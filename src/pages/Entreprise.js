// Entreprise.js — Gestion des informations de l'entreprise
// Fonctionnalités : identification, logo, signataires, aperçu PDF

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Building2, FileText, Phone, User,
  Upload, Trash2, Save, Eye, Plus, X,
} from 'lucide-react';

// ── Notification toast ────────────────────────────────────
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

// ── Formulaire vide ───────────────────────────────────────
// "signataires" est un tableau de { role, nom } stocké en JSONB
const EMPTY_FORM = {
  nom: '', forme_juridique: '', siege_social: '', rccm: '',
  ifu: '', cnss_employeur: '', representant: '',
  qualite_representant: '', telephone: '', email: '',
  bp: '', ville: 'Ouagadougou', logo_url: '',
  mention_signataire: '', pied_de_page: '',
  banque: '', numero_compte: '',
  signataires: [{ role: 'Responsable RH', nom: 'Tégawendé Azaria KABORE' }],
};

// ── Carte de section ──────────────────────────────────────
function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
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
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

// ── Composant principal Entreprise ────────────────────────
export default function Entreprise({ onRefresh }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [id, setId]             = useState(null);
  const [activeTab, setActiveTab] = useState('form');

  useEffect(() => { loadEntreprise(); }, []);

  // ── Chargement des données ────────────────────────────
  async function loadEntreprise() {
    setLoading(true);
    const { data } = await supabase.from('entreprise').select('*').limit(1).single();
    if (data) {
      // Garantit que "signataires" est toujours un tableau
      const sigs = Array.isArray(data.signataires) ? data.signataires
        : (data.signataires ? JSON.parse(data.signataires) : EMPTY_FORM.signataires);
      setForm({ ...EMPTY_FORM, ...data, signataires: sigs });
      setId(data.id);
    }
    setLoading(false);
  }

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

  // ── Gestion des signataires ───────────────────────────

  // Ajoute un signataire vide
  function addSignataire() {
    setForm(f => ({
      ...f,
      signataires: [...(f.signataires || []), { role: '', nom: '' }],
    }));
  }

  // Supprime le signataire à l'index i
  function removeSignataire(i) {
    setForm(f => ({
      ...f,
      signataires: f.signataires.filter((_, idx) => idx !== i),
    }));
  }

  // Met à jour un champ d'un signataire (role ou nom)
  function updateSignataire(i, key, val) {
    setForm(f => {
      const sigs = [...f.signataires];
      sigs[i] = { ...sigs[i], [key]: val };
      return { ...f, signataires: sigs };
    });
  }

  // ── Upload du logo ────────────────────────────────────
  async function handleLogoUpload(file) {
    if (!file) return;
    setUploading(true);
    const ext      = file.name.split('.').pop();
    const filename = `logo_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('logos').upload(filename, file, { upsert: true });
    if (error) { showToast('Erreur lors de l\'upload du logo', 'error'); setUploading(false); return; }
    const { data } = supabase.storage.from('logos').getPublicUrl(filename);
    setF('logo_url', data.publicUrl);
    showToast('Logo uploadé avec succès');
    setUploading(false);
  }

  // ── Sauvegarde ───────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    const data = { ...form };
    delete data.id;
    delete data.created_at;

    // Tente un enregistrement complet
    let error;
    if (id) {
      ({ error } = await supabase.from('entreprise').update(data).eq('id', id));
    } else {
      ({ error } = await supabase.from('entreprise').insert(data));
    }

    // Si colonne inconnue (migration incomplète), réessaie sans les champs optionnels
    if (error && error.message && error.message.includes('column')) {
      console.warn('Colonnes manquantes, réessai sans banque/numero_compte/signataires :', error.message);
      const dataFallback = { ...data };
      delete dataFallback.banque;
      delete dataFallback.numero_compte;
      delete dataFallback.signataires;
      if (id) {
        ({ error } = await supabase.from('entreprise').update(dataFallback).eq('id', id));
      } else {
        ({ error } = await supabase.from('entreprise').insert(dataFallback));
      }
    }

    if (error) {
      console.error('Erreur sauvegarde entreprise :', error);
      showToast(`Erreur : ${error.message}`, 'error');
    } else {
      showToast('Informations sauvegardées avec succès');
      if (!id) loadEntreprise();
      onRefresh();
    }
    setSaving(false);
  }

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 300, color: '#A3A3A3', fontFamily: 'Poppins, sans-serif',
    }}>
      Chargement...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ════════════════════════════════
          EN-TÊTE FIXE (sticky)
      ════════════════════════════════ */}
      <div style={{
        position: 'sticky', top: -28, zIndex: 10,
        background: '#F5F5F5', paddingTop: 4, paddingBottom: 12,
        marginTop: -4, marginBottom: 8,
      }}>
        {/* Barre d'info + bouton sauvegarder */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#FFFFFF', border: '1px solid #E5E5E5',
          borderRadius: 12, padding: '14px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 14,
        }}>
          <p style={{ fontSize: 13, color: '#A3A3A3', fontFamily: 'Poppins, sans-serif', margin: 0 }}>
            Ces informations apparaîtront automatiquement sur tous les documents générés.
          </p>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={15} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        {/* Onglets */}
        <div className="tabs" style={{ marginBottom: 0 }}>
          {[
            { id: 'form',    label: 'Informations', icon: Building2 },
            { id: 'preview', label: 'Aperçu',       icon: Eye },
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
      </div>

      {/* ════════════════════════════════
          CONTENU DÉFILABLE
      ════════════════════════════════ */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── Onglet Informations ── */}
        {activeTab === 'form' && (
          <div>

            {/* Logo */}
            <SectionCard title="Logo de l'entreprise" icon={Upload}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{
                  width: 120, height: 80, border: '2px dashed #E5E5E5', borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#FAFAFA', overflow: 'hidden', flexShrink: 0,
                }}>
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <Building2 size={24} color="#D4D4D4" strokeWidth={1.5} />
                      <div style={{ fontSize: 10, color: '#D4D4D4', marginTop: 4 }}>Aucun logo</div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer', marginBottom: 8, display: 'inline-flex' }}>
                    <Upload size={14} />
                    {uploading ? 'Upload en cours...' : 'Choisir un logo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => handleLogoUpload(e.target.files[0])} disabled={uploading} />
                  </label>
                  <p style={{ fontSize: 11, color: '#A3A3A3', marginBottom: 8 }}>
                    Formats acceptés : PNG, JPG, SVG — Max 2MB
                  </p>
                  {form.logo_url && (
                    <button className="btn btn-danger btn-sm" onClick={() => setF('logo_url', '')}>
                      <Trash2 size={12} />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Identification */}
            <SectionCard title="Identification" icon={Building2}>
              <div className="form-grid">
                <div className="form-group full">
                  <label>Raison sociale *</label>
                  <input value={form.nom} onChange={e => setF('nom', e.target.value)} placeholder="Ex: Société ABC" />
                </div>
                <div className="form-group">
                  <label>Forme juridique</label>
                  <select value={form.forme_juridique} onChange={e => setF('forme_juridique', e.target.value)}>
                    <option value="">—</option>
                    {['SARL', 'SA', 'SAS', 'GIE', 'ONG', 'Association', 'Entreprise individuelle', 'Autre'].map(f =>
                      <option key={f} value={f}>{f}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label>Ville</label>
                  <input value={form.ville} onChange={e => setF('ville', e.target.value)} placeholder="Ex: Ouagadougou" />
                </div>
                <div className="form-group full">
                  <label>Siège social / Adresse</label>
                  <input value={form.siege_social} onChange={e => setF('siege_social', e.target.value)}
                    placeholder="Ex: Secteur 4, Rue 10.34, Ouagadougou" />
                </div>
                <div className="form-group">
                  <label>Boîte postale</label>
                  <input value={form.bp} onChange={e => setF('bp', e.target.value)} placeholder="Ex: BP 1234" />
                </div>
              </div>
            </SectionCard>

            {/* Numéros officiels */}
            <SectionCard title="Numéros officiels" icon={FileText}>
              <div className="form-grid">
                <div className="form-group">
                  <label>N° RCCM</label>
                  <input value={form.rccm} onChange={e => setF('rccm', e.target.value)} placeholder="Ex: BF-OUA-2020-B-12345" />
                </div>
                <div className="form-group">
                  <label>N° IFU</label>
                  <input value={form.ifu} onChange={e => setF('ifu', e.target.value)} placeholder="Ex: 00012345678" />
                </div>
                <div className="form-group">
                  <label>N° CNSS Employeur</label>
                  <input value={form.cnss_employeur} onChange={e => setF('cnss_employeur', e.target.value)} placeholder="Ex: 123456" />
                </div>
              </div>
            </SectionCard>

            {/* Coordonnées bancaires */}
            <SectionCard title="Coordonnées bancaires" icon={FileText}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom de la banque</label>
                  <input value={form.banque} onChange={e => setF('banque', e.target.value)}
                    placeholder="Ex: Banque Commerciale du Burkina" />
                </div>
                <div className="form-group">
                  <label>N° de compte</label>
                  <input value={form.numero_compte} onChange={e => setF('numero_compte', e.target.value)}
                    placeholder="Ex: BF056 01001 050122738701 65/BCB" />
                </div>
              </div>
            </SectionCard>

            {/* Représentant légal */}
            <SectionCard title="Représentant légal" icon={User}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom et Prénom(s)</label>
                  <input value={form.representant} onChange={e => setF('representant', e.target.value)}
                    placeholder="Ex: OUEDRAOGO Jean" />
                </div>
                <div className="form-group">
                  <label>Qualité / Fonction</label>
                  <input value={form.qualite_representant} onChange={e => setF('qualite_representant', e.target.value)}
                    placeholder="Ex: Directeur Général" />
                </div>
                <div className="form-group full">
                  <label>Mention sous la signature (optionnel)</label>
                  <input value={form.mention_signataire} onChange={e => setF('mention_signataire', e.target.value)}
                    placeholder="Ex: Chevalier de l'Ordre de l'Étalon" />
                </div>
                <div className="form-group full">
                  <label>Pied de page des documents (optionnel)</label>
                  <input value={form.pied_de_page} onChange={e => setF('pied_de_page', e.target.value)}
                    placeholder="Ex: Mode de règlement / Mentions légales..." />
                </div>
              </div>
            </SectionCard>

            {/* ════════════════════════════════
                SIGNATAIRES
                Chaque entrée = { role, nom }
                Les documents récupèrent le nom par le rôle automatiquement.
            ════════════════════════════════ */}
            <SectionCard title="Signataires des documents" icon={User}>
              <p style={{ fontSize: 12, color: '#737373', marginBottom: 16, marginTop: 0 }}>
                Associez un nom à chaque rôle. Les documents PDF afficheront automatiquement
                le nom correspondant au rôle demandé (ex. "Responsable RH").
              </p>

              {/* Liste des signataires */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {(form.signataires || []).map((sig, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      value={sig.role}
                      onChange={e => updateSignataire(i, 'role', e.target.value)}
                      placeholder="Rôle (ex : Responsable RH)"
                      style={{ flex: 1 }}
                    />
                    <input
                      value={sig.nom}
                      onChange={e => updateSignataire(i, 'nom', e.target.value)}
                      placeholder="Nom complet (ex : KABORE Tégawendé Azaria)"
                      style={{ flex: 2 }}
                    />
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeSignataire(i)}
                      title="Supprimer ce signataire"
                      style={{ flexShrink: 0 }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Bouton ajout */}
              <button className="btn btn-secondary btn-sm" onClick={addSignataire}>
                <Plus size={13} />
                Ajouter un signataire
              </button>
            </SectionCard>

            {/* Contacts */}
            <SectionCard title="Contacts" icon={Phone}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Téléphone</label>
                  <input value={form.telephone} onChange={e => setF('telephone', e.target.value)}
                    placeholder="Ex: +226 25 00 00 00" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setF('email', e.target.value)}
                    placeholder="Ex: contact@entreprise.bf" />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── Onglet Aperçu ── */}
        {activeTab === 'preview' && (
          <div className="card">
            <div className="card-header">
              <h3>Aperçu sur les documents PDF</h3>
            </div>
            <div className="card-body">
              <div style={{ border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'hidden' }}>

                {/* En-tête PDF */}
                <div style={{
                  background: '#003366', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 16,
                }}>
                  {form.logo_url && (
                    <img src={form.logo_url} alt="Logo" style={{
                      width: 48, height: 48, objectFit: 'contain', flexShrink: 0,
                      background: '#fff', borderRadius: 6, padding: 3,
                    }} />
                  )}
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: 'Poppins, sans-serif' }}>
                      {form.nom || 'Nom de l\'entreprise'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 3 }}>
                      {[
                        form.forme_juridique,
                        form.siege_social,
                        form.rccm ? `RCCM: ${form.rccm}` : '',
                        form.ifu  ? `IFU: ${form.ifu}`   : '',
                        form.telephone,
                      ].filter(Boolean).join('  |  ')}
                    </div>
                    {form.representant && (
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 4 }}>
                        Représenté par : {form.representant}, {form.qualite_representant}
                      </div>
                    )}
                  </div>
                </div>

                {/* Corps PDF */}
                <div style={{ padding: 24 }}>
                  <div style={{
                    background: '#003366', color: '#fff', padding: '8px 16px',
                    borderRadius: 6, textAlign: 'center', fontSize: 13,
                    fontWeight: 700, marginBottom: 20, fontFamily: 'Poppins, sans-serif',
                  }}>
                    CONTRAT À DURÉE INDÉTERMINÉE (CDI)
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Raison sociale',  value: form.nom },
                      { label: 'Forme juridique', value: form.forme_juridique },
                      { label: 'RCCM',            value: form.rccm },
                      { label: 'IFU',             value: form.ifu },
                      { label: 'CNSS Employeur',  value: form.cnss_employeur },
                      { label: 'Représentant',    value: form.representant },
                    ].map(row => (
                      <div key={row.label} style={{ fontSize: 12, fontFamily: 'Poppins, sans-serif' }}>
                        <span style={{ color: '#A3A3A3' }}>{row.label} : </span>
                        <span style={{ fontWeight: 600, color: '#0F0F0F' }}>{row.value || '—'}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    padding: 10, background: '#FAFAFA', borderRadius: 6,
                    fontSize: 11, color: '#A3A3A3', textAlign: 'center',
                    fontFamily: 'Poppins, sans-serif',
                  }}>
                    ... contenu du document ...
                  </div>

                  <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {[
                      { label: 'L\'EMPLOYEUR', mention: form.mention_signataire },
                      { label: 'L\'EMPLOYÉ(E)', mention: null },
                    ].map(sig => (
                      <div key={sig.label} style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: '#003366',
                          fontFamily: 'Poppins, sans-serif', marginBottom: 6,
                        }}>
                          {sig.label}
                        </div>
                        {sig.mention && (
                          <div style={{ fontSize: 9, color: '#A3A3A3', fontStyle: 'italic', marginBottom: 18 }}>
                            {sig.mention}
                          </div>
                        )}
                        {!sig.mention && <div style={{ marginBottom: 28 }} />}
                        <div style={{ borderTop: '1px solid #333', paddingTop: 4 }}>
                          <span style={{ fontSize: 10, color: '#A3A3A3' }}>Signature</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {form.pied_de_page && (
                    <div style={{
                      marginTop: 20, paddingTop: 12, borderTop: '1px solid #E5E5E5',
                      fontSize: 10, color: '#A3A3A3', textAlign: 'center', fontStyle: 'italic',
                    }}>
                      {form.pied_de_page}
                    </div>
                  )}

                  {/* Aperçu des signataires configurés */}
                  {(form.signataires || []).length > 0 && (
                    <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid #E5E5E5' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#737373', marginBottom: 8 }}>
                        Signataires configurés :
                      </div>
                      {(form.signataires || []).map((s, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#404040', marginBottom: 4 }}>
                          <span style={{ color: '#A3A3A3' }}>{s.role} : </span>
                          <span style={{ fontWeight: 600 }}>{s.nom || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
