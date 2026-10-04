import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// PARSING XML
// ============================================================

function extractTagValue(
  xml: string,
  tag: string,
  parentTag?: string
): string | null {
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
    pattern = new RegExp(
      `<${tag}[^>]*value=["'](.*?)["']`,
      "i"
    );

    match = xml.match(pattern);

    if (!match) {
      pattern = new RegExp(
        `<${tag}[^>]*>(.*?)</${tag}>`,
        "i"
      );

      match = xml.match(pattern);
    }
  }

  return match ? match[1].trim() : null;
}

// ============================================================
// SERVEUR
// ============================================================

serve(async (req) => {

  // ==========================================================
  // CORS
  // ==========================================================

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization",
      },
    });
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {

    // ========================================================
    // PARAMÈTRES
    // ========================================================

    const body = await req.json();
    const id = body.id;

    if (!id) {
      throw new Error("ID BGG manquant");
    }

    // ========================================================
    // VARIABLES SUPABASE
    // ========================================================

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Variables Supabase manquantes"
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ========================================================
    // TOKEN BGG
    // ========================================================

    const BGG_API_TOKEN =
      Deno.env.get("BGG_API_TOKEN");

    // ========================================================
    // RÉCUPÉRATION BGG
    // ========================================================

    const res = await fetch(
      `https://api.geekdo.com/xmlapi2/thing?id=${id}&stats=1`,
      {
        headers: BGG_API_TOKEN
          ? {
              Authorization:
                `Bearer ${BGG_API_TOKEN}`,
            }
          : {},
      }
    );

    if (!res.ok) {
      throw new Error(
        `Erreur API BGG (${res.status})`
      );
    }

    const xmlText = await res.text();

    // ========================================================
    // IMAGES BGG
    // ========================================================

    const thumbnail =
      extractTagValue(
        xmlText,
        "thumbnail"
      );

    const image =
      extractTagValue(
        xmlText,
        "image"
      );

    // ========================================================
    // STATS BGG
    // ========================================================

    const averageStr =
      extractTagValue(
        xmlText,
        "average",
        "ratings"
      ) || "0";

    const weightStr =
      extractTagValue(
        xmlText,
        "averageweight",
        "ratings"
      ) || "0";

    const rating =
      parseFloat(averageStr);

    const weight =
      parseFloat(weightStr);

    if (!thumbnail || !image) {
      throw new Error(
        "Impossible de trouver les images dans le XML"
      );
    }

    // ========================================================
    // TÉLÉCHARGEMENT DE L'IMAGE BGG
    // ========================================================

    console.log(
      `Téléchargement couverture BGG ${id} :`,
      image
    );

    const imageResponse =
      await fetch(image);

    if (!imageResponse.ok) {
      throw new Error(
        `Impossible de télécharger l'image BGG (${imageResponse.status})`
      );
    }

    const imageBlob =
      await imageResponse.blob();

    // ========================================================
    // TYPE MIME
    // ========================================================

    const contentType =
      imageResponse.headers.get(
        "content-type"
      ) || "image/jpeg";

    // ========================================================
    // EXTENSION
    // ========================================================

    let extension = "jpg";

    if (
      contentType.includes("png")
    ) {
      extension = "png";
    } else if (
      contentType.includes("webp")
    ) {
      extension = "webp";
    } else if (
      contentType.includes("gif")
    ) {
      extension = "gif";
    }

    // ========================================================
    // NOM DU FICHIER
    // ========================================================

    const filePath =
      `${id}.${extension}`;

    console.log(
      "Upload Storage :",
      filePath
    );

    // ========================================================
    // UPLOAD SUPABASE STORAGE
    // ========================================================

    const {
      error: uploadError,
    } = await supabaseAdmin.storage
      .from("couvertures-jeux")
      .upload(
        filePath,
        imageBlob,
        {
          contentType,
          upsert: true,
        }
      );

    if (uploadError) {
      console.error(
        "Erreur upload Storage :",
        uploadError
      );

      throw new Error(
        `Erreur Storage : ${uploadError.message}`
      );
    }

    // ========================================================
    // URL PUBLIQUE SUPABASE
    // ========================================================

    const {
      data: publicUrlData,
    } =
      supabaseAdmin.storage
        .from("couvertures-jeux")
        .getPublicUrl(filePath);

    const couvertureUrl =
      publicUrlData.publicUrl;

    console.log(
      "URL Supabase :",
      couvertureUrl
    );

    // ========================================================
    // RÉPONSE
    // ========================================================

    return new Response(
      JSON.stringify({
        thumbnail,

        // Nouvelle URL utilisée par l'application
        image: couvertureUrl,

        // URL originale BGG conservée
        bggImage: image,

        rating,
        weight,
      }),
      {
        headers,
        status: 200,
      }
    );

  } catch (err) {

    console.error(
      "Erreur fetch-bgg-cover :",
      err
    );

    return new Response(
      JSON.stringify({
        error:
          err instanceof Error
            ? err.message
            : String(err),
      }),
      {
        headers,
        status: 500,
      }
    );
  }
});