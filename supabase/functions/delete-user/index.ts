// supabase/functions/delete-user/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// URL et clé service_role (clé secrète à stocker dans les secrets)
const SUPABASEURL = Deno.env.get("SUPABASEURL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

// client supabase avec service role
const supabase = createClient(SUPABASEURL, SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Méthode non autorisée", { status: 405 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId manquant" }), {
        status: 400,
      });
    }

    // 🔹 1. Supprimer le profil en base
    const { error: profilError } = await supabase
      .from("profils")
      .delete()
      .eq("id", userId);

    if (profilError) {
      console.error("Erreur suppression profil :", profilError.message);
      return new Response(
        JSON.stringify({ error: "Erreur suppression profil" }),
        { status: 500 }
      );
    }

    // 🔹 2. Supprimer l’utilisateur dans Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("Erreur suppression auth :", authError.message);
      return new Response(
        JSON.stringify({ error: "Erreur suppression auth" }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ message: "✅ Utilisateur supprimé avec succès" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Erreur serveur :", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
    });
  }
});
