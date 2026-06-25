// EtatSalaires.js - Monthly payroll summary page
// Replicates the "ETAT DES SALAIRES" recap sheet from the AIMDIGITAL Excel model
// Shows one row per agent (validated bulletins only) + a TOTAL GENERAL row

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { peutFaire } from '../lib/useProfil';
import { formatFCFA } from '../lib/calcPaie';
import {
  FileSpreadsheet, Printer, FileText,
  Users, DollarSign, Calendar,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Months list ───────────────────────────────────────────
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const NOW = new Date();

// ── Generate state number, e.g. ETAT N°004/2026 ───────────
function getEtatNumber(mois, annee) {
  return `${String(mois).padStart(3, '0')}/${annee}`;
}

// ── Format number with safe space separator for PDF rendering ──
function formatNombrePDF(val) {
  const n = Math.round(parseFloat(val) || 0);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// ── Generate PDF: landscape table, mirrors Excel layout ───
function generateEtatPDF(bulletins, entreprise, mois, annee) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const today = new Date().toLocaleDateString('fr-FR');
  const etatNum = getEtatNumber(mois, annee);

  // ── Header ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${entreprise?.ville || 'OUAGADOUGOU'}, le ${today}`, 14, 14);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `ETAT N°${etatNum}/RECAPITULATIF DES SALAIRES DE ${(entreprise?.nom || 'L\'ENTREPRISE').toUpperCase()} DU MOIS DE ${MOIS[mois - 1].toUpperCase()} ${annee}`,
    148, 22, { align: 'center' }
  );

  // ── Table data ──
  const head = [[
    'N°', 'Noms et prénoms', 'Fonction', 'Salaire de base',
    'Indem. Resp.', 'Indem. H.Sup', 'Indem. Logmt', 'Indem. Transp.',
    'Salaire brut', 'CNSS', 'IUTS', 'Av. déduction', 'Retenue 1%', 'Salaire net',
  ]];

  const body = bulletins.map((b, i) => [
  i + 1,
  `${b.agents?.prenom || ''} ${b.agents?.nom || ''}`,
  b.agents?.poste || '',
  formatNombrePDF(b.salaire_base),
  formatNombrePDF(b.indemnite_fonction),
  formatNombrePDF(b.heures_sup),
  formatNombrePDF(b.indemnite_logement),
  formatNombrePDF(b.indemnite_transport),
  formatNombrePDF(b.salaire_brut),
  formatNombrePDF(b.cnss_salarial),
  formatNombrePDF(b.iuts),
  formatNombrePDF(b.salaire_net_avant_deduction),
  formatNombrePDF(b.retenue_effort_guerre),
  formatNombrePDF(b.salaire_net),
]);

  // ── Totals row ──
  const sum = (key) => bulletins.reduce((s, b) => s + (parseFloat(b[key]) || 0), 0);
const totalRow = [
  '', 'TOTAL GÉNÉRAL', '',
  formatNombrePDF(sum('salaire_base')),
  formatNombrePDF(sum('indemnite_fonction')),
  formatNombrePDF(sum('heures_sup')),
  formatNombrePDF(sum('indemnite_logement')),
  formatNombrePDF(sum('indemnite_transport')),
  formatNombrePDF(sum('salaire_brut')),
  formatNombrePDF(sum('cnss_salarial')),
  formatNombrePDF(sum('iuts')),
  formatNombrePDF(sum('salaire_net_avant_deduction')),
  formatNombrePDF(sum('retenue_effort_guerre')),
  formatNombrePDF(sum('salaire_net')),
];

  autoTable(doc, {
  head,
  body: [...body, totalRow],
  startY: 28,
  theme: 'grid',
  styles: { fontSize: 7, font: 'helvetica', textColor: [26, 26, 26], lineColor: [26, 26, 26], lineWidth: 0.2 },
  headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
  columnStyles: {
    0: { halign: 'center', cellWidth: 8 },
    1: { cellWidth: 38 },
    2: { cellWidth: 24 },
    3: { halign: 'right' },
    4: { halign: 'right' },
    5: { halign: 'right' },
    6: { halign: 'right' },
    7: { halign: 'right' },
    8: { halign: 'right', fontStyle: 'bold' },
    9: { halign: 'right' },
    10: { halign: 'right' },
    11: { halign: 'right' },
    12: { halign: 'right' },
    13: { halign: 'right', fontStyle: 'bold' },
  },
  didParseCell: (data) => {
    if (data.row.index === body.length) {
      data.cell.styles.fillColor = [240, 240, 240];
      data.cell.styles.fontStyle = 'bold';
    }
  },
});

  // ── Footer note ──
  const finalY = (doc.lastAutoTable?.finalY || 28) + 10;
  const totalNetLettres = formatNombrePDF(sum('salaire_net'));
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Arrêté le présent état à la somme de : ${totalNetLettres} FCFA`, 14, finalY);

  // ── Signature ──
  doc.setFont('helvetica', 'bold');
  doc.text(entreprise?.qualite_representant || 'Le Gérant', 250, finalY + 20, { align: 'center' });
  if (entreprise?.mention_signataire) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(entreprise.mention_signataire, 250, finalY + 25, { align: 'center' });
  }

  doc.save(`etat_salaires_${MOIS[mois - 1]}_${annee}.pdf`);
}

// ── Export to Excel, mirrors the original sheet layout ────
function exportEtatExcel(bulletins, entreprise, mois, annee) {
  const etatNum = getEtatNumber(mois, annee);
  const today = new Date().toLocaleDateString('fr-FR');

  const rows = [
    [`${entreprise?.ville || 'OUAGADOUGOU'}, le ${today}`],
    [],
    [`ETAT N°${etatNum}/RECAPITULATIF DES SALAIRES DE ${(entreprise?.nom || '').toUpperCase()} DU MOIS DE ${MOIS[mois - 1].toUpperCase()} ${annee}`],
    [],
    [
      'N°', 'Noms et prénoms', 'Fonction', 'Salaire de base',
      'Indem. Resp.', 'Indem. H.Sup', 'Indem. Logmt', 'Indem. Transp.',
      'Salaire brut', 'CNSS', 'IUTS', 'Av. déduction', 'Retenue 1%', 'Salaire net',
    ],
  ];

  bulletins.forEach((b, i) => {
    rows.push([
      i + 1,
      `${b.agents?.prenom || ''} ${b.agents?.nom || ''}`,
      b.agents?.poste || '',
      b.salaire_base || 0,
      b.indemnite_fonction || 0,
      b.heures_sup || 0,
      b.indemnite_logement || 0,
      b.indemnite_transport || 0,
      b.salaire_brut || 0,
      b.cnss_salarial || 0,
      b.iuts || 0,
      b.salaire_net_avant_deduction || 0,
      b.retenue_effort_guerre || 0,
      b.salaire_net || 0,
    ]);
  });

  const sum = (key) => bulletins.reduce((s, b) => s + (parseFloat(b[key]) || 0), 0);
  rows.push([
    '', 'TOTAL GÉNÉRAL', '',
    sum('salaire_base'), sum('indemnite_fonction'), sum('heures_sup'),
    sum('indemnite_logement'), sum('indemnite_transport'), sum('salaire_brut'),
    sum('cnss_salarial'), sum('iuts'), sum('salaire_net_avant_deduction'),
    sum('retenue_effort_guerre'), sum('salaire_net'),
  ]);

  rows.push([]);
  rows.push(['Arrêté le présent état à la somme de :', Math.round(sum('salaire_net'))]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 }, { wch: 28 }, { wch: 18 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Etat des salaires');
  XLSX.writeFile(wb, `etat_salaires_${MOIS[mois - 1]}_${annee}.xlsx`);
}

// ── Main EtatSalaires component ───────────────────────────
export default function EtatSalaires({ entreprise, profil }) {
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mois, setMois] = useState(NOW.getMonth() + 1);
  const [annee, setAnnee] = useState(NOW.getFullYear());

  useEffect(() => {
    loadBulletins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mois, annee]);

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

  // ── Stats ──
  const totalBrut = bulletins.reduce((s, b) => s + (b.salaire_brut || 0), 0);
  const totalNet  = bulletins.reduce((s, b) => s + (b.salaire_net || 0), 0);
  const totalCNSS = bulletins.reduce((s, b) => s + (b.cnss_salarial || 0), 0);
  const totalIUTS = bulletins.reduce((s, b) => s + (b.iuts || 0), 0);

  // ── Access guard ──
if (!peutFaire(profil, 'voirEtatSalaires')) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: 400, color: '#A3A3A3', fontFamily: 'Poppins, sans-serif', textAlign: 'center',
      }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#737373' }}>Accès restreint</p>
        <p style={{ fontSize: 13 }}>Vous n'avez pas les permissions nécessaires.</p>
      </div>
    );
  }

  return (
    <div>

      {/* ── Period selector + actions ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10, marginBottom: 24, flexWrap: 'wrap',
      }}>
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

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Agents payés',  value: bulletins.length, color: '#E8920A', icon: Users },
          { label: 'Masse brute',   value: formatFCFA(totalBrut), color: '#2563EB', icon: DollarSign },
          { label: 'Total retenues (CNSS+IUTS)', value: formatFCFA(totalCNSS + totalIUTS), color: '#DC2626', icon: FileText },
          { label: 'Masse nette',   value: formatFCFA(totalNet), color: '#16A34A', icon: Calendar },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: 17 }}>{s.value}</div>
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

      {/* ── Recap table ── */}
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
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Agent</th>
                <th>Fonction</th>
                <th>Salaire base</th>
                <th>Logement</th>
                <th>Transport</th>
                <th>Salaire brut</th>
                <th>CNSS</th>
                <th>IUTS</th>
                <th>Net à payer</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: 40, color: '#A3A3A3' }}>Chargement...</td></tr>
              ) : bulletins.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: 48, color: '#A3A3A3' }}>
                  Aucun bulletin validé pour cette période
                </td></tr>
              ) : (
                <>
                  {bulletins.map((b, i) => (
                    <tr key={b.id}>
                      <td style={{ color: '#A3A3A3' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{b.agents?.prenom} {b.agents?.nom}</td>
                      <td style={{ color: '#737373' }}>{b.agents?.poste}</td>
                      <td>{formatFCFA(b.salaire_base)}</td>
                      <td style={{ color: '#737373' }}>{formatFCFA(b.indemnite_logement)}</td>
                      <td style={{ color: '#737373' }}>{formatFCFA(b.indemnite_transport)}</td>
                      <td style={{ fontWeight: 600 }}>{formatFCFA(b.salaire_brut)}</td>
                      <td style={{ color: '#DC2626' }}>{formatFCFA(b.cnss_salarial)}</td>
                      <td style={{ color: '#DC2626' }}>{formatFCFA(b.iuts)}</td>
                      <td style={{ fontWeight: 700, color: '#16A34A' }}>{formatFCFA(b.salaire_net)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F0F0F0', fontWeight: 700 }}>
                    <td colSpan="3">TOTAL GÉNÉRAL</td>
                    <td>{formatFCFA(bulletins.reduce((s, b) => s + (b.salaire_base || 0), 0))}</td>
                    <td>{formatFCFA(bulletins.reduce((s, b) => s + (b.indemnite_logement || 0), 0))}</td>
                    <td>{formatFCFA(bulletins.reduce((s, b) => s + (b.indemnite_transport || 0), 0))}</td>
                    <td>{formatFCFA(totalBrut)}</td>
                    <td style={{ color: '#DC2626' }}>{formatFCFA(totalCNSS)}</td>
                    <td style={{ color: '#DC2626' }}>{formatFCFA(totalIUTS)}</td>
                    <td style={{ color: '#16A34A' }}>{formatFCFA(totalNet)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}