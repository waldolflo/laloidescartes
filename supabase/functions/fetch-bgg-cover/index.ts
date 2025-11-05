import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Fonction de parsing XML simple (regex)
function extractTagValue(xml: string, tag: string, parentTag?: string): string | null {
  const pattern = parentTag
    ? new RegExp(`<${parentTag}[^>]*>[\\s\\S]*?<${tag}[^>]*value=["'](.*?)["'][\\s\\S]*?</${parentTag}>`, "i")
    : new RegExp(`<${tag}[^>]*value=["'](.*?)["']`, "i");
  const match = xml.match(pattern);
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

    const res = await fetch(`https://api.geekdo.com/xmlapi2/thing?id=${id}&stats=1`, {
      headers: BGG_API_TOKEN
        ? { Authorization: `Bearer ${BGG_API_TOKEN}` }
        : {},
    });

    if (!res.ok) throw new Error(`Erreur API BGG (${res.status})`);
    const xmlText = await res.text();

    // Extraction des images
    const thumbnail = extractTagValue(xmlText, "thumbnail");
    const image = extractTagValue(xmlText, "image");

    // Extraction des stats dans <ratings>
    const rating = parseFloat(extractTagValue(xmlText, "average", "ratings") || "0");
    const weight = parseFloat(extractTagValue(xmlText, "averageweight", "ratings") || "0");

    if (!thumbnail || !image) {
      throw new Error("Impossible de trouver les images dans le XML");
    }

    return new Response(JSON.stringify({ xmlText, thumbnail, image, rating, weight }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers });
  }
});