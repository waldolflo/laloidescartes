import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  Pencil,
  X,
  AlertCircle,
  Dices,
  CalendarDays,
  Clock3,
  MapPin,
  FileText,
  Save,
} from "lucide-react";

export default function EditPartie({ partie, onClose, onUpdate }) {
  const [formData, setFormData] = useState({ ...partie });
  const [jeux, setJeux] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchJeux();
  }, []);

  const fetchJeux = async () => {
    const { data, error } = await supabase
      .from("jeux")
      .select("*");

    if (error) {
      console.error(error);
    } else {
      setJeux(data || []);
    }
  };

  const saveChanges = async () => {
    if (
      !formData.jeu_id ||
      !formData.date_partie ||
      !formData.heure_partie
    ) {
      setErrorMsg("Jeu, date et heure sont obligatoires");
      return;
    }

    const jeu = jeux.find(
      (j) => j.id === formData.jeu_id
    );

    if (!jeu) return;

    const nomDefault = `${jeu.nom} ${formData.date_partie} ${formData.heure_partie}`;

    const { data, error } = await supabase
      .from("parties")
      .update({
        jeu_id: formData.jeu_id,
        date_partie: formData.date_partie,
        heure_partie: formData.heure_partie,
        description: formData.description,
        lieu: formData.lieu,
        nom: nomDefault,
        max_joueurs: jeu.max_joueurs || 0,
      })
      .eq("id", partie.id)
      .select("*");

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
    } else if (data && data[0]) {
      onUpdate({
        ...data[0],
        heure_partie: data[0].heure_partie?.slice(0, 8),
      });

      onClose();
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
        {/* HEADER */}
        <div className="relative bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-950 px-6 py-6 text-white overflow-hidden">
          {/* Décorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-indigo-500/20 blur-2xl" />
            <div className="absolute -bottom-28 -left-20 w-56 h-56 rounded-full bg-purple-500/20 blur-2xl" />

            <Dices
              size={180}
              className="absolute -right-8 -bottom-16 text-white opacity-[0.035] rotate-12"
            />
          </div>

          {/* Bouton fermeture */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition z-10"
            aria-label="Fermer"
          >
            <X size={19} />
          </button>

          {/* Titre */}
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Pencil size={23} />
            </div>

            <div>
              <p className="text-indigo-200 text-xs uppercase tracking-widest font-bold">
                La Loi des Cartes
              </p>

              <h2 className="text-2xl font-black">
                Modifier la partie
              </h2>
            </div>
          </div>
        </div>

        {/* CONTENU */}
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

          {/* Jeu */}
          <div>
            <label className="block mb-1.5 text-sm font-bold text-gray-700">
              Jeu
            </label>

            <div className="relative">
              <Dices
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none"
              />

              <select
                value={formData.jeu_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    jeu_id: e.target.value,
                  }))
                }
                className="w-full appearance-none border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">
                  Choisir un jeu
                </option>

                {jeux.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Heure */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label className="block mb-1.5 text-sm font-bold text-gray-700">
                Date
              </label>

              <div className="relative">
                <CalendarDays
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none"
                />

                <input
                  type="date"
                  value={formData.date_partie}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      date_partie: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-bold text-gray-700">
                Heure
              </label>

              <div className="relative">
                <Clock3
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none"
                />

                <input
                  type="time"
                  value={
                    formData.heure_partie?.slice(0, 8) || ""
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      heure_partie: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4">
            <label className="block mb-1.5 text-sm font-bold text-gray-700">
              Description
              <span className="ml-1 text-xs font-normal text-gray-400">
                (optionnelle)
              </span>
            </label>

            <div className="relative">
              <FileText
                size={18}
                className="absolute left-3 top-3.5 text-indigo-500"
              />

              <input
                type="text"
                placeholder="Description de la partie"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Lieu */}
          <div className="mt-4">
            <label className="block mb-1.5 text-sm font-bold text-gray-700">
              Lieu
              <span className="ml-1 text-xs font-normal text-gray-400">
                (optionnel)
              </span>
            </label>

            <div className="relative">
              <MapPin
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500"
              />

              <input
                type="text"
                placeholder="Lieu de la partie"
                value={formData.lieu || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lieu: e.target.value,
                  }))
                }
                className="w-full border border-gray-200 bg-gray-50 pl-10 pr-3 py-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
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
            onClick={saveChanges}
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