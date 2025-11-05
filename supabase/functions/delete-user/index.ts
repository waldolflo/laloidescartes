import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Récupère les variables d'environnement Supabase (elles sont dispo automatiquement)
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ⚠️ On doit utiliser la clé SERVICE ROLE (et pas anon/public)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req: Request) => {
  // Gestion du preflight (CORS OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://laloidescartes.vercel.app", // ⚠️ mets ton domaine exact ici
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId manquant" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://laloidescartes.vercel.app",
          },
        },
      );
    }

    // Supprime l'utilisateur de l'auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.log("userId reçu:", userId);
      console.error("Erreur deleteUser:", error); // 👈 log utile
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://laloidescartes.vercel.app",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://laloidescartes.vercel.app",
        },
      },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://laloidescartes.vercel.app",
        },
      },
    );
  }
});
