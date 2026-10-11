// Badge.js — Génération de badge agent (format carte 54×86 mm)
// Reproduit le modèle FASO ARMORED : logo, watermark, photo ronde, nom, poste, tél, signature

import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { User, Download, CreditCard, Printer } from 'lucide-react';

// ── Toast ────────────────────────────────────────────────────
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

// ── Dimensions carte en px pour le canvas (54×86 mm @ 96dpi ≈ 204×325)
// On travaille en 2× pour la qualité : 408×650 px
const W = 408;
const H = 650;

// ── Couleurs FASO ARMORED ─────────────────────────────────
const GOLD   = '#B8972A';   // or/khaki du fond haut
const MAROON = '#6B1A1A';   // brun foncé / bordeaux du bandeau et lignes
const TEXT   = '#1A1A1A';

// ── Charger une image (URL) → HTMLImageElement ────────────
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('Image non chargeable : ' + src));
    img.src = src;
  });
}

// ── Dessiner le badge sur un <canvas> ────────────────────
async function drawBadge(canvas, agent, entreprise) {
  const ctx = canvas.getContext('2d');
  canvas.width  = W;
  canvas.height = H;

  // ── 1. Fond blanc total ──
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // ── 2. Bandeau or en haut (hauteur ≈ 28% du badge) ──
  const bandeauH = Math.round(H * 0.28);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 0, W, bandeauH);

  // ── 3. Watermark « FASO ARMORED » répété sur la zone blanche ──
  ctx.save();
  ctx.font = 'bold 13px Arial';
  ctx.fillStyle = 'rgba(184,151,42,0.13)';
  ctx.textAlign = 'left';
  const wmText = 'FASO ARMORED  ';
  const wmRows = Math.ceil((H - bandeauH) / 22) + 2;
  const wmCols = Math.ceil(W / (ctx.measureText(wmText).width)) + 2;
  for (let r = 0; r < wmRows; r++) {
    for (let c = 0; c < wmCols; c++) {
      ctx.fillText(wmText, c * ctx.measureText(wmText).width - 20, bandeauH + r * 22 + 10);
    }
  }
  ctx.restore();

  // ── 4. Logo entreprise (si dispo) dans le bandeau or ──
  const logoY = 14;
  const logoMaxH = bandeauH - 46;  // laisser place au nom entreprise
  if (entreprise?.logo_url) {
    try {
      const logoImg = await loadImage(entreprise.logo_url);
      const ratio = logoImg.width / logoImg.height;
      const lH = Math.min(logoMaxH, 64);
      const lW = lH * ratio;
      ctx.drawImage(logoImg, (W - lW) / 2, logoY, lW, lH);
    } catch (_) { /* si le logo échoue, on affiche le texte */ }
  }

  // ── 5. Nom de l'entreprise en bas du bandeau or ──
  const nomEntreprise = (entreprise?.nom || 'ENTREPRISE').toUpperCase();
  ctx.font = 'bold 15px Arial';
  ctx.fillStyle = MAROON;
  ctx.textAlign = 'center';
  ctx.fillText(nomEntreprise, W / 2, bandeauH - 10);

  // ── 6. Photo ronde (chevauchant le bandeau) ──
  const photoR  = 60;  // rayon
  const photoCX = W / 2;
  const photoCY = bandeauH + 10;  // centre légèrement sous le bandeau

  // Cercle fond beige
  ctx.save();
  ctx.beginPath();
  ctx.arc(photoCX, photoCY, photoR + 6, 0, Math.PI * 2);
  ctx.fillStyle = '#D4B483';
  ctx.fill();
  ctx.restore();

  // Clip circulaire pour la photo
  ctx.save();
  ctx.beginPath();
  ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2);
  ctx.clip();

  if (agent.photo_url) {
    try {
      const photoImg = await loadImage(agent.photo_url);
      // Centrer et couvrir le cercle
      const side = photoR * 2;
      const srcRatio = photoImg.width / photoImg.height;
      let drawW, drawH, offsetX, offsetY;
      if (srcRatio > 1) {
        drawH = side; drawW = side * srcRatio;
        offsetX = photoCX - drawW / 2; offsetY = photoCY - side / 2;
      } else {
        drawW = side; drawH = side / srcRatio;
        offsetX = photoCX - side / 2; offsetY = photoCY - drawH / 2;
      }
      ctx.drawImage(photoImg, offsetX, offsetY, drawW, drawH);
    } catch (_) {
      // Silhouette fallback — draw head + shoulders with canvas paths
      ctx.fillStyle = '#d1d5db';
      ctx.beginPath();
      ctx.arc(photoCX, photoCY, photoR, 0, Math.PI * 2);
      ctx.fill();
      // Head circle
      const headR = photoR * 0.38;
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(photoCX, photoCY - photoR * 0.18, headR, 0, Math.PI * 2);
      ctx.fill();
      // Shoulders arc
      ctx.beginPath();
      ctx.arc(photoCX, photoCY + photoR * 0.9, photoR * 0.72, Math.PI, 0);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(photoCX - photoR, photoCY - photoR, photoR * 2, photoR * 2);
    ctx.font = `${photoR * 0.8}px Arial`;
    ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', photoCX, photoCY);
  }
  ctx.restore();
  ctx.textBaseline = 'alphabetic';

  // ── 7. Nom de l'agent ──
  const nomY = photoCY + photoR + 30;
  const nomAgent = `${(agent.nom || '').toUpperCase()} ${(agent.prenom || '').toUpperCase()}`.trim();
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = MAROON;
  ctx.textAlign = 'center';
  // Réduire si trop long
  let fontSize = 20;
  while (ctx.measureText(nomAgent).width > W - 30 && fontSize > 11) {
    fontSize--;
    ctx.font = `bold ${fontSize}px Arial`;
  }
  ctx.fillText(nomAgent, W / 2, nomY);

  // ── 8. Bandeau brun « poste » ──
  const posteY = nomY + 10;
  const posteH = 28;
  ctx.fillStyle = MAROON;
  ctx.fillRect(20, posteY, W - 40, posteH);
  ctx.font = 'bold 12px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  const poste = (agent.poste || 'POSTE').toUpperCase();
  ctx.fillText(poste, W / 2, posteY + 19);

  // ── 9. Téléphone ──
  const telY = posteY + posteH + 28;
  const tel = agent.telephone ? `TEL:  ${agent.telephone}` : '';
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'center';
  ctx.fillText(tel, W / 2, telY);

  // ── 10. Ligne de séparation avant signature ──
  const ligneY = H - 140;
  ctx.strokeStyle = MAROON;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20, ligneY);
  ctx.lineTo(W - 20, ligneY);
  ctx.stroke();

  // ── 11. Texte « Signature » (cursif simulé) ──
  ctx.font = 'italic 16px Georgia';
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'center';
  ctx.fillText('Signature', W / 2, ligneY + 28);

  // ── 12. Ligne après signature ──
  ctx.strokeStyle = MAROON;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(20, ligneY + 40);
  ctx.lineTo(W - 20, ligneY + 40);
  ctx.stroke();

  // ── 13. « Le Directeur Général » ──
  ctx.font = '12px Georgia';
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'center';
  ctx.fillText('Le Directeur Général', W / 2, H - 26);
}

// ── Composant principal ──────────────────────────────────
export default function Badge({ agents, entreprise }) {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [generating, setGenerating]       = useState(false);
  const canvasRef = useRef(null);

  const agent = agents.find(a => a.id === selectedAgent);

  // Redessiner le preview quand l'agent change
  useEffect(() => {
    if (!agent || !canvasRef.current) return;
    drawBadge(canvasRef.current, agent, entreprise).catch(() => {});
  }, [agent, entreprise]);

  // ── Télécharger en PDF ──────────────────────────────
  async function handleDownloadPDF() {
    if (!agent) { showToast('Veuillez sélectionner un agent', 'error'); return; }
    setGenerating(true);
    try {
      const canvas = document.createElement('canvas');
      await drawBadge(canvas, agent, entreprise);
      const imgData = canvas.toDataURL('image/png', 1.0);

      // Format carte : 54×86 mm
      const doc = new jsPDF({ unit: 'mm', format: [54, 86], orientation: 'portrait' });
      doc.addImage(imgData, 'PNG', 0, 0, 54, 86);
      doc.save(`badge_${agent.nom}_${agent.prenom}.pdf`);
      showToast('Badge PDF téléchargé avec succès');
    } catch (e) {
      showToast('Impossible de générer le badge. Réessayez.', 'error');
    }
    setGenerating(false);
  }

  // ── Imprimer ─────────────────────────────────────────
  async function handlePrint() {
    if (!agent) { showToast('Veuillez sélectionner un agent', 'error'); return; }
    setGenerating(true);
    try {
      const canvas = document.createElement('canvas');
      await drawBadge(canvas, agent, entreprise);
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const win = window.open('', '_blank');
      win.document.write(`
        <html><head><title>Badge — ${agent.prenom} ${agent.nom}</title>
        <style>
          @page { size: 54mm 86mm; margin: 0; }
          body { margin: 0; display: flex; justify-content: center; align-items: center; }
          img { width: 54mm; height: 86mm; display: block; }
        </style></head>
        <body><img src="${dataUrl}" /></body></html>
      `);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); win.close(); }, 400);
      showToast('Impression lancée');
    } catch (e) {
      showToast('Impossible d\'imprimer le badge. Réessayez.', 'error');
    }
    setGenerating(false);
  }

  return (
    <div>

      {/* ── Sélection agent ── */}
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
          <p style={{ fontSize: 13, color: '#A3A3A3', marginBottom: 16, fontFamily: 'Poppins, sans-serif' }}>
            Sélectionnez un agent pour prévisualiser et générer son badge au format carte (54×86 mm).
          </p>
          <select
            className="filter-select"
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">— Sélectionner un agent —</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>
                {a.prenom} {a.nom} — {a.poste}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Zone principale ── */}
      {!agent ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: '#A3A3A3',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: '#F5F5F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CreditCard size={32} color="#D4D4D4" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#737373', marginBottom: 6, fontFamily: 'Poppins, sans-serif' }}>
            Aucun agent sélectionné
          </p>
          <p style={{ fontSize: 13 }}>
            Choisissez un agent dans la liste ci-dessus pour générer son badge
          </p>
        </div>
      ) : (
        <div style={{
          display: 'flex', gap: 40, alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}>

          {/* Prévisualisation */}
          <div style={{ flex: '0 0 auto' }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#737373',
              marginBottom: 12, fontFamily: 'Poppins, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Prévisualisation
            </div>
            <div style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              borderRadius: 10,
              overflow: 'hidden',
              display: 'inline-block',
              border: '1px solid #E5E5E5',
            }}>
              <canvas
                ref={canvasRef}
                style={{
                  display: 'block',
                  width: 204,   // 54mm @ 96dpi
                  height: 325,  // 86mm @ 96dpi
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#737373',
              marginBottom: 12, fontFamily: 'Poppins, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Actions
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={handleDownloadPDF}
                disabled={generating}
                style={{ justifyContent: 'center', gap: 10 }}
              >
                <Download size={16} />
                {generating ? 'Génération...' : 'Télécharger le badge (PDF)'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={handlePrint}
                disabled={generating}
                style={{ justifyContent: 'center', gap: 10 }}
              >
                <Printer size={16} />
                Imprimer
              </button>
            </div>

            {/* Info agent */}
            <div style={{
              marginTop: 24,
              padding: '14px 16px',
              background: '#FFFBF5',
              border: '1px solid #FDDBA0',
              borderRadius: 10,
              fontSize: 12,
              fontFamily: 'Poppins, sans-serif',
              lineHeight: 2,
            }}>
              {[
                { label: 'Nom',       value: `${agent.prenom} ${agent.nom}` },
                { label: 'Poste',     value: agent.poste || '—' },
                { label: 'Téléphone', value: agent.telephone || '—' },
                { label: 'Photo',     value: agent.photo_url ? '● Disponible' : '○ Aucune photo', photoStatus: agent.photo_url ? 'ok' : 'warn' },
              ].map(row => (
                <div key={row.label}>
                  <span style={{ color: '#A3A3A3' }}>{row.label} : </span>
                  <span style={{
                    fontWeight: 600,
                    color: row.photoStatus === 'ok' ? '#16a34a' : row.photoStatus === 'warn' ? '#d97706' : '#0F0F0F'
                  }}>{row.value}</span>
                </div>
              ))}
              {!agent.photo_url && (
                <div style={{
                  marginTop: 10, padding: '8px 10px',
                  background: '#FEF3CD', borderRadius: 6,
                  color: '#92400E', fontSize: 11,
                }}>
                  ℹ️ Ajoutez une photo à cet agent pour un badge complet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
