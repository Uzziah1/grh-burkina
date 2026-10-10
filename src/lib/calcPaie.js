// calcPaie.js — Moteur de calcul de la paie (Burkina Faso)
// Reproduit la logique du modèle Excel FASO ARMORED
//
// Ordre de calcul :
//  1. Salaire brut = somme de tous les éléments de rémunération
//  2. CNSS salarié = 5,5 % du brut, plafonné à 44 000 FCFA (valeur décimale, non arrondie)
//  3. Contrôle CNSS fiscal = salaire_base × 8 %
//  4. Salaire imposable IUTS = brut − contrôle fiscal
//  5. Exonérations sur indemnités (logement 20 %/75 k, transport 5 %/30 k, fonction 5 %/50 k)
//     plafonnées à l'indemnité réelle versée
//  6. Abattement forfaitaire = 25 % du salaire de base (ouvriers) ou 20 % (cadres/maîtrise)
//  7. Base IUTS = imposable_IUTS − exonérations − abattement (arrondie à la centaine inférieure)
//  8. IUTS brut = barème progressif par tranches sur la base arrondie
//  9. Abattement charges familiales = % selon le nombre de personnes à charge (max 4)
// 10. Net IUTS = IUTS brut − abattement familial
// 11. Salaire net = brut − CNSS − Net IUTS − autres retenues − avance
//
// Note : aucun arrondi intermédiaire sauf base IUTS et salaire net final.
// La retenue effort de guerre (1 % du net) est une charge patronale, elle n'impacte
// pas le salaire net de l'agent — elle est affichée dans l'état des salaires uniquement.

// ── Taux et plafonds CNSS ─────────────────────────────────
const CNSS_TAUX            = 0.055;   // 5,5 % cotisation salarié
const CNSS_PLAFOND_MONTANT = 44000;   // Plafond mensuel de cotisation CNSS (FCFA)
const CNSS_FISCAL_TAUX     = 0.08;    // 8 % contrôle fiscal sur le salaire de base
const CNSS_PATRONAL_TAUX   = 0.16;    // 16 % cotisation patronale

// ── Plafonds d'exonération sur indemnités ─────────────────
const EXO_LOGEMENT_TAUX     = 0.20;
const EXO_LOGEMENT_PLAFOND  = 75000;
const EXO_TRANSPORT_TAUX    = 0.05;
const EXO_TRANSPORT_PLAFOND = 30000;
const EXO_FONCTION_TAUX     = 0.05;
const EXO_FONCTION_PLAFOND  = 50000;

// ── Taux d'abattement forfaitaire selon catégorie ─────────
// Ouvriers : 25 % — Agents de maîtrise & Cadres : 20 %
const ABATTEMENT_FORFAITAIRE_TAUX_OUVRIER = 0.25;
const ABATTEMENT_FORFAITAIRE_TAUX_CADRE   = 0.20;

// Retourne le taux d'abattement forfaitaire selon la catégorie socioprofessionnelle
function getAbattementTaux(categorie) {
  const cat = (categorie || '').toLowerCase();
  if (cat.includes('cadre') || cat.includes('maîtrise') || cat.includes('maitrise')) {
    return ABATTEMENT_FORFAITAIRE_TAUX_CADRE;
  }
  return ABATTEMENT_FORFAITAIRE_TAUX_OUVRIER;
}

// ── Barème IUTS progressif (base imposable mensuelle) ─────
const IUTS_BAREME = [
  { plafond: 10000,    taux: 0     },
  { plafond: 20000,    taux: 0     },
  { plafond: 30000,    taux: 0     },
  { plafond: 50000,    taux: 0.121 },
  { plafond: 80000,    taux: 0.139 },
  { plafond: 120000,   taux: 0.157 },
  { plafond: 170000,   taux: 0.184 },
  { plafond: 250000,   taux: 0.217 },
  { plafond: Infinity, taux: 0.25  },
];

// ── Taux d'abattement charges familiales ──────────────────
// charges_familiales = nombre de personnes à charge (champ direct de l'agent, max 4)
const ABATTEMENT_CHARGES = {
  0: 0,
  1: 0.08,
  2: 0.10,
  3: 0.12,
  4: 0.14,
};

// ── Calcul de la cotisation CNSS salarié (plafonnée) ──────
export function calculerCNSS(salaireBrut) {
  const brut = parseFloat(salaireBrut) || 0;
  return Math.min(brut * CNSS_TAUX, CNSS_PLAFOND_MONTANT);
}

// ── Calcul de la cotisation CNSS patronale ────────────────
export function calculerCNSSPatronal(salaireBrut) {
  const brut = parseFloat(salaireBrut) || 0;
  return brut * CNSS_PATRONAL_TAUX;
}

// ── Calcul de l'IUTS brut sur base imposable ──────────────
// Application du barème progressif par tranches
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

// ── Calcul de l'abattement familial sur l'IUTS brut ───────
export function calculerAbattementFamilial(iutsBrut, chargesFamiliales) {
  const charges = Math.min(parseInt(chargesFamiliales) || 0, 4);
  const taux = ABATTEMENT_CHARGES[charges] || 0;
  return iutsBrut * taux;
}

// ── Calcul complet du bulletin de paie ────────────────────
export function calculerBulletin(data) {
  const {
    salaire_base                   = 0,
    sursalaire                     = 0,
    indemnite_logement             = 0,
    indemnite_transport            = 0,
    indemnite_fonction             = 0,
    prime_anciennete               = 0,
    autres_primes                  = 0,
    heures_sup                     = 0,
    autres_retenues                = 0,
    avance_salaire                 = 0,
    charges_familiales             = 0,   // nombre de personnes à charge (champ direct de l'agent)
    categorie_socioprofessionnelle = '',   // utilisé pour l'abattement forfaitaire
  } = data;

  // Conversion en nombre de toutes les entrées
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
  const nCharges      = Math.min(parseInt(charges_familiales) || 0, 4);

  // ── Étape 1 : Salaire brut ────────────────────────────────
  const salaire_brut = sBase + sSursalaire + sLogement + sTransport
    + sFonction + sAnciennete + sAutresPrimes + sHeuresSup;

  // ── Étape 2 : CNSS salarié (valeur décimale, non arrondie) ──
  const cnss_salarial = calculerCNSS(salaire_brut);

  // ── Étape 3 : Contrôle CNSS fiscal (8 % du salaire de base) ──
  const controle_cnss_fiscal = sBase * CNSS_FISCAL_TAUX;

  // ── Étape 4 : Salaire imposable IUTS (base de calcul des exonérations) ──
  const salaire_brut_imposable = salaire_brut - controle_cnss_fiscal;

  // Salaire imposable affiché sur le bulletin = brut − CNSS
  const salaire_imposable_affiche = salaire_brut - cnss_salarial;

  // ── Étape 5 : Exonérations sur indemnités ─────────────────
  // Chaque exonération est plafonnée à la fois par le taux réglementaire
  // et par l'indemnité réellement versée
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

  // ── Étape 6 : Abattement forfaitaire (selon catégorie) ────
  const abattement_forfaitaire = sBase * getAbattementTaux(categorie_socioprofessionnelle);

  // ── Étape 7 : Base IUTS (arrondie à la centaine inférieure) ──
  const baseIutsRaw = salaire_brut_imposable - total_exonerations - abattement_forfaitaire;
  const base_iuts = Math.floor(Math.max(0, baseIutsRaw) / 100) * 100;

  // ── Étape 8 : IUTS brut (barème progressif) ───────────────
  const iuts_brut = calculerIUTSBrut(base_iuts);

  // ── Étape 9 : Abattement charges familiales ───────────────
  const personnes_a_charge  = nCharges;
  const abattement_familial = calculerAbattementFamilial(iuts_brut, nCharges);

  // ── Étape 10 : Net IUTS ───────────────────────────────────
  const iuts = Math.max(0, iuts_brut - abattement_familial);

  // ── Étape 11 : Salaire net ────────────────────────────────
  const salaire_net = Math.round(salaire_brut - cnss_salarial - iuts - sAutresRet - sAvance);

  // ── Cotisation patronale CNSS ─────────────────────────────
  const cnss_patronal = calculerCNSSPatronal(salaire_brut);

  // ── Retenue effort de guerre (1 % du net) ─────────────────
  // Charge entièrement supportée par l'employeur : n'affecte PAS le salaire net de l'agent.
  // Elle est affichée dans l'état des salaires à titre informatif.
  const retenue_effort_guerre = Math.round(salaire_net * 0.01);

  return {
    salaire_brut,
    cnss_salarial,
    controle_cnss_fiscal,
    salaire_imposable_affiche,    // brut − CNSS (ligne « Salaire imposable » du bulletin)
    salaire_brut_imposable,       // brut − contrôle fiscal (base de calcul des exonérations)
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
    retenue_effort_guerre,        // 1 % du net — charge patronale uniquement
    avance_salaire: sAvance,
    salaire_net,
    cnss_patronal,
    nombre_parts: personnes_a_charge,
    charges_familiales: nCharges,
  };
}
