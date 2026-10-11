import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
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
import Badge from './pages/Badge';
import Archives from './pages/Archives';

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

// ── FicheWrapper : reads :agentId from URL ───────────────────
function FicheWrapper({ agents, entreprise, profil }) {
  const { agentId } = useParams();
  const navigate = useNavigate();
  return (
    <FicheAgent
      agentId={agentId}
      entreprise={entreprise}
      onBack={() => navigate('/agents')}
      profil={profil}
    />
  );
}

// ── AppRoutes : routes internes (user connecté) ──────────────
function AppRoutes({ user, profil, agents, entreprise, loadData }) {
  const navigate = useNavigate();
  const openFiche = (id) => navigate(`/agents/${id}`);

  return (
    <Layout user={user} profil={profil} onLogout={() => supabase.auth.signOut()}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard agents={agents} onOpenFiche={openFiche} />} />
        <Route path="/agents" element={<Agents agents={agents} onRefresh={loadData} entreprise={entreprise} onOpenFiche={openFiche} profil={profil} />} />
        <Route path="/agents/:agentId" element={<FicheWrapper agents={agents} entreprise={entreprise} profil={profil} />} />
        <Route path="/contrats" element={<Contrats agents={agents} onOpenFiche={openFiche} />} />
        <Route path="/conges" element={<Conges agents={agents} onRefresh={loadData} profil={profil} entreprise={entreprise} />} />
        <Route path="/avances" element={<Avances agents={agents} onRefresh={loadData} profil={profil} entreprise={entreprise} />} />
        <Route path="/paie" element={<Paie agents={agents} onRefresh={loadData} profil={profil} entreprise={entreprise} />} />
        <Route path="/etat-salaires" element={<EtatSalaires entreprise={entreprise} profil={profil} />} />
        <Route path="/documents" element={<Documents agents={agents} entreprise={entreprise} profil={profil} />} />
        <Route path="/badges" element={<Badge agents={agents} entreprise={entreprise} />} />
        <Route path="/historique" element={<Historique />} />
        <Route path="/entreprise" element={<Entreprise onRefresh={loadData} />} />
        <Route path="/utilisateurs" element={<Utilisateurs profil={profil} />} />
        <Route path="/archives" element={<Archives profil={profil} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
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
  const [agents, setAgents] = useState([]);
  const [entreprise, setEntreprise] = useState(null);
  const [loading, setLoading] = useState(true);
  // true = l'utilisateur vient de cliquer sur un lien d'invitation et doit définir son mdp
  const [needsPassword, setNeedsPassword] = useState(false);
  const { profil, loading: profilLoading } = useProfil(user);

  useEffect(() => {
    // Détecter le flux d'invitation dans le hash AVANT getSession
    const hash = window.location.hash;
    if (hash.includes('type=invite')) {
      setNeedsPassword(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      // Si c'est une invitation, ne pas connecter directement
      if (!hash.includes('type=invite')) {
        setUser(u);
        if (u) {
          try { localStorage.setItem('grh_user_cached', JSON.stringify(u)); } catch {}
        } else {
          try { localStorage.removeItem('grh_user_cached'); } catch {}
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Si l'utilisateur vient de définir son mot de passe, le connecter
      if (event === 'USER_UPDATED') {
        setNeedsPassword(false);
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          try { localStorage.setItem('grh_user_cached', JSON.stringify(u)); } catch {}
        }
        return;
      }
      // Ignorer SIGNED_IN pendant le flux d'invitation
      if (event === 'SIGNED_IN' && window.location.hash.includes('type=invite')) {
        return;
      }
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        try { localStorage.setItem('grh_user_cached', JSON.stringify(u)); } catch {}
      } else {
        try { localStorage.removeItem('grh_user_cached'); } catch {}
      }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) loadData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    const [a, ent] = await Promise.all([
      supabase.from('agents').select('*').order('nom'),
      supabase.from('entreprise').select('*').limit(1).single(),
    ]);
    setAgents(a.data || []);
    setEntreprise(ent.data || {});
  }

  if (loading || profilLoading) return <SkeletonApp />;

  // Flux d'invitation : afficher le formulaire de définition de mot de passe
  if (needsPassword) return <BrowserRouter><Login onLogin={setUser} inviteMode /></BrowserRouter>;

  if (!user) return <BrowserRouter><Login onLogin={setUser} /></BrowserRouter>;

  return (
    <BrowserRouter>
      <AppRoutes
        user={user}
        profil={profil}
        agents={agents}
        entreprise={entreprise}
        loadData={loadData}
      />
    </BrowserRouter>
  );
}
