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
    "Access-Control-Allow-Origin": "https://laloidescartes.vercel.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  // --- CORS ---
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  }

  try {
    console.log("[notify-game] 🔔 Requête reçue");

    const payload = await req.json();
    console.log("[notify-game] Payload:", payload);

    const { title, body, url, type, tokens } = payload;

    if (!title || !body || (!type && (!tokens || tokens.length === 0))) {
      console.warn("[notify-game] Payload incomplet");
      return new Response(
        JSON.stringify({ error: "Missing title/body/type or tokens" }),
        { status: 400, headers }
      );
    }

    // 🔎 Sécurité : whitelist des types autorisés
    const allowedTypes = [
      "notif_parties",
      "notif_chat",
      "notif_annonces",
      "notif_jeux",
      "notif_ping",
    ];

    if (type && !allowedTypes.includes(type)) {
      console.warn("[notify-game] Type non autorisé:", type);
      return new Response(
        JSON.stringify({ error: "Invalid notification type" }),
        { status: 400, headers }
      );
    }

    // --- Récupération des devices ---
    let devices = [];

    if (tokens && Array.isArray(tokens) && tokens.length > 0) {
      // ✅ Test sur device(s) spécifiques
      devices = tokens.map((t) => ({ token: t }));
      console.log(`[notify-game] Envoi ciblé sur ${tokens.length} token(s)`);
    } else if (type) {
      // ✅ Envoi sur tous les devices activés pour ce type
      const { data, error } = await supabase
        .from("push_tokens")
        .select("token")
        .eq(type, true);

      if (error) {
        console.error("[notify-game] Erreur Supabase:", error);
        return new Response(
          JSON.stringify({ error: "Erreur récupération push_tokens" }),
          { status: 500, headers }
        );
      }

      devices = data || [];
      console.log(`[notify-game] ${devices.length} device(s) à notifier pour ${type}`);
    }

    // --- Envoi des notifications ---
    let sent = 0;
    for (const device of devices) {
      try {
        const subscription = JSON.parse(device.token);

        console.log("[notify-game] ➜ Envoi vers:", subscription?.endpoint);

        await webpush.sendNotification(
          subscription,
          JSON.stringify({ title, body, url })
        );

        sent++;
      } catch (err) {
        console.error("[notify-game] ❌ Erreur webpush, token supprimé", err);

        // 🧹 Nettoyage automatique des tokens invalides
        if (device.token) {
          await supabase
            .from("push_tokens")
            .delete()
            .eq("token", device.token);
        }
      }
    }

    console.log(`[notify-game] ✅ Notifications envoyées: ${sent}`);

    return new Response(
      JSON.stringify({ success: true, notified: sent }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error("[notify-game] ❌ Erreur générale:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers }
    );
  }
});
