import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${type === 'error' ? '#DC3545' : '#1C2B3A'};color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;font-family:inherit`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

const emptyForm = {
  nom: '', forme_juridique: '', siege_social: '', rccm: '',
  ifu: '', cnss_employeur: '', representant: '', qualite_representant: '',
  telephone: '', email: '', bp: '', ville: 'Ouagadougou', logo_url: '',
};

export default function Entreprise({ onRefresh }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [id, setId] = useState(null);

  useEffect(() => { loadEntreprise(); }, []);

  async function loadEntreprise() {
    setLoading(true);
    const { data } = await supabase.from('entreprise').select('*').limit(1).single();
    if (data) { setForm({ ...emptyForm, ...data }); setId(data.id); }
    setLoading(false);
  }

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleLogoUpload(file) {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const filename = `logo_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('logos').upload(filename, file, { upsert: true });
    if (error) { showToast('Erreur lors de l\'upload', 'error'); setUploading(false); return; }
    const { data } = supabase.storage.from('logos').getPublicUrl(filename);
    setF('logo_url', data.publicUrl);
    showToast('Logo uploadé avec succès');
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    const data = { ...form };
    delete data.id;
    delete data.created_at;
    if (id) {
      const { error } = await supabase.from('entreprise').update(data).eq('id', id);
      if (error) showToast('Erreur lors de la sauvegarde', 'error');
      else { showToast('Informations sauvegardées avec succès'); onRefresh(); }
    } else {
      const { error } = await supabase.from('entreprise').insert(data);
      if (error) showToast('Erreur lors de la sauvegarde', 'error');
      else { showToast('Informations sauvegardées avec succès'); loadEntreprise(); onRefresh(); }
    }
    setSaving(false);
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Chargement...</div>;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3>Informations de l'entreprise</h3>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
            Ces informations seront automatiquement intégrées dans tous les documents générés.
          </p>

          {/* Logo */}
          <div className="section-title">🖼 Logo de l'entreprise</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{
              width: 120, height: 80, border: '2px dashed var(--border)',
              borderRadius: 8, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: 'var(--bg)', overflow: 'hidden'
            }}>
              {form.logo_url
                ? <img src={form.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                : <span style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: 8 }}>Aucun logo</span>
              }
            </div>
            <div>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                {uploading ? 'Upload en cours...' : '⬆ Choisir un logo'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handleLogoUpload(e.target.files[0])}
                  disabled={uploading}
                />
              </label>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                Formats acceptés : PNG, JPG, SVG — Max 2MB
              </p>
              {form.logo_url && (
                <button
                  className="btn btn-danger btn-sm"
                  style={{ marginTop: 6 }}
                  onClick={() => setF('logo_url', '')}
                >
                  🗑 Supprimer le logo
                </button>
              )}
            </div>
          </div>

          <div className="section-title">🏢 Identification</div>
          <div className="form-grid">
            <div className="form-group full">
              <label>Raison sociale / Nom de l'entreprise *</label>
              <input value={form.nom} onChange={e => setF('nom', e.target.value)} placeholder="Ex: Société ABC" />
            </div>
            <div className="form-group">
              <label>Forme juridique</label>
              <select value={form.forme_juridique} onChange={e => setF('forme_juridique', e.target.value)}>
                <option value="">-</option>
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
              <input value={form.siege_social} onChange={e => setF('siege_social', e.target.value)} placeholder="Ex: Secteur 4, Rue 10.34, Ouagadougou" />
            </div>
            <div className="form-group">
              <label>Boîte postale</label>
              <input value={form.bp} onChange={e => setF('bp', e.target.value)} placeholder="Ex: BP 1234" />
            </div>
          </div>

          <div className="section-title">📋 Numéros officiels</div>
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

          <div className="section-title">👤 Représentant légal</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Nom et Prénom(s) du représentant</label>
              <input value={form.representant} onChange={e => setF('representant', e.target.value)} placeholder="Ex: OUEDRAOGO Jean" />
            </div>
            <div className="form-group">
              <label>Qualité / Fonction</label>
              <input value={form.qualite_representant} onChange={e => setF('qualite_representant', e.target.value)} placeholder="Ex: Directeur Général" />
            </div>
          </div>

          <div className="section-title">📞 Contacts</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Téléphone</label>
              <input value={form.telephone} onChange={e => setF('telephone', e.target.value)} placeholder="Ex: +226 25 00 00 00" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="Ex: contact@entreprise.bf" />
            </div>
          </div>

          <div className="section-title">👁 Aperçu sur les documents</div>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 20, fontSize: 13, lineHeight: 2,
            display: 'flex', gap: 20, alignItems: 'flex-start'
          }}>
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" style={{ width: 80, height: 60, objectFit: 'contain', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{form.nom || 'Nom de l\'entreprise'}</div>
              {form.forme_juridique && <div>{form.forme_juridique}</div>}
              {form.siege_social && <div>{form.siege_social}</div>}
              {form.bp && <div>{form.bp} — {form.ville}</div>}
              {form.rccm && <div>RCCM : {form.rccm}</div>}
              {form.ifu && <div>IFU : {form.ifu}</div>}
              {form.cnss_employeur && <div>CNSS Employeur : {form.cnss_employeur}</div>}
              {form.telephone && <div>Tél : {form.telephone}</div>}
              {form.email && <div>Email : {form.email}</div>}
              {form.representant && <div style={{ marginTop: 8 }}>Représenté par : <strong>{form.representant}</strong>, {form.qualite_representant}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}