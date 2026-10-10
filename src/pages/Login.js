// Login.js - RH Manager authentication page
// Full-screen video background with white gradient overlay
// Gère aussi le flux d'invitation (type=invite) pour définir le mot de passe

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, LogIn, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [password2, setPassword2]   = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Mode "définir le mot de passe" après invitation
  const [inviteMode, setInviteMode] = useState(false);

  // Au chargement, détecter le token d'invitation dans l'URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      // Supabase a déjà échangé le token — la session est active
      setInviteMode(true);
    }
  }, []);

  // ── Connexion normale ──────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email ou mot de passe incorrect');
      setLoading(false);
      return;
    }
    onLogin(data.user);
  }

  // ── Définir le mot de passe après invitation ──────────
  async function handleSetPassword(e) {
    e.preventDefault();
    if (password !== password2) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message || 'Erreur lors de la mise à jour du mot de passe');
      setLoading(false);
      return;
    }
    // Mot de passe défini → connecter l'utilisateur
    onLogin(data.user);
  }

  // ── Styles communs ────────────────────────────────────
  const inputStyle = {
    width: '100%',
    padding: '16px 16px 16px 48px',
    border: '1.5px solid rgba(0,0,0,0.12)',
    borderRadius: 14, fontSize: 14,
    background: 'rgba(255,255,255,0.85)',
    color: '#1a1a2e', outline: 'none',
    boxSizing: 'border-box',
    transition: 'border 0.2s, background 0.2s',
    backdropFilter: 'blur(8px)',
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Poppins', sans-serif",
    }}>

      {/* ── Full screen background video ── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      >
        <source src="/slide.mp4" type="video/mp4" />
      </video>

      {/* ── White gradient overlay ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 35%, rgba(255,255,255,0.92) 60%, rgba(255,255,255,1) 75%)',
        zIndex: 1,
      }} />

      {/* ── Panel droit ── */}
      <div style={{
        position: 'absolute',
        top: 0, right: 0,
        width: '48%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 48px',
        zIndex: 2, overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              width: 76, height: 76,
              background: '#fff', borderRadius: 18,
              margin: '0 auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
              overflow: 'hidden',
            }}>
              <span style={{ fontSize: 34 }}>👥</span>
            </div>
            <h1 style={{
              fontSize: 30, fontWeight: 800,
              color: '#1a1a2e', margin: '0 0 8px',
              letterSpacing: '-0.5px',
            }}>
              RH Manager
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              {inviteMode ? 'Définissez votre mot de passe pour accéder à votre compte' : 'Gestion des Ressources Humaines'}
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, padding: '12px 16px',
              fontSize: 13, color: '#dc2626',
              marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* ════════════════════════════
              MODE INVITATION
          ════════════════════════════ */}
          {inviteMode ? (
            <form onSubmit={handleSetPassword}>

              {/* Nouveau mot de passe */}
              <div style={{ marginBottom: 18 }}>
                <label style={{
                  display: 'block', fontSize: 13,
                  fontWeight: 600, color: '#374151', marginBottom: 8,
                }}>
                  Nouveau mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 16, top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af', display: 'flex', alignItems: 'center',
                  }}>
                    <Lock size={19} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 caractères"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoFocus
                    style={{ ...inputStyle, paddingRight: 48 }}
                    onFocus={e => { e.target.style.border = '1.5px solid #E8920A'; e.target.style.background = 'rgba(255,255,255,0.98)'; }}
                    onBlur={e => { e.target.style.border = '1.5px solid rgba(0,0,0,0.12)'; e.target.style.background = 'rgba(255,255,255,0.85)'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 16, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      cursor: 'pointer', color: '#9ca3af',
                      display: 'flex', alignItems: 'center', padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {/* Confirmation */}
              <div style={{ marginBottom: 32 }}>
                <label style={{
                  display: 'block', fontSize: 13,
                  fontWeight: 600, color: '#374151', marginBottom: 8,
                }}>
                  Confirmer le mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 16, top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af', display: 'flex', alignItems: 'center',
                  }}>
                    <Lock size={19} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Répétez votre mot de passe"
                    value={password2}
                    onChange={e => setPassword2(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={e => { e.target.style.border = '1.5px solid #E8920A'; e.target.style.background = 'rgba(255,255,255,0.98)'; }}
                    onBlur={e => { e.target.style.border = '1.5px solid rgba(0,0,0,0.12)'; e.target.style.background = 'rgba(255,255,255,0.85)'; }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '16px',
                  background: loading ? '#f0a830' : '#E8920A',
                  color: '#fff', border: 'none', borderRadius: 14,
                  fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10,
                  transition: 'background 0.2s, transform 0.1s',
                  boxShadow: '0 4px 20px rgba(232,146,10,0.35)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#d4820a'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#E8920A'; }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <KeyRound size={19} />
                {loading ? 'Enregistrement...' : 'Définir mon mot de passe'}
              </button>
            </form>

          ) : (
          /* ════════════════════════════
              MODE CONNEXION NORMALE
          ════════════════════════════ */
            <form onSubmit={handleLogin}>

              {/* Email */}
              <div style={{ marginBottom: 18 }}>
                <label style={{
                  display: 'block', fontSize: 13,
                  fontWeight: 600, color: '#374151', marginBottom: 8,
                }}>
                  Adresse email
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 16, top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af', display: 'flex', alignItems: 'center',
                  }}>
                    <Mail size={19} />
                  </div>
                  <input
                    type="email"
                    placeholder="agent@entreprise.bf"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={e => { e.target.style.border = '1.5px solid #E8920A'; e.target.style.background = 'rgba(255,255,255,0.98)'; }}
                    onBlur={e => { e.target.style.border = '1.5px solid rgba(0,0,0,0.12)'; e.target.style.background = 'rgba(255,255,255,0.85)'; }}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div style={{ marginBottom: 32 }}>
                <label style={{
                  display: 'block', fontSize: 13,
                  fontWeight: 600, color: '#374151', marginBottom: 8,
                }}>
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 16, top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af', display: 'flex', alignItems: 'center',
                  }}>
                    <Lock size={19} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, paddingRight: 48 }}
                    onFocus={e => { e.target.style.border = '1.5px solid #E8920A'; e.target.style.background = 'rgba(255,255,255,0.98)'; }}
                    onBlur={e => { e.target.style.border = '1.5px solid rgba(0,0,0,0.12)'; e.target.style.background = 'rgba(255,255,255,0.85)'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 16, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      cursor: 'pointer', color: '#9ca3af',
                      display: 'flex', alignItems: 'center', padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '16px',
                  background: loading ? '#f0a830' : '#E8920A',
                  color: '#fff', border: 'none', borderRadius: 14,
                  fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10,
                  transition: 'background 0.2s, transform 0.1s',
                  boxShadow: '0 4px 20px rgba(232,146,10,0.35)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#d4820a'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#E8920A'; }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <LogIn size={19} />
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>
          )}

          {/* Footer */}
          <div style={{
            textAlign: 'center', marginTop: 36,
            fontSize: 12, color: '#9ca3af', lineHeight: 1.9,
          }}>
            <div>© {new Date().getFullYear()} RH Manager</div>
            <div>Burkina Faso — Plateforme de Gestion RH</div>
          </div>
        </div>
      </div>

      {/* ── Responsive ── */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="width: 48%"] {
            width: 100% !important;
            padding: 32px 24px !important;
            background: rgba(255,255,255,0.95) !important;
          }
        }
      `}</style>
    </div>
  );
}
