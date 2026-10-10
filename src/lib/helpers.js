// helpers.js — Fonctions utilitaires partagées dans toute l'application
// Formatage des dates, montants, initiales et couleurs d'avatars

// ── Initiales d'un agent ──────────────────────────────────
// Retourne les deux premières lettres (prénom + nom) en majuscules
export function getInitials(nom, prenom) {
  return ((prenom || '')[0] || '') + ((nom || '')[0] || '');
}

// ── Couleur d'avatar déterministe ─────────────────────────
// Attribue une couleur stable à chaque agent selon son nom (hash simple)
export function avatarColor(name) {
  const colors = [
    { bg: '#DBEAFE', fg: '#1E40AF' },
    { bg: '#D1FAE5', fg: '#065F46' },
    { bg: '#FEF3C7', fg: '#92400E' },
    { bg: '#FCE7F3', fg: '#9D174D' },
    { bg: '#EDE9FE', fg: '#4C1D95' },
    { bg: '#FEE2E2', fg: '#991B1B' },
  ];
  let h = 0;
  for (let c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[Math.abs(h) % colors.length];
}

// ── Calcul de l'âge en années ─────────────────────────────
// Retourne '-' si la date de naissance est absente
export function age(dob) {
  if (!dob) return '-';
  const d = new Date(dob);
  const n = new Date();
  return Math.floor((n - d) / (365.25 * 24 * 3600 * 1000));
}

// ── Formatage de date en français ─────────────────────────
// Retourne '-' si la date est absente
export function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
}

// ── Formatage d'un montant en FCFA ───────────────────────
// Retourne '-' si la valeur est absente ou vide (mais pas si 0)
// Ex : formatMontant(150000) => "150 000 FCFA"
export function formatMontant(montant) {
  if (montant === null || montant === undefined || montant === '') return '-';
  return parseInt(montant).toLocaleString('fr-FR') + ' FCFA';
}

// ── Jours restants avant une date d'échéance ─────────────
// Utilisé pour afficher les alertes de contrats, visites médicales, etc.
// Retourne null si la date est absente
export function joursRestants(dateFin) {
  if (!dateFin) return null;
  return Math.round((new Date(dateFin) - new Date()) / (1000 * 3600 * 24));
}
