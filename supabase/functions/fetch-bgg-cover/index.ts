import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Fonction de parsing XML simple (regex)
function extractTagValue(xml: string, tag: string, parentTag?: string): string | null {
  let pattern: RegExp;
  if (parentTag) {
    // Cherche la balise dans le parent
    pattern = new RegExp(`<${parentTag}[^>]*>[\\s\\S]*?<${tag}[^>]*>(.*?)</${tag}>[\\s\\S]*?</${parentTag}>`, "i");
  } else {
    pattern = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "i");
  }
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
    const averageStr = extractTagValue(xmlText, "average", "ratings") || "0";
    const weightStr = extractTagValue(xmlText, "averageweight", "ratings") || "0";

    const rating = isNaN(parseFloat(averageStr)) ? 0 : parseFloat(averageStr);
    const weight = isNaN(parseFloat(weightStr)) ? 0 : parseFloat(weightStr);

    if (!thumbnail || !image) {
      throw new Error("Impossible de trouver les images dans le XML");
    }

    return new Response(JSON.stringify({ xmlText, thumbnail, image, rating, weight }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers });
  }
});