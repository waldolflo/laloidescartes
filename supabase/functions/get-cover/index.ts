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
    const nomJeu = body.nom;
    if (!nomJeu) throw new Error("Nom du jeu requis");

    const query = encodeURIComponent(nomJeu);
    const urlBGG = `https://boardgamegeek.com/geeksearch.php?action=search&q=${query}&objecttype=boardgame`;

    const res = await fetch(urlBGG);
    const html = await res.text();

    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) throw new Error("Impossible de parser le HTML");

    // Sélecteur CSS équivalent au XPath
    const imgNode = doc.querySelector("table tbody tr:nth-child(2) td:nth-child(2) a img");
    const coverUrl = imgNode ? imgNode.getAttribute("src") : null;

    return new Response(JSON.stringify({ coverUrl }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers });
  }
});
