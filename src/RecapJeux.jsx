// src/RecapJeux.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function RecapJeux({ userId }) {
  const [gamesData, setGamesData] = useState([]);
  const [filter, setFilter] = useState("mois_courant"); // options: mois_courant, mois_passe, annee_courante, annee_passee
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

    // Récupère les parties du joueur sur la période
    const { data, error } = await supabase
      .from("parties")
      .select(`
        jeu_id,
        score,
        created_at
      `)
      .eq("user_id", userId)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (error) {
      console.error("Erreur fetch parties :", error);
      setLoading(false);
      return;
    }

    // Regroupe par jeu
    const grouped = {};
    data.forEach((p) => {
      if (!grouped[p.jeu_id]) grouped[p.jeu_id] = [];
      grouped[p.jeu_id].push(p);
    });

    // Récupère les infos des jeux
    const jeuIds = Object.keys(grouped);
    const { data: jeuxData } = await supabase
      .from("jeux")
      .select("id, nom, couverture_url")
      .in("id", jeuIds);

    // Fusionne
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
    <div className="p-4 bg-white rounded-lg shadow-md max-w-3xl mx-auto text-center">
      <h2 className="text-xl font-bold mb-2">🎲 Récap des jeux de {filtersMap[filter].label}</h2>

      {/* Sélecteur filtre */}
      <div className="flex justify-center gap-2 mb-4 flex-wrap">
        {Object.keys(filtersMap).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full border ${
              filter === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {filtersMap[key].label}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : gamesData.length === 0 ? (
        <p className="text-gray-500">Aucune partie sur cette période</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {gamesData.map((jeu) => (
            <div key={jeu.id} className="relative">
              <img
                src={jeu.couverture_url || "/default_game.png"}
                alt={jeu.nom}
                className="w-full h-32 object-cover rounded-lg"
              />

              {/* Médaille / meilleure place */}
              {jeu.bestScore > 0 && (
                <div className="absolute top-1 left-1 bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-white shadow">
                  🏆{jeu.bestScore}
                </div>
              )}

              {/* Badge nombre de parties */}
              {jeu.partiesCount > 0 && (
                <div className="absolute bottom-1 right-1 bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-white shadow">
                  {jeu.partiesCount}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Texte promo et logo */}
      <div className="mt-4 text-gray-700 text-sm">
        <p><strong>La loi des cartes</strong> - rejoignez nous lors de nos séances de jeux !</p>
        <img src="/logo_loidc.png" alt="Logo" className="mx-auto mt-2 w-20" />
      </div>
    </div>
  );
}
