import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Fonction de parsing XML simple (regex)
function extractTagValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "i"));
  return match ? match[1] : null;
}

serve(async (req) => {
  // Gestion du CORS
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

    // Extraction manuelle
    const thumbnail = extractTagValue(xmlText, "thumbnail");
    const image = extractTagValue(xmlText, "image");

    return new Response(JSON.stringify({ thumbnail, image }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers });
  }
});
