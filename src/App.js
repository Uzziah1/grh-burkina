import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useProfil } from './lib/useProfil';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import Contrats from './pages/Contrats';
import Conges from './pages/Conges';
import Avances from './pages/Avances';
import Documents from './pages/Documents';
import Entreprise from './pages/Entreprise';
import FicheAgent from './pages/FicheAgent';
import Utilisateurs from './pages/Utilisateurs';
import Paie from './pages/Paie';
import Historique from './pages/Historique';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [agents, setAgents] = useState([]);
  const [conges, setConges] = useState([]);
  const [avances, setAvances] = useState([]);
  const [entreprise, setEntreprise] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { profil, loading: profilLoading } = useProfil(user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    const [a, cg, av, ent] = await Promise.all([
      supabase.from('agents').select('*').order('nom'),
      supabase.from('conges').select('*,agents(nom,prenom)').order('created_at', { ascending: false }),
      supabase.from('avances').select('*,agents(nom,prenom)').order('created_at', { ascending: false }),
      supabase.from('entreprise').select('*').limit(1).single(),
    ]);
    setAgents(a.data || []);
    setConges(cg.data || []);
    setAvances(av.data || []);
    setEntreprise(ent.data || {});
  }

  function openFiche(agentId) {
    setSelectedAgentId(agentId);
    setPage('fiche');
  }

  if (loading || profilLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1C2B3A', color: '#fff', fontSize: 16 }}>
      Chargement...
    </div>
  );

  if (!user) return <Login onLogin={setUser} />;

  const pages = {
    dashboard: <Dashboard agents={agents} onOpenFiche={openFiche} />,
    agents: <Agents agents={agents} onRefresh={loadData} entreprise={entreprise} onOpenFiche={openFiche} profil={profil} />,
    contrats: <Contrats agents={agents} onOpenFiche={openFiche} />,
    conges: <Conges conges={conges} agents={agents} onRefresh={loadData} profil={profil} />,
    avances: <Avances avances={avances} agents={agents} onRefresh={loadData} profil={profil} />,
    paie: <Paie agents={agents} onRefresh={loadData} profil={profil} />,
    documents: <Documents agents={agents} entreprise={entreprise} profil={profil} />,
    historique: <Historique />,
    entreprise: <Entreprise onRefresh={loadData} />,
    fiche: <FicheAgent agentId={selectedAgentId} entreprise={entreprise} onBack={() => setPage('agents')} profil={profil} />,
    utilisateurs: <Utilisateurs profil={profil} />,
  };

  return (
    <Layout page={page} setPage={setPage} user={user} profil={profil} onLogout={() => supabase.auth.signOut()}>
      {pages[page] || pages.dashboard}
    </Layout>
  );
}