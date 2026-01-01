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
      const { data, error } = await supabase.from("jeux").select("id, nom, max_joueurs");
      if (!error) setJeux(data || []);
    };
    fetchJeux();
  }, []);

  const addPartie = async () => {
    if (!newPartie.jeu_id || !newPartie.date_partie || !newPartie.heure_partie || !newPartie.lieu) {
      setErrorMsg("Jeu, date, heure et lieu sont obligatoires");
      return;
    }

    const jeuData = jeux.find((j) => j.id === newPartie.jeu_id);
    const nomDefault = `${jeuData.nom} ${new Date(newPartie.date_partie).toLocaleDateString("fr-FR")} ${newPartie.heure_partie}`;

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

    // ❌ Pas de notification si le lieu n'est pas "La loi des cartes"
    if (newPartie.lieu !== "La loi des cartes") {
      return;
    }

    // ✅ Récupération du token Supabase pour l'autorisation
    const { data: { session } } = await supabase.auth.getSession();

    // ✅ Récupération des utilisateurs à notifier
    const { data: usersToNotify, error: fetchUsersError } = await supabase
      .from("profils")
      .select("id")
      .eq("notif_parties", true);

    if (fetchUsersError) {
      console.error("Erreur récupération utilisateurs à notifier :", fetchUsersError);
      return;
    }

    const userIds = usersToNotify.map(u => u.id);

    if (userIds.length === 0) return; // Aucun utilisateur à notifier

    // ✅ Envoi notification via fonction serverless
    await fetch("https://jahbkwrftliquqziwwva.supabase.co/functions/v1/notify-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userIds,
        title: `🎲 Nouvelle partie de ${jeuData.nom}`,
        body: `Une nouvelle partie de ${jeuData.nom} vient d’être créée pour le ${new Date(newPartie.date_partie).toLocaleDateString("fr-FR")} à ${newPartie.heure_partie}. Inscris toi vite !`,
        url: "/parties",
      }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
      <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Créer une partie</h2>
        {errorMsg && <p className="text-red-600 mb-2">{errorMsg}</p>}

        <select
          className="w-full border p-2 rounded mb-2"
          value={newPartie.jeu_id}
          onChange={(e) => setNewPartie({ ...newPartie, jeu_id: e.target.value })}
          disabled={!!jeu}
        >
          <option value="">Choisir un jeu</option>
          {jeux.map((j) => (
            <option key={j.id} value={j.id}>
              {j.nom}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="w-full border p-2 rounded mb-2"
          value={newPartie.date_partie}
          onChange={(e) => setNewPartie({ ...newPartie, date_partie: e.target.value })}
        />
        <input
          type="time"
          className="w-full border p-2 rounded mb-2"
          value={newPartie.heure_partie}
          onChange={(e) => setNewPartie({ ...newPartie, heure_partie: e.target.value })}
        />
        <input
          type="text"
          placeholder="Description (optionnelle)"
          className="w-full border p-2 rounded mb-2"
          value={newPartie.description}
          onChange={(e) => setNewPartie({ ...newPartie, description: e.target.value })}
        />
        <input
          type="text"
          placeholder="Lieu (optionnel)"
          className="w-full border p-2 rounded mb-2"
          value={newPartie.lieu}
          onChange={(e) => setNewPartie({ ...newPartie, lieu: e.target.value })}
        />

        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-100">
            Annuler
          </button>
          <button onClick={addPartie} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}
