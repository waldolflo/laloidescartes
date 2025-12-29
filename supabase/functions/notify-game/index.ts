import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import webpush from "npm:web-push";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// --- Supabase ---
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- WebPush ---
webpush.setVapidDetails(
  "mailto:contact@lebusmagique.fr",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "https://laloidescartes.vercel.app", // '*' possible en dev
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  // --- Preflight CORS ---
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    const { title, body, url } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: "Missing title or body" }), { status: 400, headers });
    }

    // --- Récupération des tokens ---
    let tokens: any[] = [];
    try {
      const { data, error } = await supabase
        .from("profils")
        .select("id, push_tokens:push_tokens(token)")
        .eq("notif_parties", 1);

      if (error) throw error;
      tokens = data || [];
      console.log(`[notify-game] Utilisateurs à notifier: ${tokens.length}`);
    } catch (err) {
      console.error("[notify-game] Erreur récupération tokens:", err);
      return new Response(JSON.stringify({ error: "Erreur récupération tokens" }), { status: 500, headers });
    }

    // --- Envoi des notifications ---
    let sent = 0;
    for (const user of tokens) {
      for (const t of user.push_tokens || []) {
        try {
          await webpush.sendNotification(
            JSON.parse(t.token),
            JSON.stringify({ title, body, url })
          );
          sent++;
        } catch (err) {
          console.error(`[notify-game] Erreur notification user ${user.id}:`, err);
        }
      }
    }
    console.log(`[notify-game] Notifications envoyées: ${sent}`);

    return new Response(JSON.stringify({ success: true, notified: sent }), { status: 200, headers });
  } catch (err) {
    console.error("[notify-game] Erreur générale:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
});
