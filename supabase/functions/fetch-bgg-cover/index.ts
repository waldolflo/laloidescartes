import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

serve(async (req) => {
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

    // 🧩 Utilise le token BGG depuis les variables d'environnement
    const BGG_API_TOKEN = Deno.env.get("BGG_API_TOKEN");
    if (!BGG_API_TOKEN) throw new Error("Token BGG manquant dans les variables d'environnement");

    // 🧩 Appel API BGG avec le token
    const res = await fetch(`https://api.geekdo.com/xmlapi2/thing?id=${id}`, {
      headers: {
        Authorization: `Bearer ${BGG_API_TOKEN}`,
      },
    });

    if (!res.ok) throw new Error(`Erreur API BGG (${res.status})`);
    const xmlText = await res.text();

    // 🧩 Parsing XML grâce à deno-dom
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (!doc) throw new Error("Impossible de parser le XML");

    const thumbnail = doc.querySelector("thumbnail")?.textContent;
    const image = doc.querySelector("image")?.textContent;

    return new Response(JSON.stringify({ thumbnail, image }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers });
  }
});
