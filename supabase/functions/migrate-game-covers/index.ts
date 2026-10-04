import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "couvertures-jeux";

serve(async (req) => {
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
    // ==========================================================
    // SUPABASE ADMIN
    // ==========================================================

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

    // ==========================================================
    // RÉCUPÉRATION DES JEUX
    // ==========================================================

    const { data: jeux, error: jeuxError } =
      await supabaseAdmin
        .from("jeux")
        .select(
          "id, nom, bgg_api, couverture_url, couverture_bgg_url"
        )
        .not("bgg_api", "is", null)
        .not("couverture_url", "is", null);

    if (jeuxError) {
      throw new Error(
        `Erreur récupération jeux : ${jeuxError.message}`
      );
    }

    if (!jeux || jeux.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucun jeu à traiter.",
          total: 0,
          fixed: 0,
          skipped: 0,
          errors: 0,
        }),
        { headers }
      );
    }

    // ==========================================================
    // LISTE DES FICHIERS STORAGE
    // ==========================================================

    const { data: files, error: filesError } =
      await supabaseAdmin.storage
        .from(BUCKET)
        .list("", {
          limit: 1000,
        });

    if (filesError) {
      throw new Error(
        `Erreur lecture Storage : ${filesError.message}`
      );
    }

    const storageFiles =
      files || [];

    const results = [];

    // ==========================================================
    // TRAITEMENT
    // ==========================================================

    for (const jeu of jeux) {
      try {
        const bggId =
          String(jeu.bgg_api).trim();

        const uuid =
          String(jeu.id).trim();

        if (!bggId || !uuid) {
          results.push({
            id: jeu.id,
            nom: jeu.nom,
            status: "skipped",
            reason: "ID manquant",
          });

          continue;
        }

        // ------------------------------------------------------
        // Détermination de l'extension actuelle
        // ------------------------------------------------------

        const currentFile =
          storageFiles.find((file) => {
            return (
              file.name.startsWith(`${uuid}.`)
            );
          });

        // ------------------------------------------------------
        // Vérifie si le fichier BGG existe déjà
        // ------------------------------------------------------

        const existingBggFile =
          storageFiles.find((file) => {
            return (
              file.name.startsWith(`${bggId}.`)
            );
          });

        // Si le bon fichier existe déjà,
        // on ne touche à rien.
        if (existingBggFile) {
          const extension =
            existingBggFile.name
              .split(".")
              .pop();

          const correctPath =
            `${bggId}.${extension}`;

          const {
            data: publicUrlData,
          } = supabaseAdmin.storage
            .from(BUCKET)
            .getPublicUrl(correctPath);

          const correctUrl =
            publicUrlData.publicUrl;

          // On corrige seulement l'URL
          if (
            jeu.couverture_url !==
            correctUrl
          ) {
            await supabaseAdmin
              .from("jeux")
              .update({
                couverture_url:
                  correctUrl,
              })
              .eq("id", jeu.id);
          }

          results.push({
            id: jeu.id,
            nom: jeu.nom,
            bggId,
            status: "already-correct",
            file: correctPath,
          });

          continue;
        }

        // ------------------------------------------------------
        // Aucun fichier UUID trouvé
        // ------------------------------------------------------

        if (!currentFile) {
          results.push({
            id: jeu.id,
            nom: jeu.nom,
            bggId,
            status: "skipped",
            reason:
              "Fichier UUID introuvable",
          });

          continue;
        }

        // ------------------------------------------------------
        // Extension
        // ------------------------------------------------------

        const extension =
          currentFile.name
            .split(".")
            .pop() || "jpg";

        const oldPath =
          currentFile.name;

        const newPath =
          `${bggId}.${extension}`;

        console.log(
          `Renommage : ${oldPath} → ${newPath}`
        );

        // ------------------------------------------------------
        // Copie vers le nouveau nom
        // ------------------------------------------------------

        const { error: copyError } =
          await supabaseAdmin.storage
            .from(BUCKET)
            .copy(
              oldPath,
              newPath
            );

        if (copyError) {
          throw new Error(
            `Erreur copie : ${copyError.message}`
          );
        }

        // ------------------------------------------------------
        // Vérification que le nouveau fichier existe
        // ------------------------------------------------------

        const { data: verification } =
          await supabaseAdmin.storage
            .from(BUCKET)
            .list("", {
              search: newPath,
            });

        const copiedFile =
          verification?.some(
            (file) =>
              file.name === newPath
          );

        if (!copiedFile) {
          throw new Error(
            "Le nouveau fichier n'a pas pu être vérifié"
          );
        }

        // ------------------------------------------------------
        // URL publique
        // ------------------------------------------------------

        const {
          data: publicUrlData,
        } = supabaseAdmin.storage
          .from(BUCKET)
          .getPublicUrl(newPath);

        const newUrl =
          publicUrlData.publicUrl;

        // ------------------------------------------------------
        // Mise à jour DB
        // ------------------------------------------------------

        const { error: updateError } =
          await supabaseAdmin
            .from("jeux")
            .update({
              couverture_url:
                newUrl,
            })
            .eq("id", jeu.id);

        if (updateError) {
          // Si la DB échoue, on supprime
          // la copie afin d'éviter un fichier
          // inutile.
          await supabaseAdmin.storage
            .from(BUCKET)
            .remove([newPath]);

          throw new Error(
            `Erreur mise à jour DB : ${updateError.message}`
          );
        }

        // ------------------------------------------------------
        // Suppression de l'ancien fichier UUID
        // ------------------------------------------------------

        const { error: deleteError } =
          await supabaseAdmin.storage
            .from(BUCKET)
            .remove([oldPath]);

        if (deleteError) {
          console.warn(
            `Ancien fichier non supprimé : ${oldPath}`,
            deleteError
          );
        }

        results.push({
          id: jeu.id,
          nom: jeu.nom,
          bggId,
          status: "fixed",
          oldFile: oldPath,
          newFile: newPath,
          newUrl,
        });

        console.log(
          `✓ ${jeu.nom} → ${newPath}`
        );

      } catch (error) {
        console.error(
          `✗ Erreur ${jeu.nom}`,
          error
        );

        results.push({
          id: jeu.id,
          nom: jeu.nom,
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    // ==========================================================
    // STATISTIQUES
    // ==========================================================

    const fixed =
      results.filter(
        (r) => r.status === "fixed"
      ).length;

    const alreadyCorrect =
      results.filter(
        (r) =>
          r.status ===
          "already-correct"
      ).length;

    const skipped =
      results.filter(
        (r) =>
          r.status === "skipped"
      ).length;

    const errors =
      results.filter(
        (r) =>
          r.status === "error"
      ).length;

    return new Response(
      JSON.stringify({
        success: true,
        total: jeux.length,
        fixed,
        alreadyCorrect,
        skipped,
        errors,
        results,
      }),
      { headers }
    );

  } catch (error) {
    console.error(
      "Erreur fix-game-cover-names :",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,
        headers,
      }
    );
  }
});