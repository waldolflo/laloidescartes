import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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
    const { id } = await req.json();
    if (!id) throw new Error("ID BGG requis");

    // 🔗 Appel de l’API officielle BGG
    const res = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${id}`);
    if (!res.ok) throw new Error(`Erreur API BGG (${res.status})`);

    const xml = await res.text();

    // 🔍 Extraction simple de la balise <image>
    const match = xml.match(/<image>(.*?)<\/image>/);
    const imageUrl = match ? match[1] : null;

    if (!imageUrl) throw new Error("Aucune image trouvée sur BGG");

    return new Response(JSON.stringify({ imageUrl }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers });
  }
});
