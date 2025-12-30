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
    console.log("[notify-game] Preflight OPTIONS reçu");
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== "POST") {
    console.warn("[notify-game] Méthode refusée:", req.method);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  try {
    console.log("[notify-game] Requête POST reçue");

    const payload = await req.json();
    console.log("[notify-game] Payload reçu:", payload);

    const { title, body, url } = payload;

    if (!title || !body) {
      console.warn("[notify-game] Payload incomplet");
      return new Response(
        JSON.stringify({ error: "Missing title or body" }),
        { status: 400, headers }
      );
    }

    // --- Récupération des tokens ---
    console.log("[notify-game] Récupération des profils notif_parties = 1");

    const { data, error } = await supabase
      .from("profils")
      .select("id, push_tokens:push_tokens(token)")
      .eq("notif_parties", 1);

    if (error) {
      console.error("[notify-game] Erreur Supabase:", error);
      return new Response(
        JSON.stringify({ error: "Erreur récupération tokens" }),
        { status: 500, headers }
      );
    }

    console.log("[notify-game] Utilisateurs récupérés:", data?.length);
    console.log("[notify-game] Données brutes:", data);

    let sent = 0;

    // --- Envoi des notifications ---
    for (const user of data || []) {
      console.log("[notify-game] User traité:", user.id);
      console.log("[notify-game] push_tokens brut:", user.push_tokens);

      // ⚠️ push_tokens peut être un objet ou un tableau
      const pushTokens = Array.isArray(user.push_tokens)
        ? user.push_tokens
        : user.push_tokens
        ? [user.push_tokens]
        : [];

      console.log(
        `[notify-game] ${pushTokens.length} token(s) pour user ${user.id}`
      );

      for (const t of pushTokens) {
        console.log("[notify-game] Token DB:", t);

        try {
          const subscription = JSON.parse(t.token);
          console.log(
            "[notify-game] Subscription endpoint:",
            subscription?.endpoint
          );

          await webpush.sendNotification(
            subscription,
            JSON.stringify({ title, body, url })
          );

          sent++;
          console.log("[notify-game] ✅ Notification envoyée");
        } catch (err) {
          console.error(
            `[notify-game] ❌ Erreur webpush user ${user.id}:`,
            err
          );
        }
      }
    }

    console.log(`[notify-game] Notifications envoyées avec succès: ${sent}`);
    console.log("[notify-game] VAPID PUBLIC:", Deno.env.get("VAPID_PUBLIC_KEY"));

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
