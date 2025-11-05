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
  const fetchBGGData = async (bggId) => {
    if (!bggId) return { couverture_url: null, poids: null, note: null };
    try {
      const res = await fetch(
        "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/fetch-bgg-cover",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: bggId }),
        }
      );

      const data = await res.json();
      console.log(data)
      if (data.error) throw new Error(data.error);

      return {
        couverture_url: data.image || data.thumbnail || null,
        poids: data.weight ? parseFloat(data.weight) : null,
        note: data.rating ? parseFloat(data.rating) : null
      };
    } catch (err) {
      console.error("Erreur fetchBGGData :", err);
      return { couverture_url: null, poids: null, note: null };
    }
  };
  
  const saveEdit = async () => {
    try {
      let couverture_url = jeu.couverture_url;
      let poids = jeu.poids;
      let note = jeu.note;

      // Si bgg_api a changé, récupérer nouvelle couverture
      if (form.bgg_api && form.bgg_api !== jeu.bgg_api) {
        const bggData = await fetchBGGData(form.bgg_api);
        couverture_url = bggData.couverture_url;
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
          note
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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-96 z-60">
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
