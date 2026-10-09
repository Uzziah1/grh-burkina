// EtatSalaires.js - Monthly payroll summary page
// Mirrors the Excel "ETAT DES SALAIRES" layout exactly (single bloc, no category split)

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { peutFaire } from '../lib/useProfil';
import {
  FileSpreadsheet, Printer, FileText,
  Users, DollarSign, Calendar,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Months ────────────────────────────────────────────────
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const NOW = new Date();

// ── Helpers ───────────────────────────────────────────────
function fmt(val) {
  return Math.round(parseFloat(val) || 0).toLocaleString('fr-FR');
}

// For PDF (no locale, space separator)
function fmtPDF(val) {
  const n = Math.round(parseFloat(val) || 0);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function sum(arr, key) {
  return arr.reduce((s, b) => s + (parseFloat(b[key]) || 0), 0);
}

function getEtatNum(mois, annee) {
  return `${String(mois).padStart(3, '0')}/${annee}`;
}

// ── PDF export — paysage, miroir du tableau Excel ─────────
function generateEtatPDF(bulletins, entreprise, mois, annee) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const today = new Date().toLocaleDateString('fr-FR');
  const etatNum = getEtatNum(mois, annee);
  const nomMois = MOIS[mois - 1].toUpperCase();
  const nomEntreprise = (entreprise?.nom || 'L\'ENTREPRISE').toUpperCase();
  const ville = entreprise?.ville || 'OUAGADOUGOU';

  // En-tête
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${ville}, le ${today}`, 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `ETAT N°${etatNum}/RECAPITULATIF DES SALAIRES DE ${nomEntreprise} DU MOIS DE ${nomMois} ${annee}`,
    148, 20, { align: 'center' }
  );

  // En-têtes colonnes (2 niveaux comme dans Excel)
  const head = [
    [
      { content: 'N°',            rowSpan: 2 },
      { content: 'Noms et prénoms', rowSpan: 2 },
      { content: 'Fonction',      rowSpan: 2 },
      { content: 'Salaire de base', rowSpan: 2 },
      { content: 'AVANTAGES',     colSpan: 4, styles: { halign: 'center' } },
      { content: 'Salaire brut',  rowSpan: 2 },
      { content: 'Nb jours',      rowSpan: 2 },
      { content: 'RETENUES',      colSpan: 2, styles: { halign: 'center' } },
      { content: 'Sal. avant déd.', rowSpan: 2 },
      { content: 'Retenue 1%',    rowSpan: 2 },
      { content: 'Avance',        rowSpan: 2 },
      { content: 'Salaire net',   rowSpan: 2 },
    ],
    [
      'Indem Resp', 'Indem H.Sup', 'Indem Logmt', 'Indem Trsprt',
      'CNSS', 'IUTS',
    ],
  ];

  const body = bulletins.map((b, i) => [
    i + 1,
    `${b.agents?.prenom || ''} ${b.agents?.nom || ''}`.trim(),
    b.agents?.poste || '',
    fmtPDF(b.salaire_base),
    fmtPDF(b.indemnite_fonction),
    fmtPDF(b.heures_sup || 0),
    fmtPDF(b.indemnite_logement),
    fmtPDF(b.indemnite_transport),
    fmtPDF(b.salaire_brut),
    b.jours_travailles || 'MOIS PLEIN',
    fmtPDF(b.cnss_salarial),
    fmtPDF(b.iuts),
    fmtPDF(b.salaire_net_avant_deduction),
    fmtPDF(b.retenue_effort_guerre),
    fmtPDF(b.avance_salaire),
    fmtPDF(b.salaire_net),
  ]);

  const totRow = [
    { content: '', styles: { fontStyle: 'bold' } },
    { content: 'TOTAL GÉNÉRAL', styles: { fontStyle: 'bold' } },
    '',
    fmtPDF(sum(bulletins, 'salaire_base')),
    fmtPDF(sum(bulletins, 'indemnite_fonction')),
    fmtPDF(sum(bulletins, 'heures_sup')),
    fmtPDF(sum(bulletins, 'indemnite_logement')),
    fmtPDF(sum(bulletins, 'indemnite_transport')),
    fmtPDF(sum(bulletins, 'salaire_brut')),
    '',
    fmtPDF(sum(bulletins, 'cnss_salarial')),
    fmtPDF(sum(bulletins, 'iuts')),
    fmtPDF(sum(bulletins, 'salaire_net_avant_deduction')),
    fmtPDF(sum(bulletins, 'retenue_effort_guerre')),
    fmtPDF(sum(bulletins, 'avance_salaire')),
    fmtPDF(sum(bulletins, 'salaire_net')),
  ];

  autoTable(doc, {
    head,
    body: [...body, totRow],
    startY: 25,
    theme: 'grid',
    styles: {
      fontSize: 6.5, font: 'helvetica',
      textColor: [26, 26, 26],
      lineColor: [26, 26, 26], lineWidth: 0.2,
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [26, 26, 26], textColor: [255, 255, 255],
      fontStyle: 'bold', halign: 'center', fontSize: 6.5,
    },
    columnStyles: {
      0:  { halign: 'center', cellWidth: 7 },
      1:  { cellWidth: 34 },
      2:  { cellWidth: 22 },
      3:  { halign: 'right', cellWidth: 14 },
      4:  { halign: 'right', cellWidth: 12 },
      5:  { halign: 'right', cellWidth: 12 },
      6:  { halign: 'right', cellWidth: 13 },
      7:  { halign: 'right', cellWidth: 13 },
      8:  { halign: 'right', cellWidth: 14, fontStyle: 'bold' },
      9:  { halign: 'center', cellWidth: 14 },
      10: { halign: 'right', cellWidth: 12 },
      11: { halign: 'right', cellWidth: 11 },
      12: { halign: 'right', cellWidth: 14 },
      13: { halign: 'right', cellWidth: 11 },
      14: { halign: 'right', cellWidth: 13 },
      15: { halign: 'right', cellWidth: 14, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === body.length) {
        data.cell.styles.fillColor = [230, 230, 230];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const finalY = (doc.lastAutoTable?.finalY || 25) + 8;
  const totalNet = Math.round(sum(bulletins, 'salaire_net'));

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Arrêté le présent état à la somme de : ${fmtPDF(totalNet)} FCFA`,
    14, finalY
  );

  // Signature
  const sigX = 250;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(entreprise?.qualite_representant || 'LE GERANT', sigX, finalY + 18, { align: 'center' });
  if (entreprise?.representant_nom) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(entreprise.representant_nom, sigX, finalY + 24, { align: 'center' });
  }
  if (entreprise?.mention_signataire) {
    doc.setFontSize(7);
    doc.text(entreprise.mention_signataire, sigX, finalY + 29, { align: 'center' });
  }

  doc.save(`etat_salaires_${MOIS[mois - 1]}_${annee}.pdf`);
}

// ── Excel export — miroir exact du fichier modèle ─────────
function exportEtatExcel(bulletins, entreprise, mois, annee) {
  const etatNum = getEtatNum(mois, annee);
  const today = new Date().toLocaleDateString('fr-FR');
  const nomMois = MOIS[mois - 1].toUpperCase();
  const nomEntreprise = (entreprise?.nom || '').toUpperCase();
  const ville = entreprise?.ville || 'OUAGADOUGOU';

  // Lignes brutes (format aoa)
  const rows = [];

  // Ligne ville + date
  rows.push([`${ville}, le ${today}`]);
  rows.push([]);

  // Titre
  rows.push([
    `ETAT N°${etatNum}/RECAPITULATIF DES SALAIRES DE ${nomEntreprise} DU MOIS DE ${nomMois} ${annee}`,
  ]);
  rows.push([]);

  // En-tête (2 lignes fusionnées manuellement)
  rows.push([
    'N°', 'Noms et prénoms', 'Fonction', 'Salaire de base',
    'INDEM DE RESP', 'INDEM D\'H SUP', 'INDEM DE LOGMT', 'INDEM DE TRSPRT',
    'Salaire brut', 'Nombre de jours', 'CNSS', 'IUTS',
    'Salaire avant déduction', 'Retenue 1%', 'Avance sur salaire', 'Salaire net',
  ]);

  // Données
  bulletins.forEach((b, i) => {
    rows.push([
      i + 1,
      `${b.agents?.prenom || ''} ${b.agents?.nom || ''}`.trim(),
      b.agents?.poste || '',
      Math.round(b.salaire_base || 0),
      Math.round(b.indemnite_fonction || 0),
      Math.round(b.heures_sup || 0),
      Math.round(b.indemnite_logement || 0),
      Math.round(b.indemnite_transport || 0),
      Math.round(b.salaire_brut || 0),
      b.jours_travailles || 'MOIS PLEIN',
      Math.round(b.cnss_salarial || 0),
      Math.round(b.iuts || 0),
      Math.round(b.salaire_net_avant_deduction || 0),
      Math.round(b.retenue_effort_guerre || 0),
      Math.round(b.avance_salaire || 0),
      Math.round(b.salaire_net || 0),
    ]);
  });

  // Ligne total
  rows.push([
    '', 'TOTAL GÉNÉRAL', '',
    Math.round(sum(bulletins, 'salaire_base')),
    Math.round(sum(bulletins, 'indemnite_fonction')),
    Math.round(sum(bulletins, 'heures_sup')),
    Math.round(sum(bulletins, 'indemnite_logement')),
    Math.round(sum(bulletins, 'indemnite_transport')),
    Math.round(sum(bulletins, 'salaire_brut')),
    '',
    Math.round(sum(bulletins, 'cnss_salarial')),
    Math.round(sum(bulletins, 'iuts')),
    Math.round(sum(bulletins, 'salaire_net_avant_deduction')),
    Math.round(sum(bulletins, 'retenue_effort_guerre')),
    Math.round(sum(bulletins, 'avance_salaire')),
    Math.round(sum(bulletins, 'salaire_net')),
  ]);

  rows.push([]);
  rows.push([
    `Arrêté le présent état à la somme de : ${fmt(sum(bulletins, 'salaire_net'))} FCFA`,
  ]);
  rows.push([]);

  // Signature
  if (entreprise?.qualite_representant) {
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '',
      entreprise.qualite_representant]);
  }
  if (entreprise?.representant_nom) {
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '',
      entreprise.representant_nom]);
  }
  if (entreprise?.mention_signataire) {
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '',
      entreprise.mention_signataire]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 }, { wch: 28 }, { wch: 20 }, { wch: 14 },
    { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
    { wch: 18 }, { wch: 11 }, { wch: 16 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Etat des salaires');
  XLSX.writeFile(wb, `etat_salaires_${MOIS[mois - 1]}_${annee}.xlsx`);
}

// ── Composant principal ───────────────────────────────────
export default function EtatSalaires({ entreprise, profil }) {
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [mois, setMois]           = useState(NOW.getMonth() + 1);
  const [annee, setAnnee]         = useState(NOW.getFullYear());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadBulletins(); }, [mois, annee]);

  async function loadBulletins() {
    setLoading(true);
    const { data } = await supabase
      .from('bulletins_paie')
      .select('*, agents(nom, prenom, poste, matricule)')
      .eq('mois', mois)
      .eq('annee', annee)
      .eq('statut', 'Validé')
      .order('created_at', { ascending: true });
    setBulletins(data || []);
    setLoading(false);
  }

  const years = Array.from({ length: 5 }, (_, i) => NOW.getFullYear() - i);

  // Totaux
  const totalBrut = sum(bulletins, 'salaire_brut');
  const totalNet  = sum(bulletins, 'salaire_net');
  const totalCNSS = sum(bulletins, 'cnss_salarial');
  const totalIUTS = sum(bulletins, 'iuts');

  if (!peutFaire(profil, 'voirEtatSalaires')) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: 400, color: '#A3A3A3',
        fontFamily: 'Poppins, sans-serif', textAlign: 'center',
      }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#737373' }}>Accès restreint</p>
        <p style={{ fontSize: 13 }}>Vous n'avez pas les permissions nécessaires.</p>
      </div>
    );
  }

  const colSpan = 16;

  return (
    <div>
      {/* ── Sélecteur période + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select className="filter-select" value={mois} onChange={e => setMois(parseInt(e.target.value))}>
          {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="filter-select" value={annee} onChange={e => setAnnee(parseInt(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-secondary"
          onClick={() => bulletins.length > 0 && exportEtatExcel(bulletins, entreprise, mois, annee)}
          disabled={bulletins.length === 0}
        >
          <FileSpreadsheet size={14} />
          Export Excel
        </button>
        <button
          className="btn btn-primary"
          onClick={() => bulletins.length > 0 && generateEtatPDF(bulletins, entreprise, mois, annee)}
          disabled={bulletins.length === 0}
        >
          <Printer size={14} />
          Générer l'état (PDF)
        </button>
      </div>

      {/* ── Cartes stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Agents payés',           value: bulletins.length,                  color: '#E8920A', icon: Users },
          { label: 'Masse brute',             value: fmt(totalBrut) + ' FCFA',          color: '#2563EB', icon: DollarSign },
          { label: 'Retenues (CNSS + IUTS)',  value: fmt(totalCNSS + totalIUTS) + ' FCFA', color: '#DC2626', icon: FileText },
          { label: 'Masse nette',             value: fmt(totalNet) + ' FCFA',           color: '#16A34A', icon: Calendar },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: 15 }}>{s.value}</div>
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

      {/* ── Tableau état des salaires ── */}
      <div className="card">
        <div className="card-header">
          <h3>
            État des salaires — {MOIS[mois - 1]} {annee}
            <span style={{ fontSize: 12, color: '#A3A3A3', fontWeight: 400, marginLeft: 6 }}>
              (bulletins validés uniquement)
            </span>
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 12 }}>
            <thead>
              {/* Ligne 1 — groupes */}
              <tr>
                <th rowSpan={2} style={{ textAlign: 'center', width: 32 }}>N°</th>
                <th rowSpan={2}>Noms et prénoms</th>
                <th rowSpan={2}>Fonction</th>
                <th rowSpan={2} style={{ textAlign: 'right' }}>Salaire de base</th>
                <th colSpan={4} style={{ textAlign: 'center', background: '#F5F0E8', borderBottom: '1px solid #E5E5E5' }}>
                  AVANTAGES
                </th>
                <th rowSpan={2} style={{ textAlign: 'right' }}>Salaire brut</th>
                <th rowSpan={2} style={{ textAlign: 'center' }}>Jours</th>
                <th colSpan={2} style={{ textAlign: 'center', background: '#FFF0F0', borderBottom: '1px solid #E5E5E5' }}>
                  RETENUES
                </th>
                <th rowSpan={2} style={{ textAlign: 'right' }}>Sal. avant déd.</th>
                <th rowSpan={2} style={{ textAlign: 'right' }}>Retenue 1%</th>
                <th rowSpan={2} style={{ textAlign: 'right' }}>Avance</th>
                <th rowSpan={2} style={{ textAlign: 'right' }}>Salaire net</th>
              </tr>
              {/* Ligne 2 — sous-colonnes */}
              <tr>
                <th style={{ textAlign: 'right', background: '#FFFBF5', fontSize: 11 }}>Indem Resp</th>
                <th style={{ textAlign: 'right', background: '#FFFBF5', fontSize: 11 }}>Indem H.Sup</th>
                <th style={{ textAlign: 'right', background: '#FFFBF5', fontSize: 11 }}>Indem Logmt</th>
                <th style={{ textAlign: 'right', background: '#FFFBF5', fontSize: 11 }}>Indem Trsprt</th>
                <th style={{ textAlign: 'right', background: '#FFF8F8', fontSize: 11 }}>CNSS</th>
                <th style={{ textAlign: 'right', background: '#FFF8F8', fontSize: 11 }}>IUTS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} style={{ textAlign: 'center', padding: 40, color: '#A3A3A3' }}>
                    Chargement...
                  </td>
                </tr>
              ) : bulletins.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                    Aucun bulletin validé pour cette période
                  </td>
                </tr>
              ) : (
                <>
                  {bulletins.map((b, i) => (
                    <tr key={b.id}>
                      <td style={{ textAlign: 'center', color: '#A3A3A3', fontWeight: 500 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{b.agents?.prenom} {b.agents?.nom}</td>
                      <td style={{ color: '#737373' }}>{b.agents?.poste}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(b.salaire_base)}</td>
                      <td style={{ textAlign: 'right', color: '#737373' }}>{fmt(b.indemnite_fonction)}</td>
                      <td style={{ textAlign: 'right', color: '#737373' }}>{fmt(b.heures_sup || 0)}</td>
                      <td style={{ textAlign: 'right', color: '#737373' }}>{fmt(b.indemnite_logement)}</td>
                      <td style={{ textAlign: 'right', color: '#737373' }}>{fmt(b.indemnite_transport)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(b.salaire_brut)}</td>
                      <td style={{ textAlign: 'center', color: '#737373', fontSize: 11 }}>
                        {b.jours_travailles || 'MOIS PLEIN'}
                      </td>
                      <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{fmt(b.cnss_salarial)}</td>
                      <td style={{ textAlign: 'right', color: '#A3A3A3' }}>{fmt(b.iuts)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(b.salaire_net_avant_deduction)}</td>
                      <td style={{ textAlign: 'right', color: '#737373' }}>{fmt(b.retenue_effort_guerre)}</td>
                      <td style={{ textAlign: 'right', color: b.avance_salaire > 0 ? '#0F0F0F' : '#A3A3A3' }}>
                        {b.avance_salaire > 0 ? fmt(b.avance_salaire) : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(b.salaire_net)}</td>
                    </tr>
                  ))}

                  {/* Ligne total */}
                  <tr style={{ background: '#F0F0F0', fontWeight: 700, borderTop: '2px solid #D4D4D4' }}>
                    <td colSpan={3} style={{ fontWeight: 700 }}>TOTAL GÉNÉRAL</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'salaire_base'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'indemnite_fonction'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'heures_sup'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'indemnite_logement'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'indemnite_transport'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(totalBrut)}</td>
                    <td />
                    <td style={{ textAlign: 'right' }}>{fmt(totalCNSS)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(totalIUTS)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'salaire_net_avant_deduction'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'retenue_effort_guerre'))}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(sum(bulletins, 'avance_salaire'))}</td>
                    <td style={{ textAlign: 'right', color: '#16A34A' }}>{fmt(totalNet)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Note bas de page */}
        {bulletins.length > 0 && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #E5E5E5',
            fontSize: 12, color: '#737373',
            fontStyle: 'italic',
          }}>
            Arrêté le présent état à la somme de :{' '}
            <strong style={{ color: '#0F0F0F' }}>{fmt(totalNet)} FCFA</strong>
          </div>
        )}
      </div>
    </div>
  );
}
