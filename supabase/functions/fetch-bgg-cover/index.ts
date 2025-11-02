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
    const { id } = await req.json();
    if (!id) throw new Error("ID BGG manquant");

    // 👇 Ajout du User-Agent pour éviter le 401
    const res = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${id}`, {
      headers: {
        "User-Agent": "SupabaseEdgeFunction/1.0 (+https://votre-site.com)",
        "Accept": "application/xml, text/xml, */*;q=0.1"
      },
    });

    if (!res.ok) throw new Error(`Erreur API BGG (${res.status})`);

    const xmlText = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const thumbnail = xml.querySelector("thumbnail")?.textContent || null;

    return new Response(JSON.stringify({ thumbnail }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers });
  }
});
