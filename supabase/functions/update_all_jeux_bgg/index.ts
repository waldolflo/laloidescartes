import { serve } from "std/http/server.ts";

// === CONFIGURATION SUPABASE ===
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Variables d'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes.");
}

const headersSupabase = {
  "apikey": SUPABASE_SERVICE_ROLE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

// === UTILITAIRES ===

// Récupère tous les jeux
async function fetchAllJeux() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jeux?select=id,nom,id_bgg`, { headers: headersSupabase });
  const data = await res.json();

  if (!Array.isArray(data)) {
  console.error("fetchAllJeux() n'a pas renvoyé un tableau :", data);
  return [];
  }
  return data;
}

// Fonction de parsing XML (comme fetch-bgg-cover)
function extractTagValue(xml: string, tag: string, parentTag?: string): string | null {
  let pattern: RegExp;
  let match: RegExpMatchArray | null = null;

  if (parentTag) {
  pattern = new RegExp(
  `<${parentTag}[^>]*>[\\s\\S]*?<${tag}[^>]*value=["'](.*?)["'][^>]*>[\\s\\S]*?</${parentTag}>`,
  "i"
  );
  match = xml.match(pattern);


  if (!match) {
    pattern = new RegExp(
      `<${parentTag}[^>]*>[\\s\\S]*?<${tag}[^>]*>(.*?)</${tag}>[\\s\\S]*?</${parentTag}>`,
      "i"
    );
    match = xml.match(pattern);
  }

  } else {
  pattern = new RegExp(`<${tag}[^>]*value=["'](.*?)["']`, "i");
  match = xml.match(pattern);


  if (!match) {
    pattern = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "i");
    match = xml.match(pattern);
  }

  }

  return match ? match[1].trim() : null;
}

// Récupère note et poids depuis BGG
async function fetchBGGData(bggId: string | number) {
const BGG_API_TOKEN = Deno.env.get("BGG_API_TOKEN");
const res = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`, {
  headers: BGG_API_TOKEN ? { Authorization: `Bearer ${BGG_API_TOKEN}` } : {},
});
if (!res.ok) throw new Error(`Erreur BGG ${res.status}`);
const xml = await res.text();

const averageStr = extractTagValue(xml, "average", "ratings") || "0";
const weightStr = extractTagValue(xml, "averageweight", "ratings") || "0";

const rating = parseFloat(averageStr);
const weight = parseFloat(weightStr);

return { rating, weight };
}

// Met à jour un jeu
async function updateJeu(id: string | number, rating: number, weight: number) {
  const body = JSON.stringify({ note_bgg: rating, poids_bgg: weight });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jeux?id=eq.${id}`, {
    method: "PATCH",
    headers: headersSupabase,
    body,
  });

  if (!res.ok) throw new Error(`Erreur update jeu ${id}: ${res.status}`);
}

// === SERVEUR ===
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

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

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

    // Délai pour ne pas surcharger BGG
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