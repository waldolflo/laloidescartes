import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// === CONFIGURATION SUPABASE ===
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Variables d'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes.");
}

const headers = {
  "apikey": SUPABASE_SERVICE_ROLE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

// === OUTILS ===

// Récupère tous les jeux
async function fetchAllJeux() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jeux?select=id,nom,id_bgg`, { headers });
  return await res.json();
}

// Extrait la valeur des attributs `value="..."` dans le XML
function extractValueAttr(xml: string, tag: string): number | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*value="([0-9.]+)"`, "i"));
  return match ? parseFloat(match[1]) : null;
}

// Appelle l’API BGG et renvoie { rating, weight }
async function fetchBGGData(bggId: string | number) {
  const res = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`);
  if (!res.ok) throw new Error(`Erreur BGG ${res.status}`);
  const xml = await res.text();

  const rating = extractValueAttr(xml, "average") ?? 0;
  const weight = extractValueAttr(xml, "averageweight") ?? 0;

  return { rating, weight };
}

// Met à jour la table jeux
async function updateJeu(id: string | number, rating: number, weight: number) {
  const body = JSON.stringify({ note_bgg: rating, poids_bgg: weight });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jeux?id=eq.${id}`, {
    method: "PATCH",
    headers,
    body,
  });

  if (!res.ok) throw new Error(`Erreur update jeu ${id}: ${res.status}`);
}

// === SERVER ===
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

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const jeux = await fetchAllJeux();
    const updated = [];

    for (const jeu of jeux) {
      if (!jeu.id_bgg) continue;
      console.log(`🧩 ${jeu.nom} (${jeu.id_bgg})`);

      try {
        const { rating, weight } = await fetchBGGData(jeu.id_bgg);
        console.log(`→ Note: ${rating}, Poids: ${weight}`);

        await updateJeu(jeu.id, rating, weight);
        updated.push({ nom: jeu.nom, rating, weight });

        // Petit délai pour ne pas surcharger l’API BGG
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(`❌ Erreur pour ${jeu.nom}:`, err.message);
      }
    }

    return new Response(JSON.stringify({
      message: "✅ Mise à jour terminée",
      jeux_modifies: updated.length,
      details: updated,
    }), { headers: corsHeaders });

  } catch (err) {
    console.error("Erreur globale:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
