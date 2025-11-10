import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Statistiques() {
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [yearlyStats, setYearlyStats] = useState([]);
  const [generalStats, setGeneralStats] = useState({
    totalParties: 0,
    topGames: [],
  });
  const [generalRanking, setGeneralRanking] = useState([]);

  const [lieux, setLieux] = useState([]);
  const [selectedLieu, setSelectedLieu] = useState("La loi des cartes");

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  useEffect(() => {
    async function fetchStats() {
      const { data: parties, error: partiesError } = await supabase
        .from("parties")
        .select("id, jeu_id, date_partie, lieu");

      if (partiesError) return console.error(partiesError);

      const { data: jeux, error: jeuxError } = await supabase
        .from("jeux")
        .select("id, nom, couverture_url, poids");
      if (jeuxError) return console.error(jeuxError);

      const { data: users, error: userError } = await supabase
        .from("profils")
        .select("id, nom");
      if (userError) return console.error(userError);

      const { data: inscriptions, error: inscriptionsError } = await supabase
        .from("inscriptions")
        .select("partie_id, utilisateur_id, rank");
      if (inscriptionsError) return console.error(inscriptionsError);

      // 🎯 Extraire tous les lieux disponibles (uniques)
      const uniqueLieux = [...new Set(parties.map((p) => p.lieu).filter(Boolean))];
      setLieux(uniqueLieux);

      // 👉 Filtrer les parties selon le lieu choisi
      const filteredParties = selectedLieu
        ? parties.filter((p) => p.lieu === selectedLieu)
        : parties;

      // 🧮 Calcul des points
      const calcPoints = (rank, poids, nbJoueurs) => {
        if (!rank || rank < 1) return 0;

        const basePoints =
          rank === 1 ? 2.5 :
          rank === 2 ? 2 :
          rank === 3 ? 1.5 :
          1;

        const boostPoids = 0.5 * ((Math.sqrt(poids || 1) - 1) / (Math.sqrt(5) - 1));
        const boostJoueurs = 0.1 * Math.log(nbJoueurs || 1);
        const multiplier = 1 + boostPoids + boostJoueurs;

        return Math.round(basePoints * multiplier * 100) / 100;
      };

      const calculatePointsForUser = (userId, filterFn) => {
        return inscriptions
          .filter((ins) => ins.utilisateur_id === userId)
          .filter((ins) => {
            const partie = filteredParties.find((p) => p.id === ins.partie_id);
            return partie && filterFn(partie);
          })
          .reduce((acc, ins) => {
            const partie = filteredParties.find((p) => p.id === ins.partie_id);
            if (!partie || !ins.rank || ins.rank < 1) return acc;
            const jeu = jeux.find((j) => j.id === partie.jeu_id);
            const nbJoueurs = inscriptions.filter((i) => i.partie_id === partie.id).length;
            return acc + calcPoints(ins.rank, jeu?.poids, nbJoueurs);
          }, 0);
      };

      // --- Statistiques mensuelles ---
      const statsByMonth = users.map((user) => {
        const points = calculatePointsForUser(user.id, (p) => {
          const d = new Date(p.date_partie);
          return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
        });
        return { nom: user.nom, points };
      });

      // --- Statistiques annuelles ---
      const statsByYear = users.map((user) => {
        const points = calculatePointsForUser(user.id, (p) => {
          const d = new Date(p.date_partie);
          return d.getFullYear() === selectedYear;
        });
        return { nom: user.nom, points };
      });

      setMonthlyStats(statsByMonth.sort((a, b) => b.points - a.points));
      setYearlyStats(statsByYear.sort((a, b) => b.points - a.points));

      // --- Statistiques générales ---
      const totalParties = filteredParties.length;
      const gameCounts = filteredParties.reduce((acc, p) => {
        acc[p.jeu_id] = (acc[p.jeu_id] || 0) + 1;
        return acc;
      }, {});

      const topGames = Object.entries(gameCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([jeuId, count]) => {
          const jeu = jeux.find((j) => j.id === jeuId);
          return {
            id: jeuId,
            nom: jeu?.nom || "?",
            couverture_url: jeu?.couverture_url,
            count,
          };
        });

      setGeneralStats({ totalParties, topGames });

      // --- Classement général ---
      const ranking = users.map((user) => ({
        nom: user.nom,
        points: calculatePointsForUser(user.id, () => true),
      }));
      setGeneralRanking(ranking.sort((a, b) => b.points - a.points));
    }

    fetchStats();
  }, [selectedLieu, selectedMonth, selectedYear]);

  // --- Rendu graphique des barres ---
  const renderBars = (data) => {
    const maxValue = Math.max(...data.map((d) => d.points), 1);
    return (
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.nom} className="flex items-center space-x-2">
            <span className="w-32 truncate">{d.nom}</span>
            <div className="bg-gray-300 h-6 flex-1 rounded overflow-hidden">
              <div
                className="bg-green-500 h-6 rounded"
                style={{ width: `${(d.points / maxValue) * 100}%` }}
              ></div>
            </div>
            <span className="w-12 text-right">{d.points}</span>
          </div>
        ))}
      </div>
    );
  };

  const medalEmojis = ["🥇", "🥈", "🥉", "🏅", "🎖️"];

  const months = [
    "Janvier","Février","Mars","Avril","Mai","Juin",
    "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
  ];

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="p-6 space-y-6">
      {/* 🎯 Filtres */}
      {profil.role === "admin" && (
        <div className="flex flex-wrap gap-4 items-center mb-6">
          <div>
            <label className="font-semibold mr-2">🏠 Lieu :</label>
            <select
              value={selectedLieu}
              onChange={(e) => setSelectedLieu(e.target.value)}
              className="border rounded px-2 py-1"
            >
              {lieux.map((lieu) => (
                <option key={lieu} value={lieu}>
                  {lieu}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold mr-2">📅 Mois :</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border rounded px-2 py-1"
            >
              {months.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold mr-2">🗓️ Année :</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border rounded px-2 py-1"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-4">📊 Statistiques Générales ({selectedLieu})</h2>
      <p className="mb-2">Nombre total de parties : {generalStats.totalParties}</p>

      {/* ✅ TOP 5 jeux les plus joués */}
      <div>
        <h3 className="text-xl font-semibold mb-3">🎮 Top 5 jeux les plus joués</h3>
        <div className="flex flex-wrap gap-4 items-center">
          {generalStats.topGames.map((jeu, index) => (
            <div key={jeu.id} className="relative">
              {jeu.couverture_url ? (
                <img
                  src={jeu.couverture_url}
                  alt={jeu.nom}
                  className="w-20 h-20 object-cover rounded-lg shadow-md border border-gray-300"
                  title={`${jeu.nom} (${jeu.count} parties)`}
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 flex items-center justify-center rounded-lg border text-gray-600">
                  🎲
                </div>
              )}
              <span className="absolute -top-2 -right-2 text-2xl">
                {medalEmojis[index]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-10">🏆 Classement Général</h2>
      {renderBars(generalRanking)}

      <h2 className="text-2xl font-bold mt-10">
        📅 Classement du Mois : {months[selectedMonth - 1]} {selectedYear}
      </h2>
      {renderBars(monthlyStats)}

      <h2 className="text-2xl font-bold mt-10">
        📆 Classement Annuel : {selectedYear}
      </h2>
      {renderBars(yearlyStats)}
    </div>
  );
}
