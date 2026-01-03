// src/RecapJeuxShareable.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function RecapJeuxShareable({ userId }) {
  const [gamesData, setGamesData] = useState([]);
  const [filter, setFilter] = useState("mois_courant");
  const [loading, setLoading] = useState(true);

  const filtersMap = {
    mois_courant: { label: "Mois courant", start: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    mois_passe: { label: "Mois passé", start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1) },
    annee_courante: { label: "Année en cours", start: new Date(new Date().getFullYear(), 0, 1) },
    annee_passee: { label: "Année passée", start: new Date(new Date().getFullYear() - 1, 0, 1) },
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

    const { data, error } = await supabase
      .from("parties")
      .select("jeu_id, score, created_at")
      .eq("user_id", userId)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (error) {
      console.error("Erreur fetch parties :", error);
      setLoading(false);
      return;
    }

    const grouped = {};
    data.forEach((p) => {
      if (!grouped[p.jeu_id]) grouped[p.jeu_id] = [];
      grouped[p.jeu_id].push(p);
    });

    const jeuIds = Object.keys(grouped);
    const { data: jeuxData } = await supabase
      .from("jeux")
      .select("id, nom, couverture_url")
      .in("id", jeuIds);

    const merged = jeuxData.map((jeu) => {
      const parties = grouped[jeu.id] || [];
      const maxScore = Math.max(...parties.map((p) => p.score), 0);
      return {
        ...jeu,
        partiesCount: parties.length,
        bestScore: maxScore,
      };
    });

    setGamesData(merged);
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Fond type “carte” */}
      <div className="relative bg-gradient-to-br from-blue-100 to-blue-300 rounded-2xl p-6 shadow-lg overflow-hidden">
        {/* Logo */}
        <img src="/logo_loidc.png" alt="Logo" className="w-16 mx-auto mb-2" />

        {/* Texte promo */}
        <p className="text-center font-bold text-lg mb-4 text-blue-900">
          La loi des cartes<br />Rejoignez-nous lors de nos séances de jeux !
        </p>

        {/* Sélecteur filtrage simple */}
        <div className="flex justify-center gap-2 mb-4 flex-wrap">
          {Object.keys(filtersMap).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full border ${
                filter === key ? "bg-blue-600 text-white" : "bg-white text-blue-900"
              }`}
            >
              {filtersMap[key].label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-blue-900">Chargement...</p>
        ) : gamesData.length === 0 ? (
          <p className="text-center text-blue-900">Aucune partie sur cette période</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {gamesData.map((jeu) => (
              <div key={jeu.id} className="relative rounded-lg overflow-hidden shadow-md">
                <img
                  src={jeu.couverture_url || "/default_game.png"}
                  alt={jeu.nom}
                  className="w-full h-32 object-cover"
                />
                {/* Médaille meilleure place */}
                {jeu.bestScore > 0 && (
                  <div className="absolute top-2 left-2 bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-white shadow">
                    🏆{jeu.bestScore}
                  </div>
                )}
                {/* Badge nombre de parties */}
                {jeu.partiesCount > 0 && (
                  <div className="absolute bottom-2 right-2 bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-white shadow">
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
