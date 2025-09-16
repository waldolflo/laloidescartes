import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Vérifier que l’utilisateur envoie bien un JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token manquant" }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vérifier le token et récupérer l'utilisateur
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Utilisateur non authentifié" }), { status: 401 });
    }

    const userId = user.id;

    // 1. Supprimer dans la table profils
    await supabase.from("profils").delete().eq("id", userId);

    // 2. Supprimer dans auth.users
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Erreur deleteUser:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Erreur fonction delete-user:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 });
  }
});
