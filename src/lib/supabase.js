import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// ── TEST SEULEMENT — retirer après ──────────────────────────
const _getSession = supabase.auth.getSession.bind(supabase.auth);
supabase.auth.getSession = () =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Supabase simulé down')), 100)
  );
// ────────────────────────────────────────────────────────────
