// CreatePartieModal.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  Plus,
  X,
  AlertCircle,
  Dices,
} from "lucide-react";

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
    setErrorMsg("");

    if (
      !newPartie.jeu_id ||
      !newPartie.date_partie ||
      !newPartie.heure_partie ||
      !newPartie.lieu
    ) {
      setErrorMsg("Jeu, date, heure et lieu sont obligatoires");
      return;
    }

    const jeuData = jeux.find(
      (j) => String(j.id) === String(newPartie.jeu_id)
    );

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
              <Plus size={25} />
            </div>

            <div>
              <p className="text-indigo-200 text-xs uppercase tracking-widest font-bold">
                La Loi des Cartes
              </p>

              <h2 className="text-2xl font-black">
                Nouvelle partie
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
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700">

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
              JEU
              ================================================== */}

          <label className="block mb-1.5 text-sm font-bold text-gray-700">
            Jeu
          </label>

          <select
            value={newPartie.jeu_id}
            onChange={(e) =>
              setNewPartie((prev) => ({
                ...prev,
                jeu_id: e.target.value,
              }))
            }
            disabled={!!jeu}
            className={`w-full border bg-gray-50 p-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              jeu
                ? "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                : "border-gray-200 text-gray-800"
            }`}
          >
            <option value="">Choisir un jeu</option>

            {jeux.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nom}
              </option>
            ))}
          </select>

          {jeu && (
            <p className="-mt-2 mb-4 text-xs text-gray-500">
              Le jeu est défini depuis le catalogue.
            </p>
          )}

          {/* ==================================================
              DATE + HEURE
              ================================================== */}

          <div className="grid grid-cols-2 gap-3">

            {/* Date */}
            <div>

              <label className="block mb-1.5 text-sm font-bold text-gray-700">
                Date
              </label>

              <input
                type="date"
                value={newPartie.date_partie}
                onChange={(e) =>
                  setNewPartie((p) => ({
                    ...p,
                    date_partie: e.target.value,
                  }))
                }
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

            </div>

            {/* Heure */}
            <div>

              <label className="block mb-1.5 text-sm font-bold text-gray-700">
                Heure
              </label>

              <input
                type="time"
                value={newPartie.heure_partie}
                onChange={(e) =>
                  setNewPartie((p) => ({
                    ...p,
                    heure_partie: e.target.value,
                  }))
                }
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

            </div>

          </div>

          {/* ==================================================
              DESCRIPTION
              ================================================== */}

          <label className="block mt-4 mb-1.5 text-sm font-bold text-gray-700">
            Description
            <span className="ml-2 text-xs font-normal text-gray-400">
              optionnelle
            </span>
          </label>

          <textarea
            placeholder="Ajoutez quelques informations sur la partie..."
            rows={3}
            value={newPartie.description}
            onChange={(e) =>
              setNewPartie((p) => ({
                ...p,
                description: e.target.value,
              }))
            }
            className="w-full resize-none border border-gray-200 bg-gray-50 p-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* ==================================================
              LIEU
              ================================================== */}

          <label className="block mt-4 mb-1.5 text-sm font-bold text-gray-700">
            Lieu
          </label>

          <input
            type="text"
            placeholder="Lieu de la partie"
            value={newPartie.lieu}
            onChange={(e) =>
              setNewPartie((p) => ({
                ...p,
                lieu: e.target.value,
              }))
            }
            className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <p className="mt-2 text-xs text-gray-500">
            Les notifications sont envoyées uniquement pour les parties
            organisées à « La loi des cartes ».
          </p>

        </div>

        {/* ======================================================
            BOUTONS
            ====================================================== */}

        <div className="flex gap-3 border-t border-gray-100 bg-gray-50/80 px-6 py-4">

          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 transition"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={addPartie}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Plus size={18} />
              Créer la partie
            </span>
          </button>

        </div>

      </div>
    </div>
  );
}