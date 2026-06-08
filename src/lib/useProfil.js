import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useProfil(user) {
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (user) loadProfil();
  else { setProfil(null); setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user]);

  async function loadProfil() {
    setLoading(true);
    const { data } = await supabase.from('profils').select('*').eq('id', user.id).single();
    setProfil(data);
    setLoading(false);
  }

  return { profil, loading };
}

// Permissions par rôle
export const permissions = {
  admin: {
    voirAgents: true,
    modifierAgents: true,
    supprimerAgents: true,
    voirContrats: true,
    voirConges: true,
    modifierConges: true,
    voirAvances: true,
    modifierAvances: true,
    voirDocuments: true,
    voirUtilisateurs: true,
    modifierUtilisateurs: true,
    voirEntreprise: true,
    modifierEntreprise: true,
  },
  rh: {
    voirAgents: true,
    modifierAgents: true,
    supprimerAgents: true,
    voirContrats: true,
    voirConges: true,
    modifierConges: true,
    voirAvances: true,
    modifierAvances: true,
    voirDocuments: true,
    voirUtilisateurs: false,
    modifierUtilisateurs: false,
    voirEntreprise: true,
    modifierEntreprise: false,
  },
  comptable: {
    voirAgents: true,
    modifierAgents: false,
    supprimerAgents: false,
    voirContrats: true,
    voirConges: true,
    modifierConges: false,
    voirAvances: true,
    modifierAvances: true,
    voirDocuments: false,
    voirUtilisateurs: false,
    modifierUtilisateurs: false,
    voirEntreprise: false,
    modifierEntreprise: false,
  },
};

export function peutFaire(profil, action) {
  if (!profil) return false;
  return permissions[profil.role]?.[action] || false;
}