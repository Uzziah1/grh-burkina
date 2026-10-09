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
import EtatSalaires from './pages/EtatSalaires';

function SkeletonApp() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#1C2B3A', fontFamily: 'Poppins, sans-serif' }}>
      {/* Sidebar skeleton */}
      <div style={{ width: 240, background: '#152030', display: 'flex', flexDirection: 'column', padding: '24px 16px', gap: 8, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, padding: '0 8px' }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 12, width: '80%', marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 9, width: '55%' }} />
          </div>
        </div>
        {/* Nav items */}
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8 }}>
            <div className="skeleton" style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0 }} />
            <div className="skeleton" style={{ height: 11, width: `${45 + (i % 3) * 20}%` }} />
          </div>
        ))}
        {/* Bottom user */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
          <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 10, width: '70%', marginBottom: 5 }} />
            <div className="skeleton" style={{ height: 8, width: '45%' }} />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16 }}>
          <div className="skeleton-light" style={{ height: 13, width: 160 }} />
          <div style={{ flex: 1 }} />
          <div className="skeleton-light" style={{ height: 13, width: 90 }} />
          <div className="skeleton-light" style={{ width: 32, height: 32, borderRadius: '50%' }} />
        </div>

        {/* Content area */}
        <div style={{ flex: 1, padding: 28, background: '#F5F5F5', overflow: 'hidden' }}>
          {/* Page title + button */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            <div className="skeleton-light" style={{ height: 22, width: 180 }} />
            <div style={{ flex: 1 }} />
            <div className="skeleton-light" style={{ height: 36, width: 130, borderRadius: 8 }} />
          </div>

          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div className="skeleton-light" style={{ height: 10, width: '55%', marginBottom: 14 }} />
                <div className="skeleton-light" style={{ height: 26, width: '70%', marginBottom: 8 }} />
                <div className="skeleton-light" style={{ height: 9, width: '40%' }} />
              </div>
            ))}
          </div>

          {/* Table card */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {/* Table header */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E5E5E5' }}>
              {[30, 20, 15, 15, 20].map((w, i) => (
                <div key={i} className="skeleton-light" style={{ height: 10, width: `${w}%` }} />
              ))}
            </div>
            {/* Table rows */}
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F5F5F5' }}>
                <div style={{ width: '30%', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="skeleton-light" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton-light" style={{ height: 10, width: '75%', marginBottom: 5 }} />
                    <div className="skeleton-light" style={{ height: 8, width: '50%' }} />
                  </div>
                </div>
                {[20, 15, 15, 20].map((w, j) => (
                  <div key={j} className="skeleton-light" style={{ height: 10, width: `${w}%` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Pré-charger depuis le cache local pour éviter l'écran blanc au retour
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('grh_user_cached');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
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
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        try { localStorage.setItem('grh_user_cached', JSON.stringify(u)); } catch {}
      } else {
        try { localStorage.removeItem('grh_user_cached'); } catch {}
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        try { localStorage.setItem('grh_user_cached', JSON.stringify(u)); } catch {}
      } else {
        try { localStorage.removeItem('grh_user_cached'); } catch {}
      }
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

  if (loading || profilLoading) return <SkeletonApp />;

  if (!user) return <Login onLogin={setUser} />;

  // Toutes les pages sont montées une seule fois et masquées/affichées par CSS
  // pour que les états (modaux ouverts, formulaires en cours) survivent aux changements de page
  const show = id => ({ display: page === id ? 'contents' : 'none' });

  return (
    <Layout page={page} setPage={setPage} user={user} profil={profil} onLogout={() => supabase.auth.signOut()}>
      <div style={show('dashboard')}><Dashboard agents={agents} onOpenFiche={openFiche} /></div>
      <div style={show('agents')}><Agents agents={agents} onRefresh={loadData} entreprise={entreprise} onOpenFiche={openFiche} profil={profil} /></div>
      <div style={show('contrats')}><Contrats agents={agents} onOpenFiche={openFiche} /></div>
      <div style={show('conges')}><Conges conges={conges} agents={agents} onRefresh={loadData} profil={profil} entreprise={entreprise} /></div>
      <div style={show('avances')}><Avances avances={avances} agents={agents} onRefresh={loadData} profil={profil} entreprise={entreprise} /></div>
      <div style={show('paie')}><Paie agents={agents} onRefresh={loadData} profil={profil} /></div>
      <div style={show('documents')}><Documents agents={agents} entreprise={entreprise} profil={profil} /></div>
      <div style={show('etatSalaires')}><EtatSalaires entreprise={entreprise} profil={profil} /></div>
      <div style={show('historique')}><Historique /></div>
      <div style={show('entreprise')}><Entreprise onRefresh={loadData} /></div>
      <div style={show('fiche')}><FicheAgent agentId={selectedAgentId} entreprise={entreprise} onBack={() => setPage('agents')} profil={profil} /></div>
      <div style={show('utilisateurs')}><Utilisateurs profil={profil} /></div>
    </Layout>
  );
}