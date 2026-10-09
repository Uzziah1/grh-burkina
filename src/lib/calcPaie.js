// calcPaie.js - Burkina Faso payroll calculation engine
// Logic replicated from FASO ARMORED payroll Excel model
//
// Calculation order:
// 1. Salaire brut = somme des éléments de rémunération
// 2. CNSS salarié = 5.5% du brut, plafonné à 44 000 FCFA (valeur décimale, pas arrondie)
// 3. Contrôle CNSS fiscal = salaire_base × 8%
// 4. Salaire imposable IUTS = brut - contrôle fiscal
// 5. Exonérations sur indemnités (logement 20%/75k, transport 5%/30k, fonction 5%/50k)
//    plafonnées à l'indemnité réelle payée
// 6. Abattement forfaitaire = 25% du salaire de base
// 7. Base IUTS = imposable_IUTS - exonérations - abattement (arrondie à la centaine inférieure)
// 8. IUTS brut = barème progressif par tranches (sur base arrondie)
// 9. Abattement charges familiales = % selon nombre de personnes à charge
//    (charges_familiales = champ direct sur l'agent)
// 10. Net IUTS = IUTS brut - abattement familial
// 11. Salaire net = brut - CNSS - Net IUTS - autres retenues - avance
// NB: pas d'arrondi intermédiaire sauf base IUTS et salaire net final

// ── CNSS constants ────────────────────────────────────────
const CNSS_TAUX            = 0.055;   // 5.5% employee contribution
const CNSS_PLAFOND_MONTANT = 44000;   // Monthly cap on CNSS contribution (FCFA)
const CNSS_FISCAL_TAUX     = 0.08;    // 8% control rate on base salary
const CNSS_PATRONAL_TAUX   = 0.16;    // 16% employer contribution

// ── Exemption caps for allowances ──────────────────────────
const EXO_LOGEMENT_TAUX    = 0.20;
const EXO_LOGEMENT_PLAFOND = 75000;
const EXO_TRANSPORT_TAUX   = 0.05;
const EXO_TRANSPORT_PLAFOND = 30000;
const EXO_FONCTION_TAUX    = 0.05;
const EXO_FONCTION_PLAFOND = 50000;

// ── Flat-rate allowance ───────────────────────────────────
const ABATTEMENT_FORFAITAIRE_TAUX = 0.25; // 25% of base salary

// ── IUTS progressive brackets (monthly taxable base) ──────
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

// ── Family charge abatement rates ─────────────────────────
// charges_familiales = nombre direct de personnes à charge (champ agent)
const ABATTEMENT_CHARGES = {
  0: 0,
  1: 0.08,
  2: 0.10,
  3: 0.12,
  4: 0.14,
  5: 0.16,
  6: 0.18,
  7: 0.20,
};

// ── Calculate CNSS employee contribution (capped) ─────────
export function calculerCNSS(salaireBrut) {
  const brut = parseFloat(salaireBrut) || 0;
  return Math.min(brut * CNSS_TAUX, CNSS_PLAFOND_MONTANT);
}

// ── Calculate employer CNSS contribution ──────────────────
export function calculerCNSSPatronal(salaireBrut) {
  const brut = parseFloat(salaireBrut) || 0;
  return brut * CNSS_PATRONAL_TAUX;
}

// ── Calculate progressive IUTS from taxable base ──────────
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
  return impot;
}

// ── Calculate family charge abatement on gross IUTS ───────
export function calculerAbattementFamilial(iutsBrut, chargesFamiliales) {
  const charges = Math.min(parseInt(chargesFamiliales) || 0, 7);
  const taux = ABATTEMENT_CHARGES[charges] || 0;
  return iutsBrut * taux;
}

// ── Full payroll calculation ───────────────────────────────
export function calculerBulletin(data) {
  const {
    salaire_base          = 0,
    sursalaire            = 0,
    indemnite_logement    = 0,
    indemnite_transport   = 0,
    indemnite_fonction    = 0,
    prime_anciennete      = 0,
    autres_primes         = 0,
    heures_sup            = 0,
    autres_retenues       = 0,
    avance_salaire        = 0,
    charges_familiales    = 0,  // champ direct de l'agent
  } = data;

  const sBase         = parseFloat(salaire_base) || 0;
  const sSursalaire   = parseFloat(sursalaire) || 0;
  const sLogement     = parseFloat(indemnite_logement) || 0;
  const sTransport    = parseFloat(indemnite_transport) || 0;
  const sFonction     = parseFloat(indemnite_fonction) || 0;
  const sAnciennete   = parseFloat(prime_anciennete) || 0;
  const sAutresPrimes = parseFloat(autres_primes) || 0;
  const sHeuresSup    = parseFloat(heures_sup) || 0;
  const sAutresRet    = parseFloat(autres_retenues) || 0;
  const sAvance       = parseFloat(avance_salaire) || 0;
  const nCharges      = Math.min(parseInt(charges_familiales) || 0, 7);

  // ── Step 1: Salaire brut ──
  const salaire_brut = sBase + sSursalaire + sLogement + sTransport
    + sFonction + sAnciennete + sAutresPrimes + sHeuresSup;

  // ── Step 2: CNSS salarié (décimal, pas arrondi) ──
  const cnss_salarial = calculerCNSS(salaire_brut);

  // ── Step 3: Contrôle CNSS fiscal ──
  const controle_cnss_fiscal = sBase * CNSS_FISCAL_TAUX;

  // ── Step 4: Salaire imposable IUTS (pour calcul exo) ──
  const salaire_brut_imposable = salaire_brut - controle_cnss_fiscal;

  // ── Salaire imposable (affiché = brut - CNSS) ──
  const salaire_imposable_affiche = salaire_brut - cnss_salarial;

  // ── Step 5: Exonérations sur indemnités ──
  const exo_logement = Math.min(
    Math.min(salaire_brut_imposable * EXO_LOGEMENT_TAUX, EXO_LOGEMENT_PLAFOND),
    sLogement
  );
  const exo_transport = Math.min(
    Math.min(salaire_brut_imposable * EXO_TRANSPORT_TAUX, EXO_TRANSPORT_PLAFOND),
    sTransport
  );
  const exo_fonction = Math.min(
    Math.min(salaire_brut_imposable * EXO_FONCTION_TAUX, EXO_FONCTION_PLAFOND),
    sFonction
  );
  const total_exonerations = exo_logement + exo_transport + exo_fonction;

  // ── Step 6: Abattement forfaitaire ──
  const abattement_forfaitaire = sBase * ABATTEMENT_FORFAITAIRE_TAUX;

  // ── Step 7: Base IUTS (arrondie à la centaine inférieure) ──
  const baseIutsRaw = salaire_brut_imposable - total_exonerations - abattement_forfaitaire;
  const base_iuts = Math.floor(Math.max(0, baseIutsRaw) / 100) * 100;

  // ── Step 8: IUTS brut ──
  const iuts_brut = calculerIUTSBrut(base_iuts);

  // ── Step 9: Abattement charges familiales ──
  const personnes_a_charge = nCharges;
  const abattement_familial = calculerAbattementFamilial(iuts_brut, nCharges);

  // ── Step 10: Net IUTS ──
  const iuts = Math.max(0, iuts_brut - abattement_familial);

  // ── Step 11: Salaire net ──
  const salaire_net = Math.round(salaire_brut - cnss_salarial - iuts - sAutresRet - sAvance);

  // ── Employer contribution ──
  const cnss_patronal = calculerCNSSPatronal(salaire_brut);

  return {
    salaire_brut,
    cnss_salarial,
    controle_cnss_fiscal,
    salaire_imposable_affiche,   // brut - CNSS (ligne "Salaire imposable" du bulletin)
    salaire_brut_imposable,      // brut - contrôle fiscal (base calcul exo)
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
    salaire_net_avant_deduction: salaire_brut - cnss_salarial - iuts - sAutresRet,
    retenue_effort_guerre: 0,
    avance_salaire: sAvance,
    salaire_net,
    cnss_patronal,
    nombre_parts: personnes_a_charge,
    charges_familiales: nCharges,
  };
}

// ── Kept for backward compat ───────────────────────────────
export function calculerPersonnesACharge(situationMatrimoniale, nombreEnfants = 0) {
  let charges = 0;
  if (situationMatrimoniale === 'Marié(e)') charges += 1;
  charges += Math.min(parseInt(nombreEnfants) || 0, 6);
  return Math.min(charges, 7);
}

export const MAX_ENFANTS_CHARGE = 6;

// ── Format FCFA amount ────────────────────────────────────
export function formatFCFA(montant) {
  if (montant === null || montant === undefined || isNaN(montant)) return '—';
  return Math.round(montant).toLocaleString('fr-FR') + ' FCFA';
}
