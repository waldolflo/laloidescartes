// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name}!`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/delete-user' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

// functions/delete-user/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

// Lire les variables d'environnement (set via supabase secrets)
const SUPABASEURL = Deno.env.get("SUPABASEURL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

if (!SUPABASEURL || !SERVICE_ROLE_KEY) {
  throw new Error("SUPABASEURL ou SERVICE_ROLE_KEY manquant(e)");
}

const supabaseAdmin = createClient(SUPABASEURL, SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    // Récupérer token Bearer
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing access token" }), { status: 401 });
    }

    // Valider le token et obtenir l'utilisateur correspondant
    const { data: tokenUserData, error: tokenErr } = await supabaseAdmin.auth.getUser(token);
    if (tokenErr || !tokenUserData?.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401 });
    }
    const callerUser = tokenUserData.user; // utilisateur à l'origine de la requête

    // Lire le body
    const body = await req.json().catch(() => ({}));
    const requestedTargetUserId = body?.userId ?? callerUser.id;
    const targetUserId = String(requestedTargetUserId);

    // Si la cible n'est pas soi-même, vérifier si callerUser a le rôle admin
    if (targetUserId !== callerUser.id) {
      // récupérer le role depuis la table profils
      const { data: callerProfil, error: profilErr } = await supabaseAdmin
        .from("profils")
        .select("role")
        .eq("id", callerUser.id)
        .single();

      if (profilErr || callerProfil?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: only admin can delete other users" }), { status: 403 });
      }
    }

    // --- Nettoyage / contraintes dépendantes ---
    // Exemple : supprimer les inscriptions du user
    await supabaseAdmin.from("inscriptions").delete().eq("utilisateur_id", targetUserId);

    // Exemple sûr : réinitialiser les parties créées par l'utilisateur (au lieu de supprimer les parties)
    // -> Ici on remet utilisateur_id à null pour garder l'historique
    await supabaseAdmin.from("parties").update({ utilisateur_id: null }).eq("utilisateur_id", targetUserId);

    // Supprimer la row du profil
    await supabaseAdmin.from("profils").delete().eq("id", targetUserId);

    // Supprimer l'utilisateur dans Auth (service_role)
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (delErr) {
      // si erreur, renvoyer
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error("delete-user function error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
});

