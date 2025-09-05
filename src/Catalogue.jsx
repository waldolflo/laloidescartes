import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import EditJeu from "./EditJeu";

export default function Catalogue({ user }) {
  const [jeux, setJeux] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filteredJeux, setFilteredJeux] = useState([]);
  const [sortOption, setSortOption] = useState("nom-asc");
  const [nom, setNom] = useState("");
  const [proprietaire, setProprietaire] = useState("");
  const [duree, setDuree] = useState("");
  const [regleYoutube, setRegleYoutube] = useState("");
  const [minJoueurs, setMinJoueurs] = useState("");
  const [maxJoueurs, setMaxJoueurs] = useState("");
  const [type, setType] = useState("");
  const [bggId, setBggId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [editingJeu, setEditingJeu] = useState(null);
  const [addingJeu, setAddingJeu] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("profils")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!error) setUserRole(data?.role || "");
    };

    fetchRole();
    fetchJeux();
  }, [user]);

  const fetchJeux = async () => {
    const { data, error } = await supabase
      .from("jeux")
      .select("*")
      .order("nom", { ascending: true }); // Tri alphabétique de base
    if (error) setErrorMsg(error.message);
    else setJeux(data || []);
  };

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

  const addJeu = async () => {
    if (!nom) {
      setErrorMsg("Le nom du jeu est requis");
      return;
    }
    setErrorMsg("");

    const { data, error } = await supabase
      .from("jeux")
      .insert([{
        nom,
        proprietaire,
        duree,
        regle_youtube: regleYoutube,
        min_joueurs: minJoueurs,
        max_joueurs: maxJoueurs,
        type,
        utilisateur_id: user.id,
        bgg_api: bggId,
        couverture_url: null,
      }])
      .select("*");

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (!data || !data[0]) return;
    let newJeu = data[0];

    const coverUrl = await fetchCover(bggId);

    const { data: updatedData, error: updateError } = await supabase
      .from("jeux")
      .update({ couverture_url: coverUrl })
      .eq("id", newJeu.id)
      .select("*");

    if (updateError) console.error("Erreur update couverture :", updateError);
    newJeu = { ...newJeu, couverture_url: coverUrl };

    setJeux(prev => [newJeu, ...prev]);
    setAddingJeu(false);
    setNom(""); setProprietaire(""); setDuree(""); setRegleYoutube(""); setMinJoueurs(""); setMaxJoueurs(""); setType(""); setBggId("");
  };

  // Filtre et tri dynamique
  useEffect(() => {
    const text = searchText.toLowerCase();
    let filtered = jeux.filter(j =>
      (j.nom || "").toLowerCase().includes(text) ||
      (j.type || "").toLowerCase().includes(text) ||
      (j.proprietaire || "").toLowerCase().includes(text) ||
      (j.duree || "").toLowerCase().includes(text) ||
      (j.max_joueurs || "").toString().includes(text)
    );

    filtered.sort((a, b) => {
      switch (sortOption) {
        case "nom-asc": return (a.nom || "").localeCompare(b.nom || "");
        case "nom-desc": return (b.nom || "").localeCompare(a.nom || "");
        case "max-joueurs-asc": return (a.max_joueurs || 0) - (b.max_joueurs || 0);
        case "max-joueurs-desc": return (b.max_joueurs || 0) - (a.max_joueurs || 0);
        default: return 0;
      }
    });

    setFilteredJeux(filtered);
  }, [searchText, jeux, sortOption]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Jeux de l'association</h1>

      {/* Barre de recherche + tri */}
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border p-2 rounded"
          placeholder="Rechercher par nom, type, propriétaire, durée ou nombre max de joueurs"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <select
          className="border p-2 rounded"
          value={sortOption}
          onChange={e => setSortOption(e.target.value)}
        >
          <option value="nom-asc">Nom A → Z</option>
          <option value="nom-desc">Nom Z → A</option>
          <option value="max-joueurs-asc">Joueurs max ↑</option>
          <option value="max-joueurs-desc">Joueurs max ↓</option>
        </select>
        <button
          onClick={() => setAddingJeu(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Ajouter un jeu
        </button>
      </div>

      {/* Liste des jeux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {filteredJeux.map(j => (
          <div key={j.id} className="border rounded p-4 bg-white shadow">
            <h2 className="text-lg font-bold">{j.nom}</h2>
            {j.couverture_url && <img src={j.couverture_url} alt={j.nom} className="w-full h-32 object-contain mt-2 mb-2" />}
            {j.regle_youtube && <p><a href={j.regle_youtube} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Voir les règles</a></p>}
            <p>Nombre de joueurs : {j.min_joueurs}/{j.max_joueurs}</p>
            <p>Type : {j.type || "?"}</p>
            <p>Durée : {j.duree || "?"} minutes</p>
            <p>Propriétaire : {j.proprietaire || "?"}</p>

            {(userRole === "admin" || userRole === "ludo") && (
              <button onClick={() => setEditingJeu(j)} className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mt-2">Modifier</button>
            )}
          </div>
        ))}
      </div>

      {/* Modal édition */}
      {editingJeu && (
        <EditJeu
          jeu={editingJeu}
          onClose={() => setEditingJeu(null)}
          onUpdate={(updatedJeu) => {
            if (!updatedJeu?.id) return;
            setJeux(prev => prev.map(j => String(j.id) === String(updatedJeu.id) ? updatedJeu : j));
          }}
        />
      )}

      {/* Modal ajout */}
      {addingJeu && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h2 className="text-xl font-bold mb-4">Ajouter un jeu</h2>
            {errorMsg && <p className="text-red-600 mb-2">{errorMsg}</p>}

            <input className="w-full border p-2 rounded mb-2" placeholder="Nom du jeu" value={nom} onChange={e => setNom(e.target.value)} />
            <input className="w-full border p-2 rounded mb-2" placeholder="Lien règles YouTube" value={regleYoutube} onChange={e => setRegleYoutube(e.target.value)} />
            <input className="w-full border p-2 rounded mb-2" placeholder="Nombre de joueurs min" value={minJoueurs} onChange={e => setMinJoueurs(e.target.value)} />
            <input className="w-full border p-2 rounded mb-2" placeholder="Nombre de joueurs max" value={maxJoueurs} onChange={e => setMaxJoueurs(e.target.value)} />
            <input className="w-full border p-2 rounded mb-2" placeholder="Type de jeu" value={type} onChange={e => setType(e.target.value)} />
            <input className="w-full border p-2 rounded mb-2" placeholder="Durée" value={duree} onChange={e => setDuree(e.target.value)} />
            <input className="w-full border p-2 rounded mb-2" placeholder="Propriétaire" value={proprietaire} onChange={e => setProprietaire(e.target.value)} />
            <input className="w-full border p-2 rounded mb-2" placeholder="ID BGG (Numéro dans l'URL)" value={bggId} onChange={e => setBggId(e.target.value)} />

            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setAddingJeu(false)} className="px-4 py-2 rounded border hover:bg-gray-100">Annuler</button>
              <button onClick={addJeu} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
