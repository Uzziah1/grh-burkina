// BulletinPreview.js - Visual A4 payroll bulletin preview
// Clean black & white table layout, print-friendly

import React from 'react';
import { formatFCFA } from '../lib/calcPaie';

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// ── Table row ────────────────────────────────────────────
function Row({ label, value, bold, muted, indent }) {
  return (
    <tr>
      <td style={{
        padding: '5px 12px',
        paddingLeft: indent ? 28 : 12,
        fontSize: 11.5,
        color: '#1A1A1A',
        fontWeight: bold ? 700 : 400,
        borderBottom: '1px solid #DDDDDD',
        opacity: muted ? 0.65 : 1,
      }}>
        {label}
      </td>
      <td style={{
        padding: '5px 12px',
        fontSize: 11.5,
        color: '#1A1A1A',
        fontWeight: bold ? 700 : 500,
        textAlign: 'right',
        borderBottom: '1px solid #DDDDDD',
        opacity: muted ? 0.65 : 1,
        whiteSpace: 'nowrap',
      }}>
        {formatFCFA(value)}
      </td>
    </tr>
  );
}

// ── Section band header ─────────────────────────────────
function Band({ label }) {
  return (
    <tr>
      <td colSpan={2} style={{
        padding: '6px 12px',
        background: '#1A1A1A',
        fontSize: 10.5, fontWeight: 700, color: '#fff',
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {label}
      </td>
    </tr>
  );
}

// ── Total row ────────────────────────────────────────────
function TotalRow({ label, value, big }) {
  return (
    <tr>
      <td style={{
        padding: big ? '10px 12px' : '8px 12px',
        background: '#F0F0F0',
        fontSize: big ? 14 : 12.5,
        fontWeight: 800, color: '#0F0F0F',
        borderTop: '2px solid #1A1A1A',
        borderBottom: '2px solid #1A1A1A',
      }}>
        {label}
      </td>
      <td style={{
        padding: big ? '10px 12px' : '8px 12px',
        background: '#F0F0F0',
        fontSize: big ? 14 : 12.5,
        fontWeight: 800, color: '#0F0F0F',
        textAlign: 'right',
        borderTop: '2px solid #1A1A1A',
        borderBottom: '2px solid #1A1A1A',
        whiteSpace: 'nowrap',
      }}>
        {formatFCFA(value)}
      </td>
    </tr>
  );
}

// ── Main bulletin preview component ────────────────────────
export default function BulletinPreview({ form, preview, agent, entreprise }) {
  const today = new Date().toLocaleDateString('fr-FR');
  const periode = `${MOIS[(form.mois || 1) - 1]} ${form.annee || ''}`;

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

  const earnings = [
    { l: 'Salaire de base',        v: form.salaire_base },
    { l: 'Sursalaire',             v: form.sursalaire },
    { l: 'Indemnité de logement',  v: form.indemnite_logement },
    { l: 'Indemnité de transport', v: form.indemnite_transport },
    { l: 'Indemnité de fonction',  v: form.indemnite_fonction },
    { l: 'Prime d\'ancienneté',    v: form.prime_anciennete },
    { l: 'Autres primes',          v: form.autres_primes },
    { l: 'Heures supplémentaires', v: form.heures_sup },
  ].filter(r => parseFloat(r.v) > 0);

  return (
    <div
      id="bulletin-printable"
      style={{
        width: '100%',
        background: '#fff',
        border: '1px solid #1A1A1A',
        fontFamily: "'Poppins', sans-serif",
        color: '#1A1A1A',
      }}
    >

      {/* ── Header: logo + company ── */}
      <div style={{
        borderBottom: '2px solid #1A1A1A',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {entreprise?.logo_url ? (
          <img
            src={entreprise.logo_url}
            alt="Logo"
            style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 56, height: 56,
            border: '1px dashed #D4D4D4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: '#A3A3A3', fontSize: 9,
          }}>
            LOGO
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>
            {entreprise?.nom || 'Nom de l\'entreprise'}
          </div>
          <div style={{ fontSize: 10.5, color: '#525252', marginTop: 2 }}>
            {[
              entreprise?.siege_social,
              entreprise?.rccm ? `RCCM: ${entreprise.rccm}` : '',
              entreprise?.cnss_employeur ? `CNSS Employeur: ${entreprise.cnss_employeur}` : '',
            ].filter(Boolean).join('  |  ')}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 10.5, color: '#525252' }}>
          <div>Bulletin édité le</div>
          <div style={{ fontWeight: 700 }}>{today}</div>
        </div>
      </div>

      {/* ── Title bar ── */}
      <div style={{
        borderBottom: '2px solid #1A1A1A',
        padding: '10px 24px',
        textAlign: 'center',
      }}>
        <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.5px' }}>
          BULLETIN DE PAIE — {periode.toUpperCase()}
        </div>
      </div>

      {/* ── Employer / Employee info ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        borderBottom: '2px solid #1A1A1A',
      }}>
        <div style={{ padding: '14px 24px', borderRight: '1px solid #D4D4D4' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#737373', textTransform: 'uppercase', marginBottom: 6 }}>
            Employeur
          </div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{entreprise?.nom || '—'}</div>
          <div style={{ fontSize: 11, color: '#525252', marginTop: 2 }}>
            Représenté par : {entreprise?.representant || '—'}
          </div>
          <div style={{ fontSize: 11, color: '#525252' }}>
            {entreprise?.qualite_representant || ''}
          </div>
        </div>
        <div style={{ padding: '14px 24px' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#737373', textTransform: 'uppercase', marginBottom: 6 }}>
            Employé(e)
          </div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {agent.prenom} {agent.nom}
          </div>
          <div style={{ fontSize: 11, color: '#525252', marginTop: 2 }}>
            {agent.poste || '—'} {agent.departement ? `— ${agent.departement}` : ''}
          </div>
          <div style={{ fontSize: 11, color: '#525252' }}>
            Matricule : {agent.matricule || '—'} | CNSS : {agent.cnss || '—'}
          </div>
        </div>
      </div>

      {/* ── Main table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>

          {/* Earnings */}
          <Band label="Éléments de rémunération" />
          {earnings.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ padding: '12px 24px', fontSize: 11, color: '#A3A3A3', fontStyle: 'italic' }}>
                Aucun élément saisi
              </td>
            </tr>
          ) : earnings.map(e => <Row key={e.l} label={e.l} value={e.v} />)}
          <TotalRow label="SALAIRE BRUT" value={preview?.salaire_brut} />

          {/* Tax base detail */}
          {preview && (
            <>
              <Band label="Base imposable IUTS" />
              <Row label="Salaire imposable (brut − contrôle CNSS)" value={preview.salaire_brut_imposable} muted />
              <Row label="Exonération logement"  value={-preview.exo_logement} muted indent />
              <Row label="Exonération transport" value={-preview.exo_transport} muted indent />
              <Row label="Exonération fonction"  value={-preview.exo_fonction} muted indent />
              <Row label="Abattement forfaitaire (25% base)" value={-preview.abattement_forfaitaire} muted />
              <TotalRow label="Base IUTS (arrondie)" value={preview.base_iuts} />
            </>
          )}

          {/* Deductions */}
          <Band label="Retenues" />
          <Row label="CNSS salarié (5.5%, plafond 44 000 FCFA)" value={preview?.cnss_salarial} />
          <Row label="IUTS brut (barème progressif)" value={preview?.iuts_brut} muted />
          <Row label={`Abattement charges familiales (${preview?.personnes_a_charge || 0} pers.)`} value={-(preview?.abattement_familial || 0)} muted indent />
          <Row label="IUTS net à retenir" value={preview?.iuts} bold />
          <TotalRow label="TOTAL RETENUES" value={preview?.total_retenues} />

          {/* Other deductions */}
          {preview && (parseFloat(form.autres_retenues) > 0 || preview.retenue_effort_guerre > 0 || parseFloat(form.avance_salaire) > 0) && (
            <>
              <Band label="Autres déductions" />
              {parseFloat(form.autres_retenues) > 0 && <Row label="Autres retenues" value={form.autres_retenues} />}
              <Row label="Retenue 1% (effort de guerre)" value={preview.retenue_effort_guerre} />
              {parseFloat(form.avance_salaire) > 0 && <Row label="Avance sur salaire" value={form.avance_salaire} />}
            </>
          )}

          {/* Net salary */}
          <TotalRow label="NET À PAYER" value={preview?.salaire_net} big />

          {/* Employer charge note */}
          <tr>
            <td colSpan={2} style={{ padding: '8px 12px', fontSize: 10.5, color: '#737373' }}>
              Charge patronale CNSS (16%) : <strong>{formatFCFA(preview?.cnss_patronal)}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Signatures ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 20, padding: '24px 24px 16px',
        borderTop: '2px solid #1A1A1A',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
            {entreprise?.qualite_representant || 'L\'EMPLOYEUR'}
          </div>
          {entreprise?.mention_signataire && (
            <div style={{ fontSize: 9, color: '#A3A3A3', fontStyle: 'italic', marginBottom: 14 }}>
              {entreprise.mention_signataire}
            </div>
          )}
          {!entreprise?.mention_signataire && <div style={{ marginBottom: 26 }} />}
          <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: 4, fontSize: 10, fontWeight: 600 }}>
            {entreprise?.representant || '—'}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
            L'EMPLOYÉ(E)
          </div>
          <div style={{ fontSize: 9, color: '#A3A3A3', fontStyle: 'italic', marginBottom: 14 }}>
            Lu et approuvé
          </div>
          <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: 4, fontSize: 10, fontWeight: 600 }}>
            {agent.prenom} {agent.nom}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: '1px solid #D4D4D4',
        padding: '10px 24px',
        textAlign: 'center',
      }}>
        {entreprise?.pied_de_page && (
          <div style={{ fontSize: 10, color: '#737373', fontStyle: 'italic', marginBottom: 4 }}>
            {entreprise.pied_de_page}
          </div>
        )}
        <div style={{ fontSize: 9, color: '#A3A3A3' }}>
          Document confidentiel — Généré le {today}
        </div>
      </div>
    </div>
  );
}