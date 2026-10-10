// invite-user — Edge Function Supabase
// Crée un compte utilisateur et envoie un email d'invitation avec les accès.
// Requiert la clé service_role (configurée automatiquement dans l'environnement Supabase).
// Appelée uniquement par les admins depuis la page Utilisateurs.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Réponse CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Client admin (service_role) ───────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── Vérifier que l'appelant est admin ─────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier le rôle admin dans la table profils
    const { data: callerProfil } = await supabaseAdmin
      .from('profils').select('role').eq('id', caller.id).single();
    if (callerProfil?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Accès réservé aux administrateurs' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Lecture du corps de la requête ────────────────────
    const { email, prenom, nom, role } = await req.json();
    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'Email et rôle sont requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rolesValides = ['admin', 'rh', 'comptable'];
    if (!rolesValides.includes(role)) {
      return new Response(JSON.stringify({ error: 'Rôle invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Labels des rôles pour l'email ─────────────────────
    const roleLabels: Record<string, string> = {
      admin:     'Administrateur',
      rh:        'Responsable RH',
      comptable: 'Comptable',
    };

    // ── Invitation : crée le compte + envoie l'email Supabase ──
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { prenom, nom, role },
        redirectTo: `${Deno.env.get('SITE_URL') || 'http://localhost:3000'}/`,
      }
    );

    if (inviteError) {
      // Si l'utilisateur existe déjà
      if (inviteError.message?.includes('already registered')) {
        return new Response(JSON.stringify({ error: 'Un compte avec cet email existe déjà' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw inviteError;
    }

    const newUserId = inviteData.user?.id;

    // ── Créer ou mettre à jour le profil ─────────────────
    if (newUserId) {
      await supabaseAdmin.from('profils').upsert({
        id:     newUserId,
        email,
        prenom: prenom || null,
        nom:    nom || null,
        role,
        actif:  true,
      });
    }

    // ── Envoyer un email récapitulatif des accès ──────────
    // Supabase Auth envoie déjà l'email d'invitation avec le lien.
    // On envoie en plus un email récapitulatif via resend (si configuré)
    // ou on se contente de l'email Supabase qui suffit pour l'accès.
    // L'email Supabase contient déjà le lien de définition du mot de passe.

    return new Response(JSON.stringify({
      success: true,
      message: `Invitation envoyée à ${email}`,
      user: {
        id:    newUserId,
        email,
        prenom,
        nom,
        role,
        roleLabel: roleLabels[role],
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
