import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  Pencil,
  X,
  AlertCircle,
  Dices,
  Youtube,
  Users,
  Clock3,
  UserRound,
  Hash,
  Save,
} from "lucide-react";

export default function EditJeu({ jeu, onClose, onUpdate }) {
  const [form, setForm] = useState({
    nom: "",
    regle_youtube: "",
    min_joueurs: "",
    max_joueurs: "",
    type: "",
    duree: "",
    proprietaire: "",
    bgg_api: "",
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [profils, setProfils] = useState([]);
  const [extensionsBggIds, setExtensionsBggIds] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfils = async () => {
      const { data, error } = await supabase
        .from("profils")
        .select("id, nom");

      if (!error && data) {
        setProfils(data);
      }
    };

    fetchProfils();
  }, []);

  useEffect(() => {
    if (!jeu) return;

    setForm({
      nom: jeu.nom || "",
      regle_youtube: jeu.regle_youtube || "",
      min_joueurs: jeu.min_joueurs || "",
      max_joueurs: jeu.max_joueurs || "",
      type: jeu.type || "",
      duree: jeu.duree || "",
      proprietaire: jeu.proprietaire || "",
      bgg_api: jeu.bgg_api || "",
    });

    setExtensionsBggIds(
      (jeu.extensions || [])
        .map((extension) => extension.bgg_id)
        .join("\n")
    );
  }, [jeu]);

  if (!jeu) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ============================================================
  // RÉCUPÉRATION DES DONNÉES BGG
  // ============================================================

  const fetchBGGData = async (bggId) => {
    if (!bggId) {
      return {
        couverture_url: null,
        couverture_bgg_url: null,
        poids: null,
        note: null,
      };
    }

    try {
      const res = await fetch(
        "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/fetch-bgg-cover",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: bggId,
          }),
        }
      );

      const data = await res.json();

      console.log(data);

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        // URL Supabase Storage
        couverture_url:
          data.image || null,

        // URL originale BGG
        couverture_bgg_url:
          data.bggImage || null,

        poids:
          data.weight != null
            ? parseFloat(data.weight)
            : null,

        note:
          data.rating != null
            ? parseFloat(data.rating)
            : null,
      };
    } catch (err) {
      console.error(
        "Erreur fetchBGGData :",
        err
      );

      throw err;
    }
  };

  // ============================================================
  // SAUVEGARDE
  // ============================================================
  const parseExtensionsIds = (value) => {
    return [
      ...new Set(
        String(value || "")
          .split(/[\s,;]+/)
          .map((id) => id.trim())
          .filter((id) => /^\d+$/.test(id))
      ),
    ];
  };
  
  const saveEdit = async () => {
    setErrorMsg("");
    setSaving(true);

    try {
      let couverture_url = jeu.couverture_url || null;
      let couverture_bgg_url = jeu.couverture_bgg_url || null;
      let poids = jeu.poids ?? null;
      let note = jeu.note ?? null;

      const ancienBggId = jeu.bgg_api
        ? String(jeu.bgg_api)
        : "";

      const nouveauBggId = form.bgg_api
        ? String(form.bgg_api).trim()
        : "";

      // Mise à jour du jeu principal si son ID BGG a changé

      if (nouveauBggId !== ancienBggId) {
        if (!nouveauBggId) {
          couverture_url = null;
          couverture_bgg_url = null;
          poids = null;
          note = null;
        } else {
          const bggData = await fetchBGGData(nouveauBggId);

          couverture_url = bggData.couverture_url;
          couverture_bgg_url = bggData.couverture_bgg_url;
          poids = bggData.poids;
          note = bggData.note;
        }
      }

      // Mise à jour du jeu

      const { data, error } = await supabase
        .from("jeux")
        .update({
          nom: form.nom,
          regle_youtube: form.regle_youtube,
          min_joueurs: form.min_joueurs,
          max_joueurs: form.max_joueurs,
          type: form.type,
          duree: form.duree,
          proprietaire: form.proprietaire,
          bgg_api: nouveauBggId || null,
          couverture_url,
          couverture_bgg_url,
          poids,
          note,
        })
        .eq("id", jeu.id)
        .select("*");

      if (error) throw error;

      if (!data?.[0]) {
        throw new Error("Le jeu n'a pas pu être récupéré après sa mise à jour.");
      }

      // Synchronisation des extensions

      const nouveauxIds = parseExtensionsIds(extensionsBggIds);

      const { data: anciennesExtensions, error: fetchExtensionsError } =
        await supabase
          .from("extensions_jeux")
          .select("*")
          .eq("jeu_id", jeu.id);

      if (fetchExtensionsError) throw fetchExtensionsError;

      const anciennes = anciennesExtensions || [];

      const anciennesIds = anciennes.map((ext) =>
        String(ext.bgg_id)
      );

      // Extensions à supprimer

      const extensionsASupprimer = anciennes.filter(
        (ext) => !nouveauxIds.includes(String(ext.bgg_id))
      );

      if (extensionsASupprimer.length) {
        const idsASupprimer = extensionsASupprimer.map(
          (ext) => ext.id
        );

        const { error: deleteError } = await supabase
          .from("extensions_jeux")
          .delete()
          .in("id", idsASupprimer);

        if (deleteError) throw deleteError;
      }

      // Extensions à ajouter

      const extensionsAAjouter = nouveauxIds.filter(
        (id) => !anciennesIds.includes(id)
      );

      if (extensionsAAjouter.length) {
        const extensionsData = await Promise.all(
          extensionsAAjouter.map(async (id) => {
            const bggData = await fetchBGGData(id);

            return {
              jeu_id: jeu.id,
              bgg_id: id,
              nom: bggData.nom,
              couverture_url: bggData.couverture_url,
              couverture_bgg_url: bggData.couverture_bgg_url,
            };
          })
        );

        const { error: insertError } = await supabase
          .from("extensions_jeux")
          .insert(extensionsData);

        if (insertError) throw insertError;
      }

      // Récupération de la liste finale

      const { data: extensionsFinales, error: finalError } =
        await supabase
          .from("extensions_jeux")
          .select("*")
          .eq("jeu_id", jeu.id);

      if (finalError) throw finalError;

      // Mise à jour instantanée du catalogue

      onUpdate({
        ...data[0],
        extensions: extensionsFinales || [],
      });

      onClose();

    } catch (err) {
      console.error("Erreur sauvegarde jeu :", err);

      setErrorMsg(
        err?.message ||
          "Impossible d'enregistrer le jeu et ses extensions."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative z-[101] bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >

        {/* ======================================================
            HEADER MODAL
            ====================================================== */}

        <div className="relative bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-950 px-6 py-6 text-white overflow-hidden">

          {/* Décor */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">

            <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-indigo-500/20 blur-2xl" />

            <div className="absolute -bottom-28 -left-20 w-56 h-56 rounded-full bg-purple-500/20 blur-2xl" />

            <Dices
              size={180}
              className="absolute -right-8 -bottom-16 text-white opacity-[0.035] rotate-12"
            />

          </div>

          {/* Fermeture */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition z-10"
            aria-label="Fermer"
          >
            <X size={19} />
          </button>

          <div className="relative flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Pencil size={23} />
            </div>

            <div>
              <p className="text-indigo-200 text-xs uppercase tracking-widest font-bold">
                La Loi des Cartes
              </p>

              <h2 className="text-2xl font-black">
                Modifier le jeu
              </h2>
            </div>

          </div>

        </div>

        {/* ======================================================
            CONTENU
            ====================================================== */}

        <div className="p-6 max-h-[75vh] overflow-y-auto">

          {/* Erreur */}
          {errorMsg && (
            <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700">

              <AlertCircle
                size={20}
                className="flex-shrink-0 mt-0.5"
              />

              <p className="text-sm font-medium">
                {errorMsg}
              </p>

            </div>
          )}

          {/* ==================================================
              NOM
              ================================================== */}

          <div>

            <label className="block mb-1.5 text-sm font-bold text-gray-700">
              Nom du jeu
            </label>

            <input
              type="text"
              placeholder="Nom du jeu"
              value={form.nom || ""}
              onChange={(e) =>
                handleChange(
                  "nom",
                  e.target.value
                )
              }
              className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

          </div>

          {/* ==================================================
              TYPE + DURÉE
              ================================================== */}

          <div className="grid grid-cols-2 gap-3 mt-4">

            <div>

              <label className="block mb-1.5 text-sm font-bold text-gray-700">
                Type de jeu
              </label>

              <div className="relative">

                <Dices
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500"
                />

                <input
                  type="text"
                  placeholder="Ex. Expert"
                  value={form.type || ""}
                  onChange={(e) =>
                    handleChange(
                      "type",
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

              </div>

            </div>

            <div>

              <label className="block mb-1.5 text-sm font-bold text-gray-700">
                Durée
              </label>

              <div className="relative">

                <Clock3
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500"
                />

                <input
                  type="text"
                  placeholder="Ex. 60 min"
                  value={form.duree || ""}
                  onChange={(e) =>
                    handleChange(
                      "duree",
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

              </div>

            </div>

          </div>

          {/* ==================================================
              JOUEURS
              ================================================== */}

          <div className="mt-4">

            <label className="block mb-1.5 text-sm font-bold text-gray-700">
              Nombre de joueurs
            </label>

            <div className="grid grid-cols-2 gap-3">

              <div className="relative">

                <Users
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500"
                />

                <input
                  type="number"
                  placeholder="Minimum"
                  value={form.min_joueurs || ""}
                  onChange={(e) =>
                    handleChange(
                      "min_joueurs",
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

              </div>

              <div className="relative">

                <Users
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500"
                />

                <input
                  type="number"
                  placeholder="Maximum"
                  value={form.max_joueurs || ""}
                  onChange={(e) =>
                    handleChange(
                      "max_joueurs",
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

              </div>

            </div>

          </div>

          {/* ==================================================
              RÈGLES YOUTUBE
              ================================================== */}

          <div className="mt-4">

            <label className="block mb-1.5 text-sm font-bold text-gray-700">
              Lien règles YouTube
            </label>

            <div className="relative">

              <Youtube
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500"
              />

              <input
                type="text"
                placeholder="https://youtube.com/..."
                value={form.regle_youtube || ""}
                onChange={(e) =>
                  handleChange(
                    "regle_youtube",
                    e.target.value
                  )
                }
                className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

            </div>

          </div>

          {/* ==================================================
              PROPRIÉTAIRE
              ================================================== */}

          <div className="mt-4">

            <label className="block mb-1.5 text-sm font-bold text-gray-700">
              Propriétaire
            </label>

            <div className="relative">

              <UserRound
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none"
              />

              <select
                value={form.proprietaire || ""}
                onChange={(e) =>
                  handleChange(
                    "proprietaire",
                    e.target.value
                  )
                }
                className="w-full appearance-none border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" disabled>
                  Sélectionner un propriétaire
                </option>

                {profils.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.nom}
                  </option>
                ))}

              </select>

            </div>

          </div>

          {/* ==================================================
              BGG
              ================================================== */}

          <div className="mt-4">

            <label className="block mb-1.5 text-sm font-bold text-gray-700">
              ID BGG
            </label>

            <div className="relative">

              <Hash
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500"
              />

              <input
                type="text"
                placeholder="Numéro dans l'URL du jeu"
                value={form.bgg_api || ""}
                onChange={(e) =>
                  handleChange(
                    "bgg_api",
                    e.target.value
                  )
                }
                className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

            </div>

            <p className="mt-2 text-xs text-gray-500">
              L'ID BGG permet de récupérer automatiquement la
              couverture, le poids et la note du jeu.
            </p>

          </div>

        </div>

        {/* ==================================================
            EXTENSIONS BGG
            ================================================== */}

        <div className="mt-5">

          <label className="block mb-1.5 text-sm font-bold text-gray-700">
            Extensions du jeu
          </label>

          <div className="relative">

            <Hash
              size={18}
              className="absolute left-3 top-4 text-indigo-500"
            />

            <textarea
              value={extensionsBggIds}
              onChange={(e) => setExtensionsBggIds(e.target.value)}
              rows={4}
              placeholder={"Identifiants BGG des extensions\nUn identifiant par ligne"}
              className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

          </div>

          <p className="mt-2 text-xs text-gray-500">
            Les extensions déjà enregistrées sont préremplies.
            Ajoute ou retire simplement les identifiants BGG souhaités.
          </p>

          <p className="mt-1 text-xs text-indigo-600 font-semibold">
            {parseExtensionsIds(extensionsBggIds).length} extension(s) sélectionnée(s)
          </p>

        </div>

        {/* ======================================================
            PIED DE MODALE
            ====================================================== */}

        <div className="flex gap-3 border-t border-gray-100 bg-gray-50/80 px-6 py-4">

          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 transition"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <X size={17} />
              Annuler
            </span>
          </button>

          <button
            type="button"
            onClick={saveEdit}
            disabled={saving}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Save size={17} />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </span>
          </button>

        </div>

      </div>
    </div>
  );
}