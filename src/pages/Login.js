// Login.js - RH Manager authentication page
// Split layout: photo left, white form panel right (like Biller design)

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Eye, EyeOff, LogIn, KeyRound, AlertTriangle } from 'lucide-react';

export default function Login({ onLogin, inviteMode = false }) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [password2, setPassword2]       = useState('');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError('Email ou mot de passe incorrect.'); setLoading(false); return; }
    onLogin(data.user);
  }

  async function handleSetPassword(e) {
    e.preventDefault();
    if (password !== password2) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 6)   { setError('Minimum 6 caractères requis.'); return; }
    setLoading(true); setError('');
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) { setError('Lien expiré. Contactez votre administrateur.'); setLoading(false); return; }
    onLogin(data.user);
  }

  const inputBase = {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 16px 13px 44px',
    border: '1.5px solid #E5E7EB',
    borderRadius: 10, fontSize: 14,
    color: '#111827', background: '#fff',
    outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      display: 'flex',
      width: '100vw', height: '100vh',
      fontFamily: "'Poppins', sans-serif",
      overflow: 'hidden',
    }}>

      {/* ── GAUCHE : photo plein écran ─────────────────────── */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Vidéo de fond */}
        <video
          autoPlay loop muted playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        >
          <source src="/slide.mp4" type="video/mp4" />
        </video>

        {/* Overlay sombre léger pour lisibilité */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(14,30,55,0.55) 0%, rgba(14,30,55,0.30) 100%)',
        }} />

        {/* Texte de marque sur la photo */}
        <div style={{
          position: 'absolute', bottom: 48, left: 48,
          color: '#fff',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.75, marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase' }}>
            Burkina Faso
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 10 }}>
            Gestion des<br />Ressources Humaines
          </div>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            Simplifiez votre administration RH
          </div>
        </div>
      </div>

      {/* ── DROITE : panneau formulaire blanc ─────────────────── */}
      <div style={{
        width: 560,
        flexShrink: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto',
      }}>
        {/* Fond blanc avec découpe oblique à gauche */}
        <div style={{
          position: 'absolute', inset: 0,
          background: '#fff',
          clipPath: 'polygon(80px 0%, 100% 0%, 100% 100%, 0% 100%)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        }} />
        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%',
          padding: '56px 60px 56px 80px',
        }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo */}
          <div style={{ marginBottom: 40 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 28,
            }}>
              {/* Icône SVG briefcase/RH */}
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #E8920A 0%, #f5a623 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(232,146,10,0.40)',
                flexShrink: 0,
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: '0.5px' }}>
                RH MANAGER
              </span>
            </div>

            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              {inviteMode ? 'Définissez votre mot de passe' : '¡Bienvenue sur RH MANAGER!'}
            </h2>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
              {inviteMode
                ? 'Créez un mot de passe sécurisé pour accéder à votre compte.'
                : 'Pour continuer, renseignez votre adresse email et votre mot de passe.'}
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 10, padding: '11px 14px',
              fontSize: 13, color: '#DC2626',
              marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* ── MODE INVITATION ── */}
          {inviteMode ? (
            <form onSubmit={handleSetPassword}>
              <Field label="Nouveau mot de passe">
                <InputIcon icon={<Lock size={17} />}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 caractères"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required autoFocus
                    style={{ ...inputBase, paddingRight: 44 }}
                    onFocus={e => e.target.style.borderColor = '#E8920A'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                  <ToggleEye show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                </InputIcon>
              </Field>

              <Field label="Confirmer le mot de passe" style={{ marginBottom: 36 }}>
                <InputIcon icon={<Lock size={17} />}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Répétez votre mot de passe"
                    value={password2}
                    onChange={e => setPassword2(e.target.value)}
                    required
                    style={inputBase}
                    onFocus={e => e.target.style.borderColor = '#E8920A'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </InputIcon>
              </Field>

              <SubmitBtn loading={loading} icon={<KeyRound size={17} />}>
                {loading ? 'Enregistrement...' : 'Définir mon mot de passe'}
              </SubmitBtn>
            </form>

          ) : (
          /* ── MODE CONNEXION ── */
            <form onSubmit={handleLogin}>
              <Field label="Adresse email">
                <InputIcon icon={<Mail size={17} />}>
                  <input
                    type="email"
                    placeholder="votre@email.bf"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required autoFocus
                    style={inputBase}
                    onFocus={e => e.target.style.borderColor = '#E8920A'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </InputIcon>
              </Field>

              <Field label="Mot de passe" style={{ marginBottom: 36 }}>
                <InputIcon icon={<Lock size={17} />}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ ...inputBase, paddingRight: 44 }}
                    onFocus={e => e.target.style.borderColor = '#E8920A'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                  <ToggleEye show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                </InputIcon>
              </Field>

              <SubmitBtn loading={loading} icon={<LogIn size={17} />}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </SubmitBtn>
            </form>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: '#D1D5DB' }}>
            © {new Date().getFullYear()} RH MANAGER · Burkina Faso
          </div>
        </div>
        </div>
      </div>

      {/* ── Responsive mobile ── */}
      <style>{`
        @media (max-width: 700px) {
          div[style*="width: 560px"] {
            width: 100% !important;
          }
          div[style*="flex: 1"] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ── Sous-composants internes ───────────────────────────────

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 18, ...style }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600,
        color: '#374151', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function InputIcon({ icon, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', left: 14, top: '50%',
        transform: 'translateY(-50%)',
        color: '#9CA3AF', display: 'flex', alignItems: 'center',
        pointerEvents: 'none',
      }}>
        {icon}
      </div>
      {children}
    </div>
  );
}

function ToggleEye({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        position: 'absolute', right: 14, top: '50%',
        transform: 'translateY(-50%)',
        background: 'none', border: 'none',
        cursor: 'pointer', color: '#9CA3AF',
        display: 'flex', alignItems: 'center', padding: 0,
      }}
    >
      {show ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );
}

function SubmitBtn({ loading, icon, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%', padding: '16px',
        background: loading ? '#f0a830' : '#E8920A',
        color: '#fff', border: 'none', borderRadius: 8,
        fontSize: 15, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 8,
        transition: 'background 0.2s, transform 0.1s',
        boxShadow: '0 4px 20px rgba(232,146,10,0.30)',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#d4820a'; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#E8920A'; }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {icon}
      {children}
    </button>
  );
}
