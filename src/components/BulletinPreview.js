// BulletinPreview.js - Bulletin de paie format Excel FASO ARMORED
// Layout identique au modèle Excel fourni

import React from 'react';
// formatFCFA importé pour compatibilité externe si besoin


// ── Styles de base ────────────────────────────────────────
const BASE = {
  fontFamily: "'Arial', sans-serif",
  fontSize: 11,
  color: '#1A1A1A',
};

const CELL = {
  border: '1px solid #999',
  padding: '3px 6px',
  fontSize: 11,
  verticalAlign: 'middle',
};

const CELL_BOLD = { ...CELL, fontWeight: 700 };
const CELL_ITALIC = { ...CELL, fontStyle: 'italic' };
const CELL_RIGHT = { ...CELL, textAlign: 'right' };
const CELL_RIGHT_BOLD = { ...CELL, textAlign: 'right', fontWeight: 700 };
const CELL_RIGHT_ITALIC = { ...CELL, textAlign: 'right', fontStyle: 'italic' };

// Cellule sans bordure gauche/droite pour les lignes de regroupement
function fmt(v) {
  if (v === null || v === undefined || v === 0 || v === '0' || v === '') return '';
  const n = parseFloat(v);
  if (isNaN(n) || n === 0) return '';
  return Math.round(n).toLocaleString('fr-FR');
}

export default function BulletinPreview({ form, preview, agent, entreprise }) {
  if (!agent) {
    return (
      <div style={{
        width: '100%', minHeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#FAFAFA', borderRadius: 12,
        border: '1px dashed #D4D4D4', color: '#A3A3A3', fontSize: 13,
      }}>
        Sélectionnez un agent pour afficher l'aperçu du bulletin
      </div>
    );
  }

  const moisIdx = (form.mois || 1) - 1;
  const annee = form.annee || '';

  // Calcul date début/fin du mois
  const dateDebut = `01/${String(form.mois || 1).padStart(2, '0')}/${annee}`;
  const lastDay = new Date(annee, form.mois || 1, 0).getDate();
  const dateFin = `${lastDay}/${String(form.mois || 1).padStart(2, '0')}/${annee}`;

  const nomComplet = `${(agent.prenom || '').toUpperCase()} ${(agent.nom || '').toUpperCase()}`.trim();

  // Date d'embauche
  const dateEmb = agent.date_embauche
    ? new Date(agent.date_embauche).toLocaleDateString('fr-FR')
    : '—';

  // Calcul ancienneté
  let anciennete = '-';
  if (agent.date_embauche) {
    const emb = new Date(agent.date_embauche);
    const ref = new Date(annee, moisIdx, 1);
    const moisAnc = (ref.getFullYear() - emb.getFullYear()) * 12 + (ref.getMonth() - emb.getMonth());
    if (moisAnc >= 12) {
      const ans = Math.floor(moisAnc / 12);
      anciennete = `${ans} an${ans > 1 ? 's' : ''}`;
    } else if (moisAnc > 0) {
      anciennete = `${moisAnc} mois`;
    }
  }

  const p = preview || {};

  // Exonérations : plafond calculable vs retenu réel
  const exoLogementPlafond = p.exo_logement != null ? fmt(Math.min(
    (p.salaire_brut_imposable || 0) * 0.20, 75000
  )) : '';
  const exoTransportPlafond = p.exo_transport != null ? fmt(Math.min(
    (p.salaire_brut_imposable || 0) * 0.05, 30000
  )) : '';
  const exoFonctionPlafond = p.exo_fonction != null ? fmt(Math.min(
    (p.salaire_brut_imposable || 0) * 0.05, 50000
  )) : '';

  return (
    <div
      id="bulletin-printable"
      style={{
        ...BASE,
        width: '100%',
        background: '#fff',
        padding: '20px 24px',
        boxSizing: 'border-box',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '35%' }} />
          <col style={{ width: '35%' }} />
          <col style={{ width: '30%' }} />
        </colgroup>
        <tbody>

          {/* ── Titre ── */}
          <tr>
            <td colSpan={3} style={{
              ...CELL,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 12,
              background: '#F5C6C6',
              padding: '5px 8px',
            }}>
              BULLETIN DE PAIE DE {nomComplet}
            </td>
          </tr>

          {/* ── Période ── */}
          <tr>
            <td style={{ ...CELL, borderRight: 'none' }}>Période du :</td>
            <td colSpan={2} style={{ ...CELL, borderLeft: 'none' }}>
              {dateDebut} AU {dateFin}
            </td>
          </tr>

          {/* ── En-têtes colonnes ── */}
          <tr>
            <td style={{ ...CELL_BOLD, textAlign: 'center' }}>Employeur :</td>
            <td style={{ ...CELL_BOLD, textAlign: 'center' }}>Organisme social</td>
            <td style={{ ...CELL_BOLD, textAlign: 'center' }}>Employé</td>
          </tr>

          {/* ── Infos employeur / CNSS / employé ── */}
          <tr>
            <td style={{ ...CELL, verticalAlign: 'top', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700 }}>{entreprise?.nom || 'FASO ARMORED'}</div>
              {entreprise?.telephone && <div>Tél: {entreprise.telephone}</div>}
              {entreprise?.rccm && <div>RCCM: {entreprise.rccm}</div>}
              {entreprise?.ifu && <div>IFU: {entreprise.ifu}</div>}
              <div style={{ marginTop: 4 }}>Date d'embauche</div>
              <div>{dateEmb}</div>
            </td>
            <td style={{ ...CELL, verticalAlign: 'top', lineHeight: 1.6 }}>
              <div>Caisse Nationale de Sécurité Sociale (CNSS)</div>
              {entreprise?.cnss_employeur && <div>N° : {entreprise.cnss_employeur}</div>}
            </td>
            <td style={{ ...CELL, verticalAlign: 'top', fontWeight: 700 }}>
              {nomComplet}
              {agent.cnss && <div style={{ fontWeight: 400, marginTop: 4 }}>CNSS : {agent.cnss}</div>}
            </td>
          </tr>

          {/* ── Emploi / Catégorie / Charges / Ancienneté ── */}
          <tr>
            <td style={CELL}>Emploi</td>
            <td style={CELL}>Catégorie</td>
            <td style={CELL}>Charges familiales &nbsp;&nbsp;&nbsp; Ancienneté</td>
          </tr>
          <tr>
            <td style={CELL_BOLD}>{(agent.poste || '').toUpperCase()}</td>
            <td style={CELL_BOLD}>{(agent.categorie || agent.type_contrat || '').toUpperCase()}</td>
            <td style={CELL_BOLD}>
              {p.personnes_a_charge || 0}
              <span style={{ float: 'right', fontWeight: 400 }}>{anciennete}</span>
            </td>
          </tr>

          {/* ── Salaire de base ── */}
          <tr>
            <td style={CELL_BOLD}>Salaire de base</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT_BOLD}>{fmt(form.salaire_base)}</td>
          </tr>

          {/* ── Indemnités ── */}
          <tr>
            <td style={{ ...CELL, borderBottom: 'none' }}>Indemnités</td>
            <td style={CELL}></td>
            <td style={CELL}></td>
          </tr>
          <tr>
            <td style={{ ...CELL, borderTop: 'none', borderBottom: 'none', paddingLeft: 18 }}>- logement</td>
            <td style={CELL}></td>
            <td style={{ ...CELL, textAlign: 'right', background: parseFloat(form.indemnite_logement) > 0 ? '#F0F4EC' : undefined }}>
              {fmt(form.indemnite_logement)}
            </td>
          </tr>
          <tr>
            <td style={{ ...CELL, borderTop: 'none', borderBottom: 'none', paddingLeft: 18 }}>- transport</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT}>{fmt(form.indemnite_transport)}</td>
          </tr>
          <tr>
            <td style={{ ...CELL, borderTop: 'none', borderBottom: 'none', paddingLeft: 18 }}>- fonction</td>
            <td style={CELL}></td>
            <td style={{ ...CELL, textAlign: 'right', background: parseFloat(form.indemnite_fonction) > 0 ? '#F0F4EC' : undefined }}>
              {fmt(form.indemnite_fonction)}
            </td>
          </tr>
          <tr>
            <td style={{ ...CELL, borderTop: 'none', paddingLeft: 18 }}>- autre</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT}>
              {fmt((parseFloat(form.sursalaire) || 0) + (parseFloat(form.prime_anciennete) || 0) + (parseFloat(form.autres_primes) || 0) + (parseFloat(form.heures_sup) || 0))}
            </td>
          </tr>

          {/* ── Salaire brut ── */}
          <tr>
            <td style={CELL_BOLD}>Salaire brut</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT_BOLD}>{fmt(p.salaire_brut)}</td>
          </tr>

          {/* ── CNSS ── */}
          <tr>
            <td style={CELL_ITALIC}>CNSS</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT_ITALIC}>{fmt(p.cnss_salarial)}</td>
          </tr>

          {/* ── Salaire imposable ── */}
          <tr>
            <td style={CELL}>Salaire imposable</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT}>{fmt(p.salaire_brut ? p.salaire_brut - (p.cnss_salarial || 0) : 0)}</td>
          </tr>

          {/* ── Contrôle CNSS fiscal ── */}
          <tr>
            <td style={CELL_ITALIC}>Contrôle CNSS (fiscal)</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT_ITALIC}>{fmt(p.controle_cnss_fiscal)}</td>
          </tr>

          {/* ── Salaire imposable IUTS ── */}
          <tr>
            <td style={CELL_BOLD}>Salaire imposable IUTS</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT_BOLD}>{fmt(p.salaire_brut_imposable)}</td>
          </tr>

          {/* ── Contrôle des indemnités ── */}
          <tr>
            <td style={{ ...CELL, borderBottom: 'none' }}>Contrôle des indemnités</td>
            <td style={CELL}></td>
            <td style={CELL}></td>
          </tr>
          <tr>
            <td style={{ ...CELL, borderTop: 'none', borderBottom: 'none', paddingLeft: 18 }}>- logement</td>
            <td style={{ ...CELL, textAlign: 'right' }}>{exoLogementPlafond}</td>
            <td style={CELL_RIGHT}>{fmt(p.exo_logement)}</td>
          </tr>
          <tr>
            <td style={{ ...CELL, borderTop: 'none', borderBottom: 'none', paddingLeft: 18 }}>- transport</td>
            <td style={{ ...CELL, textAlign: 'right' }}>{exoTransportPlafond}</td>
            <td style={CELL_RIGHT}>{fmt(p.exo_transport)}</td>
          </tr>
          <tr>
            <td style={{ ...CELL, borderTop: 'none', paddingLeft: 18 }}>- fonction</td>
            <td style={{ ...CELL, textAlign: 'right' }}>{exoFonctionPlafond}</td>
            <td style={CELL_RIGHT}>{fmt(p.exo_fonction)}</td>
          </tr>

          {/* ── Total exonérations ── */}
          <tr>
            <td style={CELL_ITALIC}>Total exonérations</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT_ITALIC}>{fmt(p.total_exonerations)}</td>
          </tr>

          {/* ── Abattement forfaitaire ── */}
          <tr>
            <td style={CELL_ITALIC}>Abattement forf.</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT_ITALIC}>{fmt(p.abattement_forfaitaire)}</td>
          </tr>

          {/* ── Base IUTS ── */}
          <tr>
            <td style={CELL}>Base IUTS</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT}>{fmt(p.base_iuts)}</td>
          </tr>

          {/* ── IUTS ── */}
          <tr>
            <td style={CELL_ITALIC}>IUTS</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT_ITALIC}>{fmt(p.iuts_brut)}</td>
          </tr>

          {/* ── Personnes à charge ── */}
          <tr>
            <td style={CELL}>Personnes à charge</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT}>{fmt(p.personnes_a_charge)}</td>
          </tr>

          {/* ── Abattement familial ── */}
          <tr>
            <td style={CELL}>Abattement</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT}>{fmt(p.abattement_familial)}</td>
          </tr>

          {/* ── Net IUTS ── */}
          <tr>
            <td style={CELL_ITALIC}>Net IUTS</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT_ITALIC}>{fmt(p.iuts)}</td>
          </tr>

          {/* ── Retenues ── */}
          <tr>
            <td style={CELL}>Retenues acomptes</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT}></td>
          </tr>
          <tr>
            <td style={CELL}>Retenues prêts</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT}></td>
          </tr>
          <tr>
            <td style={CELL}>Autres retenues</td>
            <td style={CELL}></td>
            <td style={CELL_RIGHT}>
              {(() => {
                const ar = parseFloat(form.autres_retenues) || 0;
                const av = parseFloat(form.avance_salaire) || 0;
                return fmt(ar + av);
              })()}
            </td>
          </tr>

          {/* ── Salaire net ── */}
          <tr>
            <td style={{ ...CELL_BOLD, fontSize: 12 }}>Salaire net</td>
            <td style={CELL}></td>
            <td style={{ ...CELL_RIGHT_BOLD, fontSize: 12 }}>{fmt(p.salaire_net)}</td>
          </tr>

        </tbody>
      </table>

      {/* ── Signatures ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        marginTop: 24, gap: 20,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 11 }}>Le Responsable RH</div>
          <div style={{ marginTop: 32, borderTop: '1px solid #1A1A1A', paddingTop: 4, fontSize: 11 }}>
            {entreprise?.representant || '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 11 }}>L'employé</div>
          <div style={{ marginTop: 32, borderTop: '1px solid #1A1A1A', paddingTop: 4, fontSize: 11 }}>
            {nomComplet}
          </div>
        </div>
      </div>
    </div>
  );
}
