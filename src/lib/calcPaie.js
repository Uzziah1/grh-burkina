// calcPaie.js - Burkina Faso payroll calculation engine
// Logic replicated from AIMDIGITAL payroll Excel model (AZARIA sheet)
//
// Calculation order:
// 1. Salaire brut = somme des éléments de rémunération
// 2. CNSS salarié = 5.5% du brut, plafonné à 44 000 FCFA
// 3. Contrôle CNSS fiscal = MIN(salaire_base x 8%, CNSS réelle)
// 4. Salaire imposable IUTS = brut - contrôle fiscal (ou - CNSS réelle si plus petite)
// 5. Exonérations sur indemnités (logement/transport/fonction), plafonnées
// 6. Abattement forfaitaire = 25% du salaire de base
// 7. Base IUTS = imposable - exonérations - abattement (arrondie à la centaine inférieure)
// 8. IUTS brut = barème progressif par tranches
// 9. Abattement charges familiales = % selon nombre de personnes à charge (max 7)
// 10. Net IUTS = IUTS brut - abattement familial
// 11. Salaire net avant déduction = brut - CNSS - Net IUTS - autres retenues
// 12. Retenue 1% (effort de guerre) sur le salaire net avant déduction
// 13. Salaire net = net avant déduction - retenue 1% - avance sur salaire

// ── CNSS constants ────────────────────────────────────────
const CNSS_TAUX            = 0.055;   // 5.5% employee contribution
const CNSS_PLAFOND_MONTANT = 44000;   // Monthly cap on CNSS contribution (FCFA)
const CNSS_FISCAL_TAUX     = 0.08;    // 8% control rate on base salary
const CNSS_PATRONAL_TAUX   = 0.16;    // 16% employer contribution (from sheet H28)

// ── Exemption caps for allowances (used to compute taxable base) ──
const EXO_LOGEMENT_TAUX   = 0.20;
const EXO_LOGEMENT_PLAFOND = 75000;
const EXO_TRANSPORT_TAUX   = 0.05;
const EXO_TRANSPORT_PLAFOND = 30000;
const EXO_FONCTION_TAUX    = 0.05;
const EXO_FONCTION_PLAFOND = 50000;

// ── Flat-rate allowance (abattement forfaitaire) ──────────
const ABATTEMENT_FORFAITAIRE_TAUX = 0.25; // 25% of base salary

// ── War effort withholding (retenue 1%) ───────────────────
const RETENUE_EFFORT_GUERRE = 0.01;

// ── IUTS progressive brackets (monthly taxable base) ──────
// Replicated exactly from the AZARIA sheet (F3:G11)
const IUTS_BAREME = [
  { plafond: 10000,     taux: 0     },
  { plafond: 20000,     taux: 0     },
  { plafond: 30000,     taux: 0     },
  { plafond: 50000,     taux: 0.121 },
  { plafond: 80000,     taux: 0.139 },
  { plafond: 120000,    taux: 0.157 },
  { plafond: 170000,    taux: 0.184 },
  { plafond: 250000,    taux: 0.217 },
  { plafond: Infinity,  taux: 0.25  },
];

// ── Family charge abatement rates (D38 in sheet) ──────────
// Index = number of dependents (1 spouse + up to 6 children = max 7)
const ABATTEMENT_CHARGES = {
  0: 0,
  1: 0.08,
  2: 0.10,
  3: 0.12,
  4: 0.14,
  5: 0.16,
  6: 0.18,
  7: 0.20, // 7 and above
};

// ── Maximum number of dependent children for abatement ────
export const MAX_ENFANTS_CHARGE = 6;

// ── Calculate number of dependents for IUTS abatement ─────
// 1 dependent for spouse (if married) + up to 6 children
export function calculerPersonnesACharge(situationMatrimoniale, nombreEnfants = 0) {
  let charges = 0;
  if (situationMatrimoniale === 'Marié(e)') charges += 1;
  charges += Math.min(parseInt(nombreEnfants) || 0, MAX_ENFANTS_CHARGE);
  return Math.min(charges, 7);
}

// ── Calculate CNSS employee contribution (capped) ─────────
export function calculerCNSS(salaireBrut) {
  const brut = parseFloat(salaireBrut) || 0;
  const cnss = brut * CNSS_TAUX;
  return Math.round(Math.min(cnss, CNSS_PLAFOND_MONTANT));
}

// ── Calculate employer CNSS contribution ──────────────────
export function calculerCNSSPatronal(salaireBrut) {
  const brut = parseFloat(salaireBrut) || 0;
  return Math.round(brut * CNSS_PATRONAL_TAUX);
}

// ── Calculate progressive IUTS from taxable base ──────────
// Cumulative bracket calculation, exactly as the Excel nested IF (D36)
export function calculerIUTSBrut(baseIUTS) {
  const base = Math.max(0, parseFloat(baseIUTS) || 0);
  let impot = 0;
  let plafondPrecedent = 0;

  for (const tranche of IUTS_BAREME) {
    if (base <= tranche.plafond) {
      impot += (base - plafondPrecedent) * tranche.taux;
      break;
    } else {
      impot += (tranche.plafond - plafondPrecedent) * tranche.taux;
      plafondPrecedent = tranche.plafond;
    }
  }
  return Math.round(impot);
}

// ── Calculate family charge abatement on gross IUTS ───────
export function calculerAbattementFamilial(iutsBrut, personnesACharge) {
  const taux = ABATTEMENT_CHARGES[Math.min(personnesACharge, 7)] || 0;
  return Math.round(iutsBrut * taux);
}

// ── Full payroll calculation — replicates AZARIA sheet ────
export function calculerBulletin(data) {
  const {
    salaire_base         = 0,
    sursalaire            = 0,
    indemnite_logement    = 0,
    indemnite_transport   = 0,
    indemnite_fonction    = 0,
    prime_anciennete      = 0,
    autres_primes         = 0,
    heures_sup            = 0,
    autres_retenues       = 0,
    avance_salaire        = 0,
    situation_matrimoniale = 'Célibataire',
    nombre_enfants        = 0,
  } = data;

  const sBase       = parseFloat(salaire_base) || 0;
  const sSursalaire = parseFloat(sursalaire) || 0;
  const sLogement   = parseFloat(indemnite_logement) || 0;
  const sTransport  = parseFloat(indemnite_transport) || 0;
  const sFonction   = parseFloat(indemnite_fonction) || 0;
  const sAnciennete = parseFloat(prime_anciennete) || 0;
  const sAutresPrimes = parseFloat(autres_primes) || 0;
  const sHeuresSup  = parseFloat(heures_sup) || 0;
  const sAutresRetenues = parseFloat(autres_retenues) || 0;
  const sAvance     = parseFloat(avance_salaire) || 0;

  // ── Step 1: Salaire brut (D23) ──
  const salaire_brut = Math.round(
    sBase + sSursalaire + sLogement + sTransport +
    sFonction + sAnciennete + sAutresPrimes + sHeuresSup
  );

  // ── Step 2: CNSS salarié, plafonné à 44 000 (D24) ──
  const cnss_salarial = calculerCNSS(salaire_brut);

  // ── Step 3: Contrôle CNSS fiscal = MIN(base x 8%, CNSS réelle) (D26) ──
  const controle_cnss_fiscal = Math.round(Math.min(sBase * CNSS_FISCAL_TAUX, cnss_salarial));

  // ── Step 4: Salaire imposable IUTS (D27) ──
  // = brut - contrôle fiscal (si contrôle <= CNSS réelle, sinon brut - CNSS réelle)
  const salaire_imposable_iuts = Math.round(
    controle_cnss_fiscal <= cnss_salarial
      ? salaire_brut - controle_cnss_fiscal
      : salaire_brut - cnss_salarial
  );

  // ── Step 5: Exonérations sur indemnités (D29:D31) ──
  const exo_logement_calc  = Math.min(salaire_imposable_iuts * EXO_LOGEMENT_TAUX, EXO_LOGEMENT_PLAFOND);
  const exo_logement       = Math.round(Math.min(exo_logement_calc, sLogement));

  const exo_transport_calc = Math.min(salaire_imposable_iuts * EXO_TRANSPORT_TAUX, EXO_TRANSPORT_PLAFOND);
  const exo_transport      = Math.round(Math.min(exo_transport_calc, sTransport));

  const exo_fonction_calc  = Math.min(salaire_imposable_iuts * EXO_FONCTION_TAUX, EXO_FONCTION_PLAFOND);
  const exo_fonction       = Math.round(Math.min(exo_fonction_calc, sFonction));

  const total_exonerations = exo_logement + exo_transport + exo_fonction;

  // ── Step 6: Abattement forfaitaire = 25% du salaire de base (D33) ──
  const abattement_forfaitaire = Math.round(sBase * ABATTEMENT_FORFAITAIRE_TAUX);

  // ── Step 7: Base IUTS, arrondie à la centaine inférieure (D34) ──
  const baseIutsRaw = salaire_imposable_iuts - total_exonerations - abattement_forfaitaire;
  const base_iuts = Math.floor(Math.max(0, baseIutsRaw) / 100) * 100;

  // ── Step 8: IUTS brut via barème progressif (D36) ──
  const iuts_brut = calculerIUTSBrut(base_iuts);

  // ── Step 9: Personnes à charge + abattement familial (D37/D38) ──
  const personnes_a_charge = calculerPersonnesACharge(situation_matrimoniale, nombre_enfants);
  const abattement_familial = calculerAbattementFamilial(iuts_brut, personnes_a_charge);

  // ── Step 10: Net IUTS (D39) ──
  const iuts = Math.max(0, iuts_brut - abattement_familial);

  // ── Step 11: Salaire net avant déduction (D41) ──
  const salaire_net_avant_deduction = Math.ceil(
    salaire_brut - cnss_salarial - iuts - sAutresRetenues
  );

  // ── Step 12: Retenue 1% effort de guerre (D42) ──
  const retenue_effort_guerre = Math.round(salaire_net_avant_deduction * RETENUE_EFFORT_GUERRE);

  // ── Step 13: Salaire net final (D44) ──
  const salaire_net = Math.round(
    salaire_net_avant_deduction - retenue_effort_guerre - sAvance
  );

  // ── Employer contribution ──
  const cnss_patronal = calculerCNSSPatronal(salaire_brut);

  return {
    salaire_brut,
    cnss_salarial,
    controle_cnss_fiscal,
    salaire_brut_imposable: salaire_imposable_iuts,
    exo_logement,
    exo_transport,
    exo_fonction,
    total_exonerations,
    abattement_forfaitaire,
    base_iuts,
    iuts_brut,
    personnes_a_charge,
    abattement_familial,
    iuts,
    total_retenues: cnss_salarial + iuts,
    salaire_net_avant_deduction,
    retenue_effort_guerre,
    avance_salaire: sAvance,
    salaire_net,
    cnss_patronal,
    nombre_parts: personnes_a_charge, // kept for compatibility with display code
  };
}

// ── Format FCFA amount ────────────────────────────────────
export function formatFCFA(montant) {
  if (montant === null || montant === undefined || isNaN(montant)) return '—';
  return Math.round(montant).toLocaleString('fr-FR') + ' FCFA';
}