import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { parse } from "https://deno.land/x/xml_parser@v0.2.0/mod.ts";

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

    // ✅ Parsing XML
    const xml = parse(xmlText);
    const item = xml?.children?.find((c) => c.name === "item");
    if (!item) throw new Error("Format XML inattendu");

    const thumbnailNode = item.children?.find((c) => c.name === "thumbnail");
    const imageNode = item.children?.find((c) => c.name === "image");

    const thumbnail = thumbnailNode?.content || null;
    const image = imageNode?.content || null;

    return new Response(JSON.stringify({ thumbnail, image }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers });
  }
});
