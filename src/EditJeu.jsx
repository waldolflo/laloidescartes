import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

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

  useEffect(() => {
    if (jeu) setForm(jeu);
  }, [jeu]);

  if (!jeu) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Fonction pour récupérer couverture depuis BGG
  const fetchCover = async (bggId) => {
    if (!bggId) return null;
    try {
      const res = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}`);
      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const thumbnail = xml.querySelector("thumbnail");
      return thumbnail?.textContent || null;
    } catch (err) {
      console.error("Erreur fetchCover :", err);
      return null;
    }
  };

  const saveEdit = async () => {
    try {
      let couverture_url = jeu.couverture_url;

      // Si bgg_api a changé, récupérer nouvelle couverture
      //if (form.bgg_api && form.bgg_api !== jeu.bgg_api) {
      //  couverture_url = await fetchCover(form.bgg_api);
      //}
      // Mise à jour à chaque modification de la couverture
      couverture_url = await fetchCover(form.bgg_api);

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
          couverture_url, // Mise à jour de la couverture si nécessaire
        })
        .eq("id", jeu.id)
        .select("*");

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      onUpdate(data[0]); // mise à jour instantanée
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-xl font-bold mb-4">Modifier le jeu</h2>

        {errorMsg && <p className="text-red-600 mb-2">{errorMsg}</p>}

        <input className="w-full border p-2 rounded mb-2" placeholder="Nom du jeu" value={form.nom} onChange={e => handleChange("nom", e.target.value)} />
        <input className="w-full border p-2 rounded mb-2" placeholder="Lien règles YouTube" value={form.regle_youtube} onChange={e => handleChange("regle_youtube", e.target.value)} />
        <input className="w-full border p-2 rounded mb-2" placeholder="Nombre de joueurs minimum" value={form.min_joueurs} onChange={e => handleChange("min_joueurs", e.target.value)} />
        <input className="w-full border p-2 rounded mb-2" placeholder="Nombre de joueurs maximum" value={form.max_joueurs} onChange={e => handleChange("max_joueurs", e.target.value)} />
        <input className="w-full border p-2 rounded mb-2" placeholder="Type de jeu" value={form.type} onChange={e => handleChange("type", e.target.value)} />
        <input className="w-full border p-2 rounded mb-4" placeholder="Durée" value={form.duree} onChange={e => handleChange("duree", e.target.value)} />
        <input className="w-full border p-2 rounded mb-4" placeholder="Propriétaire" value={form.proprietaire} onChange={e => handleChange("proprietaire", e.target.value)} />
        <input className="w-full border p-2 rounded mb-4" placeholder="ID BGG (Numéro dans l'URL du jeu)" value={form.bgg_api} onChange={e => handleChange("bgg_api", e.target.value)} />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-100">Annuler</button>
          <button onClick={saveEdit} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
