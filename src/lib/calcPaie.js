// calcPaie.js - Burkina Faso payroll calculation engine
// CNSS: 5.5% employee / 19.8% employer (capped at 800,000 FCFA)
// IUTS: progressive tax brackets 1.8% to 27%

// ── CNSS constants ────────────────────────────────────────
const CNSS_SALARIAL    = 0.055;  // 5.5% employee contribution
const CNSS_PATRONAL    = 0.198;  // 19.8% employer contribution
const CNSS_PLAFOND     = 800000; // Monthly ceiling

// ── IUTS tax brackets (monthly) ──────────────────────────
// Format: { min, max, taux, deduction }
const IUTS_BAREME = [
  { min: 0,       max: 15000,  taux: 0,     deduction: 0 },
  { min: 15001,   max: 20000,  taux: 0.018, deduction: 270 },
  { min: 20001,   max: 25000,  taux: 0.021, deduction: 330 },
  { min: 25001,   max: 30000,  taux: 0.024, deduction: 405 },
  { min: 30001,   max: 35000,  taux: 0.027, deduction: 495 },
  { min: 35001,   max: 40000,  taux: 0.030, deduction: 600 },
  { min: 40001,   max: 45000,  taux: 0.033, deduction: 720 },
  { min: 45001,   max: 55000,  taux: 0.037, deduction: 900 },
  { min: 55001,   max: 65000,  taux: 0.040, deduction: 1065 },
  { min: 65001,   max: 80000,  taux: 0.045, deduction: 1390 },
  { min: 80001,   max: 100000, taux: 0.050, deduction: 1790 },
  { min: 100001,  max: 120000, taux: 0.055, deduction: 2290 },
  { min: 120001,  max: 150000, taux: 0.060, deduction: 2890 },
  { min: 150001,  max: 200000, taux: 0.065, deduction: 3640 },
  { min: 200001,  max: 250000, taux: 0.070, deduction: 4640 },
  { min: 250001,  max: 300000, taux: 0.090, deduction: 9640 },
  { min: 300001,  max: 400000, taux: 0.100, deduction: 12640 },
  { min: 400001,  max: 500000, taux: 0.120, deduction: 20640 },
  { min: 500001,  max: 600000, taux: 0.150, deduction: 35640 },
  { min: 600001,  max: 750000, taux: 0.190, deduction: 59640 },
  { min: 750001,  max: Infinity, taux: 0.270, deduction: 119640 },
];

// ── Abattements pour charges de famille ──────────────────
// Parts: 1 = célibataire, 1.5 = marié sans enfant, +0.5 par enfant
const ABATTEMENTS = {
  1:   0,
  1.5: 0.10,  // 10% reduction
  2:   0.15,
  2.5: 0.20,
  3:   0.25,
  3.5: 0.25,
  4:   0.25,
};

// ── Calculate CNSS employee contribution ─────────────────
export function calculerCNSS(salaireBrut) {
  const base = Math.min(salaireBrut, CNSS_PLAFOND);
  return Math.round(base * CNSS_SALARIAL);
}

// ── Calculate CNSS employer contribution ─────────────────
export function calculerCNSSPatronal(salaireBrut) {
  const base = Math.min(salaireBrut, CNSS_PLAFOND);
  return Math.round(base * CNSS_PATRONAL);
}

// ── Calculate IUTS from net taxable salary ───────────────
export function calculerIUTS(revenuImposable, nombreParts = 1) {
  if (revenuImposable <= 0) return 0;

  // Round down to nearest 1000
  const base = Math.floor(revenuImposable / 1000) * 1000;

  // Find applicable bracket
  const tranche = IUTS_BAREME.find(t => base >= t.min && base <= t.max);
  if (!tranche || tranche.taux === 0) return 0;

  // Calculate gross IUTS
  let iutsBrut = Math.round(base * tranche.taux - tranche.deduction);
  if (iutsBrut < 0) iutsBrut = 0;

  // Apply family charge reduction
  const tauxAbattement = ABATTEMENTS[nombreParts] || 0;
  const iutsNet = Math.round(iutsBrut * (1 - tauxAbattement));

  return iutsNet;
}

// ── Calculate number of family parts ─────────────────────
export function calculerNombreParts(situationMatrimoniale, nombreEnfants = 0) {
  let parts = 1; // Single base
  if (situationMatrimoniale === 'Marié(e)') parts += 0.5;
  parts += Math.min(nombreEnfants, 6) * 0.5;
  return parts;
}

// ── Full payroll calculation ──────────────────────────────
export function calculerBulletin(data) {
  const {
    salaire_base        = 0,
    sursalaire          = 0,
    indemnite_logement  = 0,
    indemnite_transport = 0,
    indemnite_fonction  = 0,
    prime_anciennete    = 0,
    autres_primes       = 0,
    heures_sup          = 0,
    nombre_parts        = 1,
  } = data;

  // ── Step 1: Gross salary ──
  const salaire_brut = Math.round(
    parseFloat(salaire_base)        +
    parseFloat(sursalaire)          +
    parseFloat(indemnite_logement)  +
    parseFloat(indemnite_transport) +
    parseFloat(indemnite_fonction)  +
    parseFloat(prime_anciennete)    +
    parseFloat(autres_primes)       +
    parseFloat(heures_sup)
  );

  // ── Step 2: CNSS employee deduction ──
  const cnss_salarial = calculerCNSS(salaire_brut);

  // ── Step 3: Net taxable income for IUTS ──
  // Exonerate transport and part of housing/function
  const exoneration_transport = Math.min(
    parseFloat(indemnite_transport), 25000
  );
  const exoneration_logement = Math.min(
    parseFloat(indemnite_logement) * 0.20,
    75000
  );
  const exoneration_fonction = Math.min(
    parseFloat(indemnite_fonction) * 0.05,
    50000
  );

  const salaire_brut_imposable = Math.round(
    salaire_brut
    - cnss_salarial
    - exoneration_transport
    - exoneration_logement
    - exoneration_fonction
  );

  // ── Step 4: IUTS calculation ──
  const iuts = calculerIUTS(
    Math.max(0, salaire_brut_imposable),
    parseFloat(nombre_parts)
  );

  // ── Step 5: Total deductions ──
  const total_retenues = cnss_salarial + iuts;

  // ── Step 6: Net salary ──
  const salaire_net = Math.round(salaire_brut - total_retenues);

  // ── Step 7: Employer CNSS ──
  const cnss_patronal = calculerCNSSPatronal(salaire_brut);

  return {
    salaire_brut,
    cnss_salarial,
    salaire_brut_imposable: Math.max(0, salaire_brut_imposable),
    iuts,
    total_retenues,
    salaire_net,
    cnss_patronal,
  };
}

// ── Format FCFA amount ────────────────────────────────────
export function formatFCFA(montant) {
  if (!montant && montant !== 0) return '—';
  return Math.round(montant).toLocaleString('fr-FR') + ' FCFA';
}