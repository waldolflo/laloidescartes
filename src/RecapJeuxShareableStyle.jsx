// src/RecapJeuxShareableStyle.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function RecapJeuxShareableStyle({ userId }) {
  const [gamesData, setGamesData] = useState([]);
  const [filter, setFilter] = useState("mois_courant");
  const [loading, setLoading] = useState(true);

  const now = new Date();

  const filtersMap = {
    mois_courant: { label: "Mois courant", start: new Date(now.getFullYear(), now.getMonth(), 1) },
    mois_passe: { label: "Mois passé", start: new Date(now.getFullYear(), now.getMonth() - 1, 1) },
    annee_courante: { label: "Année en cours", start: new Date(now.getFullYear(), 0, 1) },
    annee_passee: { label: "Année passée", start: new Date(now.getFullYear() - 1, 0, 1) },
    tous: { label: "Tous", start: null }, // pas de date de début pour "tous"
  };

  const endDateMap = {
    mois_courant: now,
    mois_passe: new Date(now.getFullYear(), now.getMonth(), 0),
    annee_courante: now,
    annee_passee: new Date(now.getFullYear() - 1, 11, 31),
    tous: null, // pas de date de fin pour "tous"
  };

  useEffect(() => {
    if (!userId) return;
    fetchGames();
  }, [userId, filter]);

  const fetchGames = async () => {
    setLoading(true);

    let query = supabase
      .from("inscriptions")
      .select(`id, partie_id, score, rank, parties(date_partie, jeu_id)`)
      .eq("utilisateur_id", userId);

    if (filter !== "tous") {
      const startDate = filtersMap[filter].start.toISOString();
      const endDate = endDateMap[filter].toISOString();
      query = query.gte("parties.date_partie", startDate).lte("parties.date_partie", endDate);
    }

    const { data: inscriptions, error } = await query;

    if (error) {
      console.error("Erreur fetch inscriptions :", error);
      setLoading(false);
      return;
    }

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

    const { data: jeuxData } = await supabase
      .from("jeux")
      .select("id, nom, couverture_url")
      .in("id", jeuIds);

    let merged = jeuxData.map((jeu) => {
      const parties = grouped[jeu.id] || [];
      const bestRank = Math.min(...parties.map((p) => p.rank || Infinity));

      let medal = null;
      if (bestRank === 1) medal = "🥇";
      else if (bestRank === 2) medal = "🥈";
      else if (bestRank === 3) medal = "🥉";

      return {
        ...jeu,
        partiesCount: parties.length,
        bestRank,
        medal,
      };
    });

    // Trier du plus joué au moins joué
    merged.sort((a, b) => b.partiesCount - a.partiesCount);

    // Limiter à 12 jeux pour "tous"
    if (filter === "tous") {
      merged = merged.slice(0, 12);
    }

    setGamesData(merged);
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="relative bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-200 rounded-3xl p-6 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-white/10 pointer-events-none rounded-3xl"></div>

        {/* Entête : Logo + texte à gauche, QR à droite */}
        <div className="flex justify-between items-start relative z-10 mb-6">
          <div className="text-left">
            <img src="/logo_loidc.png" alt="Logo" className="w-20 mb-2" />
            <p className="text-2xl font-bold text-purple-800 mb-1">La loi des cartes</p>
            <p className="text-sm text-purple-700 italic">
              Rejoignez-nous lors de nos séances de jeux !
            </p>
          </div>
          <div>
            <img src="/qrcode.png" alt="QR code app" className="w-24 h-24" />
          </div>
        </div>

        {/* Filtre période */}
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

                {/* Médaille avec animation “pop” */}
                {jeu.medal && (
                  <div className="absolute top-2 left-2 text-xl animate-[pop_0.5s_ease-out]">
                    {jeu.medal}
                  </div>
                )}

                {/* Badge nombre de parties avec animation “pop” */}
                {jeu.partiesCount > 0 && (
                  <div className="absolute bottom-2 right-2 bg-purple-700 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-white shadow-md animate-[pop_0.5s_ease-out]">
                    {jeu.partiesCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Définition animation pop */}
      <style>
        {`
          @keyframes pop {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
}
