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
    if (jeu) setForm(jeu);
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
        couverture_url:
          data.image || data.thumbnail || null,

        poids: data.weight
          ? parseFloat(data.weight)
          : null,

        note: data.rating
          ? parseFloat(data.rating)
          : null,
      };
    } catch (err) {
      console.error("Erreur fetchBGGData :", err);

      return {
        couverture_url: null,
        poids: null,
        note: null,
      };
    }
  };

  // ============================================================
  // SAUVEGARDE
  // ============================================================

  const saveEdit = async () => {
    setErrorMsg("");

    try {
      let couverture_url = jeu.couverture_url;
      let poids = jeu.poids;
      let note = jeu.note;

      // Si bgg_api a changé, récupérer nouvelle couverture
      if (
        form.bgg_api &&
        form.bgg_api !== jeu.bgg_api
      ) {
        const bggData = await fetchBGGData(
          form.bgg_api
        );

        couverture_url =
          bggData.couverture_url;
      }

      // Récupérer nouvelle couverture dans tous les cas pour mise à jour
      if (form.bgg_api) {
        const bggData = await fetchBGGData(
          form.bgg_api
        );

        poids = bggData.poids;
        note = bggData.note;
      }

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
          bgg_api: form.bgg_api,
          couverture_url,
          poids,
          note,
        })
        .eq("id", jeu.id)
        .select("*");

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // Mise à jour instantanée
      onUpdate(data[0]);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
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
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Save size={17} />
              Enregistrer
            </span>
          </button>

        </div>

      </div>
    </div>
  );
}