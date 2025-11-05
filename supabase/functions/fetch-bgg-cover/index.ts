import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const body = await req.json();
    const id = body.id;
    if (!id) throw new Error("ID BGG manquant");

    // ✅ Ton token sécurisé (stocké dans les variables d'environnement Supabase)
    const token = Deno.env.get("BGG_API_TOKEN");
    if (!token) throw new Error("Token API BGG manquant dans les variables d'environnement");

    // 🔒 Appel sécurisé à l’API BGG
    const res = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Erreur API BGG (${res.status})`);
    }

    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const thumbnail = xml.querySelector("thumbnail")?.textContent;
    const image = xml.querySelector("image")?.textContent;

    return new Response(JSON.stringify({ thumbnail, image }), { headers });
  } catch (err) {
    console.error("Erreur :", err);
    return new Response(JSON.stringify({ error: err.message }), { headers });
  }
});
