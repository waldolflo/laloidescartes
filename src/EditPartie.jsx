import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function EditPartie({ partie, onClose, onUpdate }) {
  const [formData, setFormData] = useState({ ...partie });
  const [jeux, setJeux] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchJeux();
  }, []);

  const fetchJeux = async () => {
    const { data, error } = await supabase.from("jeux").select("*");
    if (error) console.error(error);
    else setJeux(data || []);
  };

  const saveChanges = async () => {
    if (!formData.jeu_id || !formData.date_partie || !formData.heure_partie) {
      setErrorMsg("Jeu, date et heure sont obligatoires");
      return;
    }

    const jeu = jeux.find(j => j.id === formData.jeu_id);
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
      onUpdate({...data[0], heure_partie: data[0].heure_partie?.slice(0,8)});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow w-96 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          X
        </button>

        <h2 className="text-xl font-bold mb-4">Modifier la partie</h2>
        {errorMsg && <p className="text-red-600 mb-2">{errorMsg}</p>}

        <select
          value={formData.jeu_id}
          onChange={e => setFormData(prev => ({ ...prev, jeu_id: e.target.value }))}
          className="w-full border p-2 rounded mb-2"
        >
          <option value="">Choisir un jeu</option>
          {jeux.map(j => <option key={j.id} value={j.id}>{j.nom}</option>)}
        </select>

        <input
          type="date"
          value={formData.date_partie}
          onChange={e => setFormData(prev => ({ ...prev, date_partie: e.target.value }))}
          className="w-full border p-2 rounded mb-2"
        />

        <input
          type="time"
          value={formData.heure_partie?.slice(0,8) || ""}
          onChange={e => setFormData(prev => ({ ...prev, heure_partie: e.target.value }))}
          className="w-full border p-2 rounded mb-2"
        />

        <input
          type="text"
          placeholder="Description (optionnelle)"
          value={formData.description || ""}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full border p-2 rounded mb-2"
        />

        <input
          type="text"
          placeholder="Lieu (optionnelle)"
          value={formData.lieu || ""}
          onChange={e => setFormData(prev => ({ ...prev, lieu: e.target.value }))}
          className="w-full border p-2 rounded mb-2"
        />

        <button
          onClick={saveChanges}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
