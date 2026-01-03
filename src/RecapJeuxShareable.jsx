// src/RecapJeuxShareable.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function RecapJeuxShareable({ userId }) {
  const [gamesData, setGamesData] = useState([]);
  const [filter, setFilter] = useState("mois_courant");
  const [loading, setLoading] = useState(true);

  // Définition des périodes pour filtrer
  const filtersMap = {
    mois_courant: {
      label: "Mois courant",
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    },
    mois_passe: {
      label: "Mois passé",
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    },
    annee_courante: {
      label: "Année en cours",
      start: new Date(new Date().getFullYear(), 0, 1),
    },
    annee_passee: {
      label: "Année passée",
      start: new Date(new Date().getFullYear() - 1, 0, 1),
    },
  };

  const endDateMap = {
    mois_courant: new Date(),
    mois_passe: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
    annee_courante: new Date(),
    annee_passee: new Date(new Date().getFullYear() - 1, 11, 31),
  };

  useEffect(() => {
    if (!userId) return;
    fetchGames();
  }, [userId, filter]);

  const fetchGames = async () => {
    setLoading(true);
    const startDate = filtersMap[filter].start.toISOString();
    const endDate = endDateMap[filter].toISOString();

    // 1️⃣ Récupérer les inscriptions de l'utilisateur avec parties
    const { data: inscriptions, error } = await supabase
      .from("inscriptions")
      .select(`id, partie_id, score, rank, parties(date_partie, jeu_id)`)
      .eq("utilisateur_id", userId)
      .gte("parties.date_partie", startDate)
      .lte("parties.date_partie", endDate);

    if (error) {
      console.error("Erreur fetch inscriptions :", error);
      setLoading(false);
      return;
    }

    // Grouper par jeu
    const grouped = {};
    inscriptions.forEach((ins) => {
      const jeuId = ins.parties?.jeu_id;
      if (!jeuId) return;
      if (!grouped[jeuId]) grouped[jeuId] = [];
      grouped[jeuId].push(ins);
    });

    const jeuIds = Object.keys(grouped);
    if (jeuIds.length === 0) {
      setGamesData([]);
      setLoading(false);
      return;
    }

    // 2️⃣ Récupérer les infos des jeux
    const { data: jeuxData } = await supabase
      .from("jeux")
      .select("id, nom, couverture_url")
      .in("id", jeuIds);

    // 3️⃣ Fusionner données : parties jouées, meilleur score/rang
    const merged = jeuxData.map((jeu) => {
      const parties = grouped[jeu.id] || [];
      const bestRank = Math.min(...parties.map((p) => p.rank || Infinity));
      const bestScore = Math.max(...parties.map((p) => p.score || 0));
      return {
        ...jeu,
        partiesCount: parties.length,
        bestRank,
        bestScore,
      };
    });

    setGamesData(merged);
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Carte principale */}
      <div className="relative bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-200 rounded-3xl p-6 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-white/10 pointer-events-none rounded-3xl"></div>

        {/* Logo et texte */}
        <div className="relative text-center z-10">
          <img src="/logo_loidc.png" alt="Logo" className="w-20 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-800 mb-2">La loi des cartes</p>
          <p className="text-sm text-purple-700 italic mb-6">
            Rejoignez-nous lors de nos séances de jeux !
          </p>
        </div>

        {/* Sélecteur filtre */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap relative z-10">
          {Object.keys(filtersMap).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full border font-semibold text-sm ${
                filter === key
                  ? "bg-purple-700 text-white border-purple-800"
                  : "bg-white text-purple-800 border-purple-300"
              }`}
            >
              {filtersMap[key].label}
            </button>
          ))}
        </div>

        {/* Grille jeux */}
        {loading ? (
          <p className="text-center text-purple-900 relative z-10">Chargement...</p>
        ) : gamesData.length === 0 ? (
          <p className="text-center text-purple-900 relative z-10">Aucune partie sur cette période</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 relative z-10">
            {gamesData.map((jeu) => (
              <div key={jeu.id} className="relative rounded-xl overflow-hidden shadow-lg">
                <img
                  src={jeu.couverture_url || "/default_game.png"}
                  alt={jeu.nom}
                  className="w-full h-36 object-cover rounded-xl transform hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/20 rounded-xl"></div>

                {/* Médaille meilleur rang */}
                {jeu.bestRank !== Infinity && (
                  <div className="absolute top-2 left-2 bg-yellow-400 rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold text-white shadow-md animate-pulse">
                    🏅{jeu.bestRank}
                  </div>
                )}

                {/* Badge nombre de parties */}
                {jeu.partiesCount > 0 && (
                  <div className="absolute bottom-2 right-2 bg-purple-700 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-white shadow-md">
                    {jeu.partiesCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
