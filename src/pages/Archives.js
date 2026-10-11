// Archives.js — Gestion des archives personnelles
// Chaque utilisateur voit ses propres archives ; l'admin voit tout.
// Catégories : facture, texte, décharge, autre
// Fonctionnalités : upload fichier, recherche, filtres, pagination server-side

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/helpers';
import { peutFaire } from '../lib/useProfil';
import Pagination from '../components/Pagination';
import {
  Archive, Receipt, FileText, ClipboardCheck, FolderOpen,
  Plus, Search, Trash2, Download, Eye, X, Save, Upload,
  AlertTriangle, User,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────
const PAGE_SIZE = 15;

const CATEGORIES = [
  { id: 'all',      label: 'Toutes',      Icon: Archive,         color: '#737373' },
  { id: 'facture',  label: 'Factures',    Icon: Receipt,         color: '#2563EB' },
  { id: 'texte',    label: 'Textes',      Icon: FileText,        color: '#16A34A' },
  { id: 'decharge', label: 'Décharges',   Icon: ClipboardCheck,  color: '#8B5CF6' },
  { id: 'autre',    label: 'Autres',      Icon: FolderOpen,      color: '#E8920A' },
];

const CAT_META = {
  facture:  { label: 'Facture',   color: '#2563EB', bg: '#DBEAFE' },
  texte:    { label: 'Texte',     color: '#16A34A', bg: '#DCFCE7' },
  decharge: { label: 'Décharge',  color: '#8B5CF6', bg: '#EDE9FE' },
  autre:    { label: 'Autre',     color: '#E8920A', bg: '#FEF3E2' },
};

const ACCEPT_MIME = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt';

const EMPTY_FORM = { titre: '', description: '', categorie: 'facture', fichier: null };

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const colors = { success: '#16A34A', error: '#DC2626', warning: '#D97706' };
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:24px;right:24px;
    background:${colors[type]};color:#fff;
    padding:12px 20px;border-radius:10px;
    font-size:13px;font-weight:600;z-index:9999;
    font-family:Poppins,sans-serif;
    box-shadow:0 4px 16px rgba(0,0,0,0.15);
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ── Taille lisible ─────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

// ── Icône selon MIME ───────────────────────────────────────
function FileIcon({ mime, size = 16 }) {
  const color =
    mime?.includes('pdf')  ? '#DC2626' :
    mime?.includes('image') ? '#8B5CF6' :
    mime?.includes('word')  ? '#2563EB' :
    mime?.includes('sheet') || mime?.includes('excel') ? '#16A34A' :
    '#737373';
  return <FileText size={size} color={color} strokeWidth={1.8} />;
}

// ── Composant principal ────────────────────────────────────
export default function Archives({ profil }) {
  const isAdmin = profil?.role === 'admin';

  // ── State ──────────────────────────────────────────────
  const [rows, setRows]             = useState([]);
  const [counts, setCounts]         = useState({});
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [activeCat, setActiveCat]   = useState('all');
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [modal, setModal]           = useState(false); // 'add' | false
  const [viewDoc, setViewDoc]       = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Fetch données ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    let query = supabase
      .from('archives')
      .select('*, profils(nom, prenom)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (activeCat !== 'all') query = query.eq('categorie', activeCat);
    if (search)              query = query.ilike('titre', `%${search}%`);

    const { data, count, error } = await query;
    if (error) { showToast('Erreur chargement', 'error'); }
    else {
      setRows(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [page, activeCat, search]);

  // Compteurs par catégorie
  const fetchCounts = useCallback(async () => {
    const { data } = await supabase
      .from('archives')
      .select('categorie');
    if (!data) return;
    const c = {};
    data.forEach(r => { c[r.categorie] = (c[r.categorie] || 0) + 1; });
    c.all = data.length;
    setCounts(c);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  // Reset page quand filtre change
  useEffect(() => { setPage(1); }, [activeCat, search]);

  // ── Recherche avec délai ───────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Upload + Sauvegarde ────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    if (!form.titre.trim()) return showToast('Le titre est requis', 'warning');
    setSaving(true);
    setUploadProgress(0);

    const { data: { user } } = await supabase.auth.getUser();
    let fichier_url = null, fichier_nom = null, fichier_taille = null, fichier_type = null;

    if (form.fichier) {
      const file = form.fichier;
      const ext  = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      setUploadProgress(30);
      const { error: upErr } = await supabase.storage
        .from('archives')
        .upload(path, file, { upsert: false });

      if (upErr) {
        showToast('Erreur upload fichier', 'error');
        setSaving(false);
        return;
      }

      setUploadProgress(70);
      const { data: urlData } = supabase.storage.from('archives').getPublicUrl(path);
      fichier_url    = urlData?.publicUrl || path;
      fichier_nom    = file.name;
      fichier_taille = file.size;
      fichier_type   = file.type;
    }

    setUploadProgress(90);
    const { error } = await supabase.from('archives').insert({
      titre:         form.titre.trim(),
      description:   form.description.trim() || null,
      categorie:     form.categorie,
      fichier_url,
      fichier_nom,
      fichier_taille,
      fichier_type,
      user_id:       user.id,
    });

    setSaving(false);
    setUploadProgress(0);

    if (error) return showToast('Erreur lors de la sauvegarde', 'error');
    showToast('Archive ajoutée avec succès');
    setModal(false);
    setForm(EMPTY_FORM);
    fetchData();
    fetchCounts();
  }

  // ── Suppression ────────────────────────────────────────
  async function handleDelete(doc) {
    // Supprimer le fichier storage si existant
    if (doc.fichier_url) {
      const { data: { user } } = await supabase.auth.getUser();
      // Extraire le path relatif depuis l'URL publique
      const pathMatch = doc.fichier_url.match(new RegExp(`archives/${user.id}/(.+)`));
      if (pathMatch) {
        await supabase.storage.from('archives').remove([`${user.id}/${pathMatch[1]}`]);
      }
    }
    const { error } = await supabase.from('archives').delete().eq('id', doc.id);
    if (error) return showToast('Erreur suppression', 'error');
    showToast('Archive supprimée');
    setDelConfirm(null);
    fetchData();
    fetchCounts();
  }

  // ── Téléchargement ─────────────────────────────────────
  async function handleDownload(doc) {
    if (!doc.fichier_url) return;
    // Extraire le path storage
    const match = doc.fichier_url.match(/\/archives\/(.+)$/);
    if (!match) { window.open(doc.fichier_url, '_blank'); return; }
    const { data, error } = await supabase.storage.from('archives').download(match[1]);
    if (error || !data) return showToast('Erreur téléchargement', 'error');
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = doc.fichier_nom || 'archive';
    a.click(); URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', fontFamily: 'Poppins, sans-serif' }}>

      {/* ══════════════════════════════
          SIDEBAR CATÉGORIES
      ══════════════════════════════ */}
      <div style={{
        width: 210, flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #F0F0F0',
        padding: '20px 0',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#A3A3A3',
          letterSpacing: '1.2px', textTransform: 'uppercase',
          padding: '0 18px 10px',
        }}>
          Catégories
        </div>

        {CATEGORIES.map(cat => {
          const Icon = cat.Icon;
          const active = activeCat === cat.id;
          const cnt = counts[cat.id] || 0;
          return (
            <div
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 18px',
                cursor: 'pointer',
                background: active ? '#FEF3E2' : 'transparent',
                borderLeft: active ? '3px solid #E8920A' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={16} color={active ? '#E8920A' : cat.color} strokeWidth={2} />
              <span style={{
                flex: 1, fontSize: 13, fontWeight: active ? 600 : 500,
                color: active ? '#E8920A' : '#525252',
              }}>
                {cat.label}
              </span>
              {cnt > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: active ? '#E8920A' : '#A3A3A3',
                  background: active ? '#FEF3E2' : '#F5F5F5',
                  borderRadius: 20, padding: '1px 7px',
                }}>
                  {cat.id === 'all' ? counts.all || 0 : cnt}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════
          CONTENU PRINCIPAL
      ══════════════════════════════ */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          {/* Recherche */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={15} color="#A3A3A3" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Rechercher un document…"
              style={{
                width: '100%', padding: '9px 14px 9px 36px',
                border: '1.5px solid #E5E5E5', borderRadius: 10,
                fontSize: 13, fontFamily: 'Poppins, sans-serif',
                background: '#fff', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#E8920A'}
              onBlur={e => e.target.style.borderColor = '#E5E5E5'}
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A3A3A3' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Bouton ajouter */}
          <button
            onClick={() => { setForm(EMPTY_FORM); setModal(true); }}
            className="btn btn-primary"
          >
            <Plus size={15} strokeWidth={2.5} />
            Ajouter
          </button>
        </div>

        {/* Titre section + total */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F0F0F' }}>
            {CATEGORIES.find(c => c.id === activeCat)?.label}
          </h3>
          {!loading && (
            <span style={{ fontSize: 12, color: '#A3A3A3' }}>— {total} document{total !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Liste */}
        <div style={{
          background: '#fff', borderRadius: 12,
          border: '1px solid #E5E5E5',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#A3A3A3', fontSize: 13 }}>
              Chargement…
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <Archive size={40} color="#E5E5E5" strokeWidth={1.2} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: '#A3A3A3', fontWeight: 500 }}>Aucune archive trouvée</p>
              <p style={{ fontSize: 12, color: '#D4D4D4', marginTop: 4 }}>
                {search ? 'Essayez un autre terme de recherche' : 'Ajoutez votre premier document'}
              </p>
            </div>
          ) : (
            <>
              {/* En-tête tableau */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isAdmin ? '3fr 1.2fr 1.2fr 1fr 100px' : '3fr 1.2fr 1.2fr 100px',
                padding: '10px 18px',
                background: '#FAFAFA',
                borderBottom: '1px solid #F0F0F0',
                fontSize: 11, fontWeight: 600, color: '#A3A3A3',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                <span>Document</span>
                <span>Catégorie</span>
                <span>Date</span>
                {isAdmin && <span>Ajouté par</span>}
                <span>Actions</span>
              </div>

              {/* Lignes */}
              {rows.map(doc => {
                const cat = CAT_META[doc.categorie] || CAT_META.autre;
                return (
                  <div
                    key={doc.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isAdmin ? '3fr 1.2fr 1.2fr 1fr 100px' : '3fr 1.2fr 1.2fr 100px',
                      padding: '13px 18px',
                      borderBottom: '1px solid #F9F9F9',
                      alignItems: 'center',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Titre + fichier */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: cat.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <FileIcon mime={doc.fichier_type} size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: '#0F0F0F',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {doc.titre}
                        </div>
                        <div style={{ fontSize: 11, color: '#A3A3A3', marginTop: 1 }}>
                          {doc.fichier_nom
                            ? <><span style={{ color: '#737373' }}>{doc.fichier_nom}</span> · {formatSize(doc.fichier_taille)}</>
                            : <span style={{ fontStyle: 'italic' }}>Sans fichier</span>
                          }
                        </div>
                      </div>
                    </div>

                    {/* Catégorie */}
                    <div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600,
                        background: cat.bg, color: cat.color,
                      }}>
                        {cat.label}
                      </span>
                    </div>

                    {/* Date */}
                    <div style={{ fontSize: 12, color: '#737373' }}>
                      {formatDate(doc.created_at)}
                    </div>

                    {/* Ajouté par (admin only) */}
                    {isAdmin && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={12} color="#A3A3A3" />
                        <span style={{ fontSize: 12, color: '#737373' }}>
                          {doc.profils ? `${doc.profils.prenom} ${doc.profils.nom}` : '—'}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {doc.fichier_url && (
                        <>
                          <button
                            title="Aperçu"
                            onClick={() => setViewDoc(doc)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#737373', display: 'flex' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F5'; e.currentTarget.style.color = '#2563EB'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#737373'; }}
                          >
                            <Eye size={15} strokeWidth={2} />
                          </button>
                          <button
                            title="Télécharger"
                            onClick={() => handleDownload(doc)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#737373', display: 'flex' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F5'; e.currentTarget.style.color = '#16A34A'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#737373'; }}
                          >
                            <Download size={15} strokeWidth={2} />
                          </button>
                        </>
                      )}
                      <button
                        title="Supprimer"
                        onClick={() => setDelConfirm(doc)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#737373', display: 'flex' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#737373'; }}
                      >
                        <Trash2 size={15} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              <div style={{ padding: '0 18px 8px' }}>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════
          MODAL AJOUT
      ══════════════════════════════ */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 560 }}>
            <div className="modal-header">
              <h3>Ajouter une archive</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#737373', display: 'flex' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Titre */}
                <div className="form-group">
                  <label>Titre *</label>
                  <input
                    value={form.titre}
                    onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                    placeholder="Ex: Facture Orange mars 2026"
                    required
                  />
                </div>

                {/* Catégorie */}
                <div className="form-group">
                  <label>Catégorie *</label>
                  <select
                    value={form.categorie}
                    onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                  >
                    <option value="facture">Facture</option>
                    <option value="texte">Texte officiel</option>
                    <option value="decharge">Décharge</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label>Description (optionnelle)</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Quelques mots pour décrire ce document…"
                    rows={2}
                  />
                </div>

                {/* Upload fichier */}
                <div className="form-group">
                  <label>Fichier joint</label>
                  <label
                    htmlFor="archive-file"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px',
                      border: '2px dashed #E5E5E5', borderRadius: 10,
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: form.fichier ? '#F0FDF4' : '#FAFAFA',
                      borderColor: form.fichier ? '#16A34A' : '#E5E5E5',
                    }}
                    onMouseEnter={e => { if (!form.fichier) e.currentTarget.style.borderColor = '#E8920A'; }}
                    onMouseLeave={e => { if (!form.fichier) e.currentTarget.style.borderColor = '#E5E5E5'; }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: form.fichier ? '#DCFCE7' : '#F0F0F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Upload size={16} color={form.fichier ? '#16A34A' : '#A3A3A3'} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {form.fichier ? (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#16A34A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {form.fichier.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#A3A3A3' }}>{formatSize(form.fichier.size)}</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#525252' }}>Cliquer pour choisir un fichier</div>
                          <div style={{ fontSize: 11, color: '#A3A3A3' }}>PDF, image, Word, Excel — max 20 Mo</div>
                        </>
                      )}
                    </div>
                    {form.fichier && (
                      <button
                        type="button"
                        onClick={e => { e.preventDefault(); setForm(f => ({ ...f, fichier: null })); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A3A3A3', display: 'flex', flexShrink: 0 }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </label>
                  <input
                    id="archive-file"
                    type="file"
                    accept={ACCEPT_MIME}
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files[0];
                      if (f && f.size > 20 * 1024 * 1024) {
                        showToast('Fichier trop lourd (max 20 Mo)', 'warning');
                        return;
                      }
                      setForm(prev => ({ ...prev, fichier: f || null }));
                      e.target.value = '';
                    }}
                  />
                </div>

                {/* Barre de progression */}
                {saving && uploadProgress > 0 && (
                  <div style={{ background: '#F0F0F0', borderRadius: 4, overflow: 'hidden', height: 4 }}>
                    <div style={{
                      height: '100%', width: `${uploadProgress}%`,
                      background: '#E8920A', transition: 'width 0.3s ease',
                      borderRadius: 4,
                    }} />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>Enregistrement…</>
                  ) : (
                    <><Save size={14} strokeWidth={2.5} /> Enregistrer</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          MODAL APERÇU
      ══════════════════════════════ */}
      {viewDoc && (
        <div className="modal-overlay" onClick={() => setViewDoc(null)}>
          <div
            className="modal"
            style={{ width: '90vw', maxWidth: 860, height: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: 14 }}>{viewDoc.titre}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleDownload(viewDoc)}
                >
                  <Download size={13} strokeWidth={2} /> Télécharger
                </button>
                <button onClick={() => setViewDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#737373', display: 'flex' }}>
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {viewDoc.fichier_type?.includes('image') ? (
                <img
                  src={viewDoc.fichier_url}
                  alt={viewDoc.titre}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : viewDoc.fichier_type?.includes('pdf') ? (
                <iframe
                  src={viewDoc.fichier_url}
                  title={viewDoc.titre}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <FileText size={48} color="#D4D4D4" strokeWidth={1} style={{ marginBottom: 16 }} />
                  <p style={{ fontSize: 14, color: '#737373', marginBottom: 16 }}>Aperçu non disponible pour ce type de fichier</p>
                  <button className="btn btn-primary" onClick={() => handleDownload(viewDoc)}>
                    <Download size={14} /> Télécharger le fichier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          MODAL CONFIRMATION SUPPRESSION
      ══════════════════════════════ */}
      {delConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 420 }}>
            <div className="modal-header">
              <h3 style={{ color: '#DC2626' }}>
                <AlertTriangle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Supprimer l'archive
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: '#525252', lineHeight: 1.6 }}>
                Voulez-vous vraiment supprimer <strong>« {delConfirm.titre} »</strong> ?
                {delConfirm.fichier_url && ' Le fichier joint sera également supprimé.'}
                <br />Cette action est irréversible.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDelConfirm(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={() => handleDelete(delConfirm)}>
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
