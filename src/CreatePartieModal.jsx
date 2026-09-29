// CreatePartieModal.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function CreatePartieModal({ user, jeu, onClose, onCreated }) {
  const [newPartie, setNewPartie] = useState({
    jeu_id: jeu?.id || "",
    date_partie: "",
    heure_partie: "",
    utilisateur_id: user.id,
    description: "",
    lieu: "La loi des cartes",
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [jeux, setJeux] = useState([]);

  useEffect(() => {
    const fetchJeux = async () => {
      const { data, error } = await supabase
        .from("jeux")
        .select("id, nom, max_joueurs");

      if (!error) setJeux(data || []);
    };

    fetchJeux();
  }, []);

  const addPartie = async () => {
    if (
      !newPartie.jeu_id ||
      !newPartie.date_partie ||
      !newPartie.heure_partie ||
      !newPartie.lieu
    ) {
      setErrorMsg("Jeu, date, heure et lieu sont obligatoires");
      return;
    }

    const jeuData = jeux.find((j) => j.id === newPartie.jeu_id);

    if (!jeuData) {
      setErrorMsg("Impossible de trouver le jeu sélectionné");
      return;
    }

    const nomDefault = `${jeuData.nom} ${new Date(
      newPartie.date_partie
    ).toLocaleDateString("fr-FR")} ${newPartie.heure_partie}`;

    const { error } = await supabase.from("parties").insert([
      {
        ...newPartie,
        nom: nomDefault,
        max_joueurs: jeuData.max_joueurs || 0,
        nombredejoueurs: 0,
      },
    ]);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    onClose();
    onCreated && onCreated();

    // Pas de notification si le lieu n'est pas "La loi des cartes"
    if (newPartie.lieu !== "La loi des cartes") {
      return;
    }

    // Pas de notification si la partie est dans le passé
    const partieDateTime = new Date(
      `${newPartie.date_partie}T${newPartie.heure_partie}`
    );

    const now = new Date();

    if (partieDateTime < now) {
      return;
    }

    // Récupération du token Supabase pour l'autorisation
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Envoi notification via fonction serverless
    await fetch(
      "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/notify-game",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "notif_parties",
          title: `🎲 Nouvelle partie de ${jeuData.nom}`,
          body: `Inscris toi à une partie de ${
            jeuData.nom
          } le ${new Date(
            newPartie.date_partie
          ).toLocaleDateString(
            "fr-FR"
          )} à ${newPartie.heure_partie} en cliquant ici !`,
          url: "/parties",
        }),
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 px-6 py-6 text-white">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-xl backdrop-blur-sm">
                  🎲
                </span>

                <span className="text-sm font-medium uppercase tracking-wider text-indigo-100">
                  Nouvelle partie
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight">
                Créer une partie
              </h2>

              <p className="mt-1 text-sm text-indigo-100">
                Organisez votre prochaine session de jeu
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
          {errorMsg && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="mt-0.5">⚠️</span>
              <p>{errorMsg}</p>
            </div>
          )}

          <div className="space-y-5">
            {/* Jeu */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Jeu
              </label>

              <select
                className={`w-full rounded-2xl border bg-gray-50 px-4 py-3 text-gray-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 ${
                  jeu
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500"
                    : "border-gray-200"
                }`}
                value={newPartie.jeu_id}
                onChange={(e) =>
                  setNewPartie({
                    ...newPartie,
                    jeu_id: e.target.value,
                  })
                }
                disabled={!!jeu}
              >
                <option value="">Choisir un jeu</option>

                {jeux.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nom}
                  </option>
                ))}
              </select>

              {jeu && (
                <p className="mt-2 text-xs text-gray-500">
                  Le jeu est défini depuis le catalogue.
                </p>
              )}
            </div>

            {/* Date et heure */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Date
                </label>

                <input
                  type="date"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  value={newPartie.date_partie}
                  onChange={(e) =>
                    setNewPartie({
                      ...newPartie,
                      date_partie: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Heure
                </label>

                <input
                  type="time"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  value={newPartie.heure_partie}
                  onChange={(e) =>
                    setNewPartie({
                      ...newPartie,
                      heure_partie: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Description
                <span className="ml-2 font-normal text-gray-400">
                  optionnelle
                </span>
              </label>

              <textarea
                placeholder="Ajoutez quelques informations sur la partie..."
                rows={3}
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                value={newPartie.description}
                onChange={(e) =>
                  setNewPartie({
                    ...newPartie,
                    description: e.target.value,
                  })
                }
              />
            </div>

            {/* Lieu */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Lieu
              </label>

              <input
                type="text"
                placeholder="Lieu de la partie"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                value={newPartie.lieu}
                onChange={(e) =>
                  setNewPartie({
                    ...newPartie,
                    lieu: e.target.value,
                  })
                }
              />

              <p className="mt-2 text-xs text-gray-500">
                Les notifications sont envoyées uniquement pour les parties
                organisées à « La loi des cartes ».
              </p>
            </div>
          </div>
        </div>

        {/* Pied de modale */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/80 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 active:scale-[0.98]"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={addPartie}
            className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl active:scale-[0.98]"
          >
            🎲 Créer la partie
          </button>
        </div>
      </div>
    </div>
  );
}