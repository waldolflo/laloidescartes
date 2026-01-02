import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import EditJeu from "./EditJeu";
import CreatePartieModal from "./CreatePartieModal";

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
  const [selectedJeu, setSelectedJeu] = useState(null);
  const bestScoresFetched = useRef(false); // ✅ Empêche la boucle
  const bestScoreSynced = useRef(false);// ✅ Empêche la boucle

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

  useEffect(() => {
    const fetchBestScores = async () => {
      if (!jeux.length || bestScoresFetched.current) return; // ⛔ déjà fait
      bestScoresFetched.current = true;

      try {
        // 1️⃣ Récupérer toutes les parties
        const { data: allParties, error: errorParties } = await supabase
          .from("parties")
          .select("id, jeu_id");

        if (errorParties || !allParties?.length) return;

        // 2️⃣ Récupérer toutes les inscriptions liées à ces parties
        const partieIds = allParties.map((p) => p.id);
        const { data: allInscriptions, error: errorInscriptions } = await supabase
          .from("inscriptions")
          .select("partie_id, score, utilisateurs:utilisateur_id(nom)")
          .in("partie_id", partieIds);

        if (errorInscriptions || !allInscriptions?.length) return;

        // 3️⃣ Grouper les inscriptions par jeu
        const inscriptionsByJeu = {};
        for (const inscription of allInscriptions) {
          const partie = allParties.find((p) => p.id === inscription.partie_id);
          if (!partie) continue;
          const jeuId = partie.jeu_id;
          if (!inscriptionsByJeu[jeuId]) inscriptionsByJeu[jeuId] = [];
          inscriptionsByJeu[jeuId].push(inscription);
        }

        // 4️⃣ Calculer les meilleurs scores et joueurs
        const updatedJeux = jeux.map((jeu) => {
          const inscriptions = inscriptionsByJeu[jeu.id] || [];
          const valid = inscriptions.filter(
            (i) => i.score != null && i.score > 0
          );

          if (!valid.length) {
            return { ...jeu, bestScore: null, bestUsers: null };
          }

          const maxScore = Math.max(...valid.map((i) => i.score));
          const bestUsers = valid
            .filter((i) => i.score === maxScore)
            .map((i) => i.utilisateurs?.nom || "?");

          return {
            ...jeu,
            bestScore: maxScore,
            bestUsers,
          };
        });

        setJeux(updatedJeux);
        syncBestScores(updatedJeux);
      } catch (err) {
        console.error("Erreur fetchBestScores :", err);
      }
    };

    fetchBestScores();
  }, [jeux]); // ⚙️ se relance seulement quand jeux change

  const syncBestScores = async (jeux) => {
    if (bestScoreSynced.current) return;
    bestScoreSynced.current = true;

    for (const jeu of jeux) {
      // 1️⃣ aucun score → skip
      if (!jeu.bestScore || jeu.bestScore <= 0) continue;
      if (!Array.isArray(jeu.bestUsers) || jeu.bestUsers.length === 0) continue;

      const bestUser = jeu.bestUsers[0]; // uniquement le premier

      // 2️⃣ valeurs identiques → skip
      const sameScore = jeu.best_score === jeu.bestScore;
      const sameUser = jeu.best_users === bestUser;

      if (sameScore && sameUser) continue;

      // 3️⃣ update minimal
      const { error } = await supabase
        .from("jeux")
        .update({
          best_score: jeu.bestScore,
          best_users: bestUser,
        })
        .eq("id", jeu.id);

      if (error) {
        console.error(`❌ Sync bestScore (${jeu.nom})`, error);
      } else {
        console.log(`✔ BestScore sync (${jeu.nom})`);
      }
    }
  };

  // 🔄 Réinitialise la protection quand on recharge les jeux depuis la base
  const fetchJeux = async () => {
    const { data, error } = await supabase
      .from("jeux")
      .select("*")
      .order("nom", { ascending: true });
    if (!error) {
      setJeux(data || []);
      bestScoresFetched.current = false; // ✅ permet rechargement propre
      bestScoreSynced.current = false;// ✅ permet rechargement propre
    }
  };

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
        poids: data.weight || null,  // Assure-toi que ton endpoint renvoie weight
        note: data.rating || null     // Assure-toi que ton endpoint renvoie rating
      };
    } catch (err) {
      console.error("Erreur fetchBGGData :", err);
      return { couverture_url: null, poids: null, note: null };
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
        poids: null, // initialement null
        note: null, // initialement null
      }])
      .select("*");

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (!data || !data[0]) return;
    let newJeu = data[0];

    // 2️⃣ Récupération des données depuis BGG
    const bggData = await fetchBGGData(bggId);

    const { data: updatedData, error: updateError } = await supabase
      .from("jeux")
      .update({ couverture_url: bggData.couverture_url, note: bggData.note, poids: bggData.poids })
      .eq("id", newJeu.id)
      .select("*");

    if (updateError) console.error("Erreur update couverture :", updateError);
    newJeu = { ...newJeu, ...bggData };

    setJeux(prev => [newJeu, ...prev]);
    setAddingJeu(false);
    setNom(""); setProprietaire(""); setDuree(""); setRegleYoutube(""); setMinJoueurs(""); setMaxJoueurs(""); setType(""); setBggId("");

    // ✅ Récupération du token Supabase pour l'autorisation
    const { data: { session } } = await supabase.auth.getSession();

    // ✅ Envoi notification via fonction serverless
    await fetch("https://jahbkwrftliquqziwwva.supabase.co/functions/v1/notify-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        type: "notif_jeux", // 👈 le serveur filtrera tous les devices avec notif_jeux = true
        title: `🎲 Nouveau jeu : ${newJeu.nom}`,
        body: `${newJeu.nom} à été ajouté à la ludothèque c'est un jeu ${newJeu.type} pour ${newJeu.min_joueurs} à ${newJeu.max_joueurs} joueurs d'une durée de ${newJeu.duree}. Cliquez pour plus de détails !`,
        url: "/catalogue",
      }),
    });
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
        case "fav-desc": return (b.fav || 0) - (a.fav || 0);
        case "fav-asc": return (a.fav || 0) - (b.fav || 0);
        case "note-desc": return (b.note || 0) - (a.note || 0);
        case "note-asc": return (a.note || 0) - (b.note || 0);
        case "poids-desc": return (b.poids || 0) - (a.poids || 0);
        case "poids-asc": return (a.poids || 0) - (b.poids || 0);
        default: return 0;
      }
    });

    setFilteredJeux(filtered);
  }, [searchText, jeux, sortOption]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Jeux</h1>

      {/* Barre de recherche + tri + bouton sur une ligne */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
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
          <option value="fav-desc">Favoris ↓</option>
          <option value="fav-asc">Favoris ↑</option>
          <option value="note-desc">Note ↓</option>
          <option value="note-asc">Note ↑</option>
          <option value="poids-desc">Poids ↓</option>
          <option value="poids-asc">Poids ↑</option>
        </select>
        {(userRole === "admin" || userRole === "ludoplus" || userRole === "ludo") && (
          <button
            onClick={() => setAddingJeu(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Ajouter un jeu
          </button>
        )}
      </div>

      {/* Liste des jeux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {filteredJeux.map(j => (
          <div key={j.id} className="relative border rounded p-4 bg-white shadow overflow-hidden">
            {/* Badges empilés en haut à droite */}
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
              {/* Favori */}
              {j.fav > 0 && (
                <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-1 shadow">
                  ❤️ {j.fav}
                </span>
              )}
              {/* Note */}
              {j.note && j.note > 0 && (
                <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-lg shadow">
                  ⭐ {parseFloat(j.note).toFixed(1)} / 10
                </span>
              )}
              {/* Poids */}
              {j.poids && j.poids > 0 && (
                <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-lg shadow">
                  ⚖️ {parseFloat(j.poids).toFixed(2)} / 5
                </span>
              )}
              {/* Score max */}
              {j.bestScore && j.bestScore > 0 && (
                <span
                  className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-lg shadow cursor-pointer"
                  title={j.bestUsers.join(", ")} // infobulle desktop
                  onClick={() => alert(`Meilleur score par ${j.bestUsers.join(", ")}`)} // mobile tap
                >
                  🏆 {j.bestScore}
                </span>
              )}
            </div>

            {/* Image + lien BGG */}
            {j.couverture_url && (
              <div className="relative mt-2 mb-2">
                {j.bgg_api ? (
                  <a
                    href={`https://boardgamegeek.com/boardgame/${j.bgg_api}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={j.couverture_url}
                      alt={j.nom}
                      className="w-full h-40 object-contain mt-2 mb-2 rounded"
                    />
                  </a>
                ) : (
                  <img
                    src={j.couverture_url}
                    alt={j.nom}
                    className="w-full h-40 object-contain mt-2 mb-2 rounded"
                  />
                )}
                {/* 🎬 Bouton règles – overlay discret */}
                {j.regle_youtube && (
                  <a
                    href={j.regle_youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2
                              inline-flex items-center gap-1
                              px-2 py-1
                              bg-red-600/90 text-white
                              text-xs font-semibold
                              rounded-lg shadow
                              hover:bg-red-700 hover:scale-105
                              transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 576 512"
                      className="w-4 h-4 fill-white"
                    >
                      <path d="M549.655 124.083c-6.281-23.65-24.764-42.148-48.378-48.433C456.727 64 288 64 288 64s-168.727 0-213.277 11.65c-23.614 6.285-42.097 24.783-48.378 48.433C16 168.64 16 256.004 16 256.004s0 87.36 10.345 131.917c6.281 23.65 24.764 42.148 48.378 48.433C119.273 448 288 448 288 448s168.727 0 213.277-11.65c23.614-6.285 42.097-24.783 48.378-48.433C560 343.364 560 256.004 560 256.004s0-87.36-10.345-131.921zM232 336V176l142 80-142 80z" />
                    </svg>
                    Règles
                  </a>
                )}
              </div>
            )}

            {/* Informations texte */}
            <h2 className="text-lg font-bold">{j.nom}</h2>
            <p>Nombre de joueurs : {j.min_joueurs} à {j.max_joueurs}</p>
            <p>Type : {j.type || "?"}</p>
            <p>Durée : {j.duree || "?"} minutes</p>
            <p>Propriétaire : {j.proprietaire || "?"}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {(j.utilisateur_id === user.id || userRole === "admin" || userRole === "ludoplus") && (
                <button
                  onClick={() => setEditingJeu(j)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                >
                  Modifier
                </button>
              )}
              {(userRole === "admin" || userRole === "ludoplus" || userRole === "ludo" || userRole === "membre") && (
                <button
                  onClick={() => setSelectedJeu(j)}
                  className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  Créer partie
                </button>
              )}
            </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-96 z-60">
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

      {/* Modale création partie */}
      {selectedJeu && (
        <CreatePartieModal
          user={user}
          jeu={selectedJeu}
          onClose={() => setSelectedJeu(null)}
          onCreated={() => {
            setSelectedJeu(null);
            alert("Partie créée !");
          }}
        />
      )}
    </div>
  );
}
