import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

const supabaseAdmin = createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "couvertures-jeux";

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
    // Récupération des anciens jeux non migrés
    const { data: jeux, error: fetchError } =
      await supabaseAdmin
        .from("jeux")
        .select("id, nom, couverture_url, couverture_bgg_url")
        .not("couverture_url", "is", null)
        .is("couverture_bgg_url", null);

    if (fetchError) {
      throw new Error(
        `Erreur récupération jeux : ${fetchError.message}`
      );
    }

    if (!jeux || jeux.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucun jeu à migrer.",
          total: 0,
          migrated: 0,
          errors: 0,
        }),
        { headers }
      );
    }

    const results = [];

    for (const jeu of jeux) {
      try {
        const ancienneUrl = jeu.couverture_url;

        console.log(
          `Migration du jeu ${jeu.id} - ${jeu.nom}`
        );

        console.log(
          `URL BGG : ${ancienneUrl}`
        );

        // Téléchargement de l'image BGG
        const imageRes = await fetch(ancienneUrl);

        if (!imageRes.ok) {
          throw new Error(
            `Téléchargement impossible (${imageRes.status})`
          );
        }

        const imageBlob = await imageRes.blob();

        if (!imageBlob.size) {
          throw new Error(
            "Image téléchargée vide"
          );
        }

        // Détermination du type MIME
        const contentType =
          imageRes.headers.get("content-type") ||
          imageBlob.type ||
          "image/jpeg";

        let extension = "jpg";

        if (contentType.includes("png")) {
          extension = "png";
        } else if (
          contentType.includes("webp")
        ) {
          extension = "webp";
        } else if (
          contentType.includes("gif")
        ) {
          extension = "gif";
        } else if (
          contentType.includes("jpeg") ||
          contentType.includes("jpg")
        ) {
          extension = "jpg";
        }

        const filePath =
          `${jeu.id}.${extension}`;

        // Upload dans Supabase Storage
        const { error: uploadError } =
          await supabaseAdmin.storage
            .from(BUCKET)
            .upload(
              filePath,
              imageBlob,
              {
                contentType,
                upsert: true,
              }
            );

        if (uploadError) {
          throw new Error(
            `Erreur upload : ${uploadError.message}`
          );
        }

        // Récupération de l'URL publique
        const { data: publicUrlData } =
          supabaseAdmin.storage
            .from(BUCKET)
            .getPublicUrl(filePath);

        const nouvelleUrl =
          publicUrlData.publicUrl;

        // Mise à jour de la table jeux
        const { error: updateError } =
          await supabaseAdmin
            .from("jeux")
            .update({
              couverture_url: nouvelleUrl,
              couverture_bgg_url: ancienneUrl,
            })
            .eq("id", jeu.id);

        if (updateError) {
          throw new Error(
            `Erreur mise à jour DB : ${updateError.message}`
          );
        }

        results.push({
          id: jeu.id,
          nom: jeu.nom,
          success: true,
          ancienneUrl,
          nouvelleUrl,
        });

        console.log(
          `✓ Migration réussie : ${jeu.nom}`
        );
      } catch (error) {
        console.error(
          `✗ Erreur pour ${jeu.nom}:`,
          error
        );

        results.push({
          id: jeu.id,
          nom: jeu.nom,
          success: false,
          error:
            error?.message ||
            "Erreur inconnue",
        });
      }
    }

    const migrated =
      results.filter(
        (r) => r.success
      ).length;

    const errors =
      results.filter(
        (r) => !r.success
      ).length;

    return new Response(
      JSON.stringify({
        success: true,
        total: jeux.length,
        migrated,
        errors,
        results,
      }),
      { headers }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error?.message ||
          "Erreur inconnue",
      }),
      {
        status: 500,
        headers,
      }
    );
  }
});