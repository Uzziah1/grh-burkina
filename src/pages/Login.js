// Login.js - RH Manager authentication page
// Full-screen video background with white gradient overlay

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

      {/* ── White gradient overlay: transparent left → white right ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 35%, rgba(255,255,255,0.92) 60%, rgba(255,255,255,1) 75%)',
        zIndex: 1,
      }} />

      {/* ── Login form panel (right side) ── */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '48%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 48px',
        zIndex: 2,
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              width: 76, height: 76,
              background: '#fff',
              borderRadius: 18,
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
              Gestion des Ressources Humaines
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 13,
              color: '#dc2626',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>

            {/* Email field */}
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
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 48px',
                    border: '1.5px solid rgba(0,0,0,0.12)',
                    borderRadius: 14, fontSize: 14,
                    background: 'rgba(255,255,255,0.85)',
                    color: '#1a1a2e', outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border 0.2s, background 0.2s',
                    backdropFilter: 'blur(8px)',
                  }}
                  onFocus={e => {
                    e.target.style.border = '1.5px solid #E8920A';
                    e.target.style.background = 'rgba(255,255,255,0.98)';
                  }}
                  onBlur={e => {
                    e.target.style.border = '1.5px solid rgba(0,0,0,0.12)';
                    e.target.style.background = 'rgba(255,255,255,0.85)';
                  }}
                />
              </div>
            </div>

            {/* Password field */}
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
                  style={{
                    width: '100%',
                    padding: '16px 48px 16px 48px',
                    border: '1.5px solid rgba(0,0,0,0.12)',
                    borderRadius: 14, fontSize: 14,
                    background: 'rgba(255,255,255,0.85)',
                    color: '#1a1a2e', outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border 0.2s, background 0.2s',
                    backdropFilter: 'blur(8px)',
                  }}
                  onFocus={e => {
                    e.target.style.border = '1.5px solid #E8920A';
                    e.target.style.background = 'rgba(255,255,255,0.98)';
                  }}
                  onBlur={e => {
                    e.target.style.border = '1.5px solid rgba(0,0,0,0.12)';
                    e.target.style.background = 'rgba(255,255,255,0.85)';
                  }}
                />
                {/* Toggle password visibility */}
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

            {/* Submit button */}
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

      {/* ── Responsive styles ── */}
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