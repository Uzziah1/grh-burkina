import { jsPDF } from 'jspdf';

const BLEU = [0, 51, 102];
const VERT = [0, 135, 90];
const GRIS = [100, 100, 100];

function entete(doc, entreprise) {
  doc.setFillColor(...BLEU);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(entreprise.nom || 'Nom de l\'entreprise', 14, 11);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const infos = [
    entreprise.forme_juridique,
    entreprise.siege_social,
    entreprise.rccm ? `RCCM: ${entreprise.rccm}` : '',
    entreprise.ifu ? `IFU: ${entreprise.ifu}` : '',
    entreprise.telephone,
  ].filter(Boolean).join('  |  ');
  doc.text(infos, 14, 18);
  doc.setFontSize(9);
  doc.text(`Représenté par: ${entreprise.representant || '___'}, ${entreprise.qualite_representant || '___'}`, 14, 24);
  doc.setTextColor(0, 0, 0);
}

function titrePrincipal(doc, titre, y) {
  doc.setFillColor(...BLEU);
  doc.rect(14, y, 182, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(titre, 105, y + 7, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  return y + 16;
}

function sectionTitle(doc, titre, y) {
  doc.setFillColor(220, 230, 242);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(...BLEU);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(titre, 17, y + 5.5);
  doc.setTextColor(0, 0, 0);
  return y + 12;
}

function champ(doc, label, valeur, x, y, largeur = 85) {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRIS);
  doc.text(label + ' :', x, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(valeur || '___________________________', x, y + 5);
  doc.setDrawColor(180, 180, 180);
  doc.line(x, y + 6, x + largeur, y + 6);
  return y + 12;
}

function texte(doc, txt, x, y, maxWidth = 182) {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(txt, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * 5 + 2;
}

function article(doc, numero, titre, contenu, y) {
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...VERT);
  doc.text(`Article ${numero} — ${titre}`, 14, y);
  doc.setTextColor(0, 0, 0);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(contenu, 182);
  lines.forEach(line => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(line, 14, y);
    y += 5;
  });
  return y + 4;
}

function signatures(doc, y, entreprise) {
  if (y > 240) { doc.addPage(); y = 20; }
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('L\'EMPLOYEUR', 30, y, { align: 'center' });
  doc.text('L\'EMPLOYÉ(E)', 165, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text('(Nom, Qualité, Cachet et Signature)', 30, y, { align: 'center' });
  doc.text('(Lu et approuvé)', 165, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 30;
  doc.setDrawColor(0, 0, 0);
  doc.line(10, y, 70, y);
  doc.line(130, y, 195, y);
  return y;
}

function piedPage(doc, today) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 285, 196, 285);
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(`Document généré le ${today} — Confidentiel`, 14, 290);
    doc.text(`Page ${i} / ${pageCount}`, 196, 290, { align: 'right' });
  }
}

export function generateAttestation(agent, entreprise) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  entete(doc, entreprise);
  let y = 35;
  y = titrePrincipal(doc, 'ATTESTATION DE TRAVAIL', y);

  y = sectionTitle(doc, 'INFORMATIONS SUR L\'EMPLOYÉ(E)', y);
  y = champ(doc, 'Nom et Prénom(s)', `${agent.prenom} ${agent.nom}`, 14, y, 182);
  y = champ(doc, 'Date de naissance', agent.date_naissance ? new Date(agent.date_naissance).toLocaleDateString('fr-FR') : '', 14, y, 85);
  y = champ(doc, 'Lieu de naissance', agent.lieu_naissance || '', 110, y - 12, 85);
  y = champ(doc, 'Nationalité', agent.nationalite || 'Burkinabè', 14, y, 85);
  y = champ(doc, 'N° CNI / Passeport', agent.numero_piece || '', 110, y - 12, 85);
  y = champ(doc, 'N° NIN', agent.nin || '', 14, y, 85);

  y = sectionTitle(doc, 'ATTESTATION D\'EMPLOI', y);
  const texteAttestation = `Nous soussignés, ${entreprise.representant || '___'}, ${entreprise.qualite_representant || '___'} de la société ${entreprise.nom || '___'}, certifions par la présente que Monsieur / Madame ${agent.prenom} ${agent.nom} est employé(e) dans notre structure depuis le ${agent.date_embauche ? new Date(agent.date_embauche).toLocaleDateString('fr-FR') : '___'}, en qualité de ${agent.poste || '___'} au sein du département ${agent.departement || '___'}. L'intéressé(e) est lié(e) à notre structure par un Contrat de Travail à ${agent.type_contrat || '___'}.`;
  y = texte(doc, texteAttestation, 14, y, 182);
  y += 4;
  y = texte(doc, 'Cette attestation lui est délivrée à sa demande pour servir et valoir ce que de droit.', 14, y, 182);
  y += 8;
  doc.setFontSize(9);
  doc.text(`Fait à ${entreprise.ville || 'Ouagadougou'}, le ${today}`, 14, y);
  y += 6;
  signatures(doc, y, entreprise);
  piedPage(doc, today);
  doc.save(`attestation_${agent.prenom}_${agent.nom}_${today.replace(/\//g, '-')}.pdf`);
}

export function generateConge(agent, entreprise) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  entete(doc, entreprise);
  let y = 35;
  y = titrePrincipal(doc, 'AUTORISATION DE CONGÉ', y);

  y = sectionTitle(doc, 'INFORMATIONS SUR L\'AGENT', y);
  y = champ(doc, 'Nom et Prénom(s)', `${agent.prenom} ${agent.nom}`, 14, y, 85);
  y = champ(doc, 'Matricule', agent.matricule || '', 110, y - 12, 85);
  y = champ(doc, 'Poste', agent.poste || '', 14, y, 85);
  y = champ(doc, 'Département', agent.departement || '', 110, y - 12, 85);

  y = sectionTitle(doc, 'DÉTAILS DU CONGÉ', y);
  y = champ(doc, 'Date de début', '', 14, y, 85);
  y = champ(doc, 'Date de fin', '', 110, y - 12, 85);
  y = champ(doc, 'Nombre de jours ouvrables', '', 14, y, 85);
  y = champ(doc, 'Motif', 'Congé annuel payé', 110, y - 12, 85);
  y = champ(doc, 'Date de reprise prévue', '', 14, y, 182);

  y += 4;
  y = texte(doc, `Nous soussignés, ${entreprise.representant || '___'}, ${entreprise.qualite_representant || '___'} de la société ${entreprise.nom || '___'}, autorisons par la présente Monsieur / Madame ${agent.prenom} ${agent.nom} à bénéficier du congé mentionné ci-dessus.`, 14, y, 182);

  y += 6;
  doc.setFontSize(9);
  doc.text(`Fait à ${entreprise.ville || 'Ouagadougou'}, le ${today}`, 14, y);
  signatures(doc, y + 6, entreprise);
  piedPage(doc, today);
  doc.save(`conge_${agent.prenom}_${agent.nom}_${today.replace(/\//g, '-')}.pdf`);
}

export function generateAbsence(agent, entreprise) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  entete(doc, entreprise);
  let y = 35;
  y = titrePrincipal(doc, 'AUTORISATION D\'ABSENCE', y);

  y = sectionTitle(doc, 'INFORMATIONS SUR L\'AGENT', y);
  y = champ(doc, 'Nom et Prénom(s)', `${agent.prenom} ${agent.nom}`, 14, y, 85);
  y = champ(doc, 'Matricule', agent.matricule || '', 110, y - 12, 85);
  y = champ(doc, 'Poste', agent.poste || '', 14, y, 85);
  y = champ(doc, 'Département', agent.departement || '', 110, y - 12, 85);

  y = sectionTitle(doc, 'DÉTAILS DE L\'ABSENCE', y);
  y = champ(doc, 'Date', '', 14, y, 85);
  y = champ(doc, 'Heure de départ', '', 110, y - 12, 85);
  y = champ(doc, 'Heure de retour', '', 14, y, 85);
  y = champ(doc, 'Motif', '', 110, y - 12, 85);

  y += 4;
  y = texte(doc, 'Cette autorisation est accordée à titre exceptionnel et ne saurait constituer un précédent.', 14, y, 182);
  y += 6;
  doc.setFontSize(9);
  doc.text(`Fait à ${entreprise.ville || 'Ouagadougou'}, le ${today}`, 14, y);
  signatures(doc, y + 6, entreprise);
  piedPage(doc, today);
  doc.save(`absence_${agent.prenom}_${agent.nom}_${today.replace(/\//g, '-')}.pdf`);
}

export function generateAvance(agent, entreprise) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  entete(doc, entreprise);
  let y = 35;
  y = titrePrincipal(doc, 'DEMANDE D\'AVANCE SUR SALAIRE', y);

  y = sectionTitle(doc, 'INFORMATIONS SUR L\'AGENT', y);
  y = champ(doc, 'Nom et Prénom(s)', `${agent.prenom} ${agent.nom}`, 14, y, 85);
  y = champ(doc, 'Matricule', agent.matricule || '', 110, y - 12, 85);
  y = champ(doc, 'Poste', agent.poste || '', 14, y, 85);
  y = champ(doc, 'Département', agent.departement || '', 110, y - 12, 85);
  y = champ(doc, 'Salaire brut mensuel', agent.salaire_brut ? parseInt(agent.salaire_brut).toLocaleString('fr-FR') + ' FCFA' : '', 14, y, 182);

  y = sectionTitle(doc, 'DÉTAILS DE LA DEMANDE', y);
  y = champ(doc, 'Montant demandé (FCFA)', '', 14, y, 85);
  y = champ(doc, 'Montant en lettres', '', 110, y - 12, 85);
  y = champ(doc, 'Motif', '', 14, y, 182);

  y = sectionTitle(doc, 'MODALITÉS DE REMBOURSEMENT', y);
  y = champ(doc, 'Mois 1 (FCFA)', '', 14, y, 85);
  y = champ(doc, 'Mois 2 (FCFA)', '', 110, y - 12, 85);

  y += 4;
  doc.setFontSize(9);
  doc.text(`Fait à ${entreprise.ville || 'Ouagadougou'}, le ${today}`, 14, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('L\'Employé(e)', 30, y, { align: 'center' });
  doc.text('Avis DRH', 105, y, { align: 'center' });
  doc.text('Décision Direction', 175, y, { align: 'center' });
  y += 25;
  doc.setDrawColor(0, 0, 0);
  doc.line(10, y, 60, y);
  doc.line(80, y, 130, y);
  doc.line(148, y, 198, y);

  piedPage(doc, today);
  doc.save(`avance_${agent.prenom}_${agent.nom}_${today.replace(/\//g, '-')}.pdf`);
}

export function generateCDI(agent, entreprise) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  entete(doc, entreprise);
  let y = 35;
  y = titrePrincipal(doc, 'CONTRAT À DURÉE INDÉTERMINÉE (CDI)', y);

  y = sectionTitle(doc, 'PARTIES AU CONTRAT', y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('L\'EMPLOYEUR :', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  const empInfos = [
    `Raison sociale : ${entreprise.nom || '___'}`,
    `Forme juridique : ${entreprise.forme_juridique || '___'}`,
    `Siège social : ${entreprise.siege_social || '___'}`,
    `RCCM : ${entreprise.rccm || '___'}   |   IFU : ${entreprise.ifu || '___'}`,
    `Représenté par : ${entreprise.representant || '___'}, ${entreprise.qualite_representant || '___'}`,
  ];
  empInfos.forEach(info => { doc.text(info, 18, y); y += 5; });

  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('L\'EMPLOYÉ(E) :', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  const agentInfos = [
    `Nom et Prénom(s) : ${agent.prenom} ${agent.nom}`,
    `Date et lieu de naissance : ${agent.date_naissance ? new Date(agent.date_naissance).toLocaleDateString('fr-FR') : '___'} à ${agent.lieu_naissance || '___'}`,
    `Nationalité : ${agent.nationalite || 'Burkinabè'}   |   N° CNI/Passeport : ${agent.numero_piece || '___'}`,
    `N° NIN : ${agent.nin || '___'}   |   N° CNSS : ${agent.cnss || '___'}`,
    `Adresse : ${agent.adresse || '___'}`,
  ];
  agentInfos.forEach(info => { if (y > 270) { doc.addPage(); y = 20; } doc.text(info, 18, y); y += 5; });

  y += 3;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Ci-après désignés respectivement « l\'Employeur » et « l\'Employé(e) », il a été convenu ce qui suit :', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 8;

  y = article(doc, 1, 'Nature et objet du contrat',
    `L'Employeur engage l'Employé(e) en qualité de ${agent.poste || '___'} au sein du département ${agent.departement || '___'}. Le présent contrat est conclu pour une durée indéterminée, conformément aux dispositions du Code du Travail burkinabè en vigueur.`, y);

  y = article(doc, 2, 'Période d\'essai',
    `Le présent contrat est assorti d'une période d'essai de ___________________________ à compter de la date de prise de service effective. Durant cette période, chacune des parties peut mettre fin au contrat dans les conditions prévues par la loi.`, y);

  y = article(doc, 3, 'Prise de service',
    `L'Employé(e) prendra ses fonctions le ${agent.date_embauche ? new Date(agent.date_embauche).toLocaleDateString('fr-FR') : '___'} au lieu de travail suivant : ${entreprise.siege_social || '___'}.`, y);

  y = article(doc, 4, 'Durée et organisation du travail',
    `La durée hebdomadaire de travail est fixée conformément à la réglementation en vigueur. Horaires : ___________________________.`, y);

  y = article(doc, 5, 'Rémunération',
    `En contrepartie de son travail, l'Employé(e) percevra un salaire brut mensuel de ${agent.salaire_brut ? parseInt(agent.salaire_brut).toLocaleString('fr-FR') + ' FCFA' : '___________'}. Le salaire est versé mensuellement au plus tard le dernier jour ouvrable du mois.`, y);

  y = article(doc, 6, 'Classification professionnelle',
    `L'Employé(e) est classé(e) dans la catégorie ${agent.categorie_socioprofessionnelle || '___'}, conformément à la convention collective applicable à la branche d'activité de l'entreprise.`, y);

  y = article(doc, 7, 'Congés payés',
    `L'Employé(e) bénéficie des congés payés conformément aux dispositions du Code du Travail burkinabè en vigueur, acquis au taux légal par mois de travail effectif.`, y);

  y = article(doc, 8, 'Protection sociale',
    `L'Employé(e) sera affilié(e) à la Caisse Nationale de Sécurité Sociale (CNSS) dès la prise de service. Les cotisations patronales et salariales seront versées selon les taux légaux en vigueur.`, y);

  y = article(doc, 9, 'Obligations des parties',
    `L'Employé(e) s'engage à exécuter consciencieusement les tâches qui lui sont confiées, à respecter le règlement intérieur et à maintenir la confidentialité sur les informations de l'entreprise. L'Employeur s'engage à verser la rémunération convenue, à fournir les moyens nécessaires et à assurer des conditions de travail conformes à la réglementation.`, y);

  y = article(doc, 10, 'Rupture du contrat',
    `La rupture du présent contrat peut intervenir par démission de l'Employé(e) ou par licenciement de l'Employeur, dans le respect des procédures et délais de préavis prévus par le Code du Travail burkinabè en vigueur.`, y);

  y = article(doc, 11, 'Droit applicable',
    `Le présent contrat est régi par le Code du Travail burkinabè en vigueur et ses textes d'application. Tout litige sera soumis aux juridictions du travail compétentes au Burkina Faso.`, y);

  y = article(doc, 12, 'Dispositions diverses',
    `Le présent contrat est établi en deux exemplaires originaux, dont un remis à l'Employé(e) contre décharge et un conservé par l'Employeur. Il ne peut être modifié que par avenant écrit signé des deux parties.`, y);

  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFontSize(9);
  doc.text(`Fait à ${entreprise.ville || 'Ouagadougou'}, le ${today}, en double exemplaire original.`, 14, y);
  signatures(doc, y + 6, entreprise);
  piedPage(doc, today);
  doc.save(`contrat_CDI_${agent.prenom}_${agent.nom}_${today.replace(/\//g, '-')}.pdf`);
}

export function generateCDD(agent, entreprise) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('fr-FR');

  entete(doc, entreprise);
  let y = 35;
  y = titrePrincipal(doc, 'CONTRAT À DURÉE DÉTERMINÉE (CDD)', y);

  y = sectionTitle(doc, 'PARTIES AU CONTRAT', y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('L\'EMPLOYEUR :', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  const empInfos = [
    `Raison sociale : ${entreprise.nom || '___'}`,
    `Forme juridique : ${entreprise.forme_juridique || '___'}`,
    `Siège social : ${entreprise.siege_social || '___'}`,
    `RCCM : ${entreprise.rccm || '___'}   |   IFU : ${entreprise.ifu || '___'}`,
    `Représenté par : ${entreprise.representant || '___'}, ${entreprise.qualite_representant || '___'}`,
  ];
  empInfos.forEach(info => { doc.text(info, 18, y); y += 5; });

  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text('L\'EMPLOYÉ(E) :', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  const agentInfos = [
    `Nom et Prénom(s) : ${agent.prenom} ${agent.nom}`,
    `Date et lieu de naissance : ${agent.date_naissance ? new Date(agent.date_naissance).toLocaleDateString('fr-FR') : '___'} à ${agent.lieu_naissance || '___'}`,
    `Nationalité : ${agent.nationalite || 'Burkinabè'}   |   N° CNI/Passeport : ${agent.numero_piece || '___'}`,
    `N° NIN : ${agent.nin || '___'}   |   N° CNSS : ${agent.cnss || '___'}`,
    `Adresse : ${agent.adresse || '___'}`,
  ];
  agentInfos.forEach(info => { if (y > 270) { doc.addPage(); y = 20; } doc.text(info, 18, y); y += 5; });

  y += 3;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Ci-après désignés respectivement « l\'Employeur » et « l\'Employé(e) », il a été convenu ce qui suit :', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 8;

  y = article(doc, 1, 'Engagement et motif du contrat',
    `L'Employeur engage l'Employé(e) en qualité de ${agent.poste || '___'} au sein du département ${agent.departement || '___'}. Le présent CDD est justifié par le motif suivant : ___________________________.`, y);

  y = article(doc, 2, 'Durée du contrat',
    `Le présent contrat prend effet le ${agent.date_embauche ? new Date(agent.date_embauche).toLocaleDateString('fr-FR') : '___'} et prend fin le ${agent.date_fin_contrat ? new Date(agent.date_fin_contrat).toLocaleDateString('fr-FR') : '___'}. À l'échéance du terme, le contrat prend fin de plein droit, sauf renouvellement express par écrit.`, y);

  y = article(doc, 3, 'Période d\'essai',
    `Le présent contrat est assorti d'une période d'essai de ___________________________ à compter de la date de prise de service, proportionnelle à la durée du contrat.`, y);

  y = article(doc, 4, 'Lieu de travail et horaires',
    `L'Employé(e) exercera ses fonctions à ${entreprise.siege_social || '___'}. La durée hebdomadaire de travail est fixée conformément à la réglementation en vigueur.`, y);

  y = article(doc, 5, 'Rémunération',
    `En contrepartie de son travail, l'Employé(e) percevra un salaire brut mensuel de ${agent.salaire_brut ? parseInt(agent.salaire_brut).toLocaleString('fr-FR') + ' FCFA' : '___________'}. Le salaire est versé mensuellement au plus tard le dernier jour ouvrable du mois.`, y);

  y = article(doc, 6, 'Classification professionnelle',
    `L'Employé(e) est classé(e) dans la catégorie ${agent.categorie_socioprofessionnelle || '___'}, conformément à la convention collective applicable.`, y);

  y = article(doc, 7, 'Congés payés',
    `L'Employé(e) bénéficie des congés payés conformément aux dispositions du Code du Travail burkinabè en vigueur, au prorata de la durée du contrat.`, y);

  y = article(doc, 8, 'Protection sociale',
    `L'Employé(e) sera affilié(e) à la Caisse Nationale de Sécurité Sociale (CNSS) dès la prise de service.`, y);

  y = article(doc, 9, 'Rupture anticipée',
    `La rupture anticipée du présent CDD ne peut intervenir qu'en cas d'accord écrit des deux parties, de faute grave ou lourde, ou de force majeure dûment constatée, conformément aux dispositions du Code du Travail burkinabè en vigueur.`, y);

  y = article(doc, 10, 'Droit applicable',
    `Le présent contrat est régi par le Code du Travail burkinabè en vigueur. Tout litige sera soumis aux juridictions du travail compétentes au Burkina Faso.`, y);

  y = article(doc, 11, 'Dispositions diverses',
    `Le présent contrat est établi en deux exemplaires originaux, dont un remis à l'Employé(e) contre décharge et un conservé par l'Employeur.`, y);

  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFontSize(9);
  doc.text(`Fait à ${entreprise.ville || 'Ouagadougou'}, le ${today}, en double exemplaire original.`, 14, y);
  signatures(doc, y + 6, entreprise);
  piedPage(doc, today);
  doc.save(`contrat_CDD_${agent.prenom}_${agent.nom}_${today.replace(/\//g, '-')}.pdf`);
}