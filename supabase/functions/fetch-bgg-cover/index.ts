import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { XMLParser } from "https://deno.land/x/fast_xml_parser@4.3.6/mod.ts";

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

    const BGG_API_TOKEN = Deno.env.get("BGG_API_TOKEN");
    if (!BGG_API_TOKEN) throw new Error("Token BGG manquant dans les variables d'environnement");

    const res = await fetch(`https://api.geekdo.com/xmlapi2/thing?id=${id}`, {
      headers: {
        Authorization: `Bearer ${BGG_API_TOKEN}`,
      },
    });

    if (!res.ok) throw new Error(`Erreur API BGG (${res.status})`);
    const xmlText = await res.text();

    // 🔍 Parser XML avec fast-xml-parser
    const parser = new XMLParser();
    const result = parser.parse(xmlText);

    // Structure de réponse BGG : result.items.item.thumbnail / image
    const item = result.items?.item;
    if (!item) throw new Error("Format XML inattendu");

    const thumbnail = item.thumbnail || null;
    const image = item.image || null;

    return new Response(JSON.stringify({ thumbnail, image }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers });
  }
});
