export function getInitials(nom, prenom) {
  return ((prenom || '')[0] || '') + ((nom || '')[0] || '');
}

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

export function age(dob) {
  if (!dob) return '-';
  const d = new Date(dob), n = new Date();
  return Math.floor((n - d) / (365.25 * 24 * 3600 * 1000));
}

export function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
}

export function formatMontant(montant) {
  if (!montant) return '-';
  return parseInt(montant).toLocaleString('fr-FR') + ' FCFA';
}

export function joursRestants(dateFin) {
  if (!dateFin) return null;
  return Math.round((new Date(dateFin) - new Date()) / (1000 * 3600 * 24));
}