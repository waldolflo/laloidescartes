import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import webpush from "npm:web-push";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

webpush.setVapidDetails(
  "mailto:contact@lebusmagique.fr",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

serve(async (req) => {
  // --- CORS ---
  const headers = {
    "Access-Control-Allow-Origin": "https://laloidescartes.vercel.app", // ou '*' en dev
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    const { title, body, url } = await req.json();

    // Récupère tous les utilisateurs qui veulent des notifications de parties
    const { data: tokens, error } = await supabase
      .from("profils")
      .select("push_tokens:push_tokens(token)")
      .eq("notif_parties", 1);

    if (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }

    // Envoi des notifications
    for (const user of tokens || []) {
      for (const t of user.push_tokens || []) {
        try {
          await webpush.sendNotification(
            JSON.parse(t.token),
            JSON.stringify({ title, body, url })
          );
        } catch (err) {
          console.error("Erreur notification:", err);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
});
