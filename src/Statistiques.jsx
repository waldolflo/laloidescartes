import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Statistiques({ user }) {
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [yearlyStats, setYearlyStats] = useState([]);
  const [generalStats, setGeneralStats] = useState({
    totalParties: 0,
    topGames: [],
  });
  const [generalRanking, setGeneralRanking] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [lieux, setLieux] = useState([]);
  const [selectedLieu, setSelectedLieu] = useState("La loi des cartes");

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  // -------------------
  // 🎭 FETCH ROLE UTILISATEUR 📊 FETCH STATS
  // -------------------
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
    fetchStats();
  }, [user, userRole, selectedLieu, selectedMonth, selectedYear]);

  // -------------------
  // 🧮 FONCTION fetchStats
  // -------------------
  async function fetchStats() {
    try {
      const { data: parties, error: partiesError } = await supabase
        .from("parties")
        .select("id, jeu_id, date_partie, lieu");

      if (partiesError) throw partiesError;

      const { data: jeux, error: jeuxError } = await supabase
        .from("jeux")
        .select("id, nom, couverture_url, poids");

      if (jeuxError) throw jeuxError;

      // 👤 Utilisateurs avec compte
      const { data: users, error: userError } = await supabase
        .from("profils")
        .select("id, nom");

      if (userError) throw userError;

      // 🎭 Joueurs sans compte
      // On récupère TOUS les joueurs afin de conserver
      // les statistiques historiques des joueurs désactivés.
      // utilisateur_id permet de savoir si le joueur fictif
      // est maintenant lié à un vrai compte.
      const { data: joueurs, error: joueursError } = await supabase
        .from("joueurs")
        .select("id, nom, utilisateur_id");

      if (joueursError) throw joueursError;

      // 🎲 Toutes les inscriptions
      // On récupère maintenant utilisateur_id ET joueur_id
      const { data: inscriptions, error: inscriptionsError } =
        await supabase
          .from("inscriptions")
          .select("partie_id, utilisateur_id, joueur_id, rank");

      if (inscriptionsError) throw inscriptionsError;

      // 🎯 Extraire les lieux uniques
      const uniqueLieux = [
        ...new Set(
          parties
            .map((p) => p.lieu)
            .filter(Boolean)
        ),
      ];

      setLieux(uniqueLieux);

      // 🔹 Si pas admin → forcer les valeurs par défaut
      const lieu =
        userRole === "admin"
          ? selectedLieu
          : "La loi des cartes";

      const mois =
        userRole === "admin"
          ? selectedMonth
          : now.getMonth() + 1;

      const annee =
        userRole === "admin"
          ? selectedYear
          : now.getFullYear();

      const filteredParties = parties.filter(
        (p) => p.lieu === lieu
      );

      // 🧮 Calcul des points
      const calcPoints = (rank, poids, nbJoueurs) => {
        if (!rank || rank < 1) return 0;

        const basePoints =
          rank === 1 ? 2.5 :
          rank === 2 ? 2 :
          rank === 3 ? 1.5 :
          1;

        const boostPoids =
          0.5 *
          (
            (Math.sqrt(poids || 1) - 1) /
            (Math.sqrt(5) - 1)
          );

        const boostJoueurs =
          0.1 * Math.log(nbJoueurs || 1);

        const multiplier =
          1 + boostPoids + boostJoueurs;

        return Math.round(
          basePoints * multiplier * 100
        ) / 100;
      };

      // ============================================================
      // 🧮 CALCUL DES POINTS POUR UN PARTICIPANT
      // ============================================================
      //
      // Un participant peut être :
      //
      // utilisateur_id = UUID
      // joueur_id      = BIGINT
      //
      // Si un joueur fictif est lié à un vrai utilisateur,
      // ses anciennes inscriptions joueur_id sont comptabilisées
      // dans les statistiques du vrai utilisateur.
      // ============================================================

      const calculatePointsForParticipant = (
        participantType,
        participantId,
        filterFn
      ) => {
        return inscriptions
          .filter((ins) => {
            if (participantType === "user") {
              // Inscription directement liée au vrai compte
              if (ins.utilisateur_id === participantId) {
                return true;
              }

              // Ou ancienne inscription faite avec le faux compte
              // désormais lié à ce vrai compte.
              if (ins.joueur_id !== null) {
                const joueurLie = joueurs.find(
                  (j) =>
                    String(j.id) === String(ins.joueur_id)
                );

                return (
                  joueurLie?.utilisateur_id === participantId
                );
              }

              return false;
            }

            if (participantType === "player") {
              // Un faux compte n'est considéré comme participant
              // indépendant que s'il n'est pas encore lié à un
              // vrai compte.
              if (ins.joueur_id === null) {
                return false;
              }

              const joueur = joueurs.find(
                (j) =>
                  String(j.id) === String(ins.joueur_id)
              );

              return (
                String(ins.joueur_id) === String(participantId) &&
                !joueur?.utilisateur_id
              );
            }

            return false;
          })
          .filter((ins) => {
            const partie = filteredParties.find(
              (p) => p.id === ins.partie_id
            );

            return partie && filterFn(partie);
          })
          .reduce((acc, ins) => {
            const partie = filteredParties.find(
              (p) => p.id === ins.partie_id
            );

            if (
              !partie ||
              !ins.rank ||
              ins.rank < 1
            ) {
              return acc;
            }

            const jeu = jeux.find(
              (j) => j.id === partie.jeu_id
            );

            // 👥 Le nombre de joueurs comprend maintenant
            // utilisateurs + joueurs sans compte
            const nbJoueurs = inscriptions.filter(
              (i) => i.partie_id === partie.id
            ).length;

            return (
              acc +
              calcPoints(
                ins.rank,
                jeu?.poids,
                nbJoueurs
              )
            );
          }, 0);
      };

      // ============================================================
      // 👥 LISTE UNIFIÉE DES PARTICIPANTS
      // ============================================================
      //
      // Les joueurs fictifs liés à un vrai compte ne sont plus
      // affichés séparément : leurs statistiques sont fusionnées
      // avec celles du vrai compte.
      // ============================================================

      const participants = [
        // 👤 Utilisateurs
        ...users.map((user) => ({
          type: "user",
          id: user.id,
          nom: user.nom,
        })),

        // 🎭 Joueurs sans compte
        // On conserve uniquement les joueurs qui ne sont pas
        // encore liés à un vrai compte.
        ...joueurs
          .filter((joueur) => !joueur.utilisateur_id)
          .map((joueur) => ({
            type: "player",
            id: joueur.id,
            nom: joueur.nom,
          })),
      ];

      // ============================================================
      // 📅 STATISTIQUES MENSUELLES
      // ============================================================

      const statsByMonth = participants.map((participant) => {
        const points = calculatePointsForParticipant(
          participant.type,
          participant.id,
          (p) => {
            const d = new Date(p.date_partie);

            return (
              d.getMonth() + 1 === mois &&
              d.getFullYear() === annee
            );
          }
        );

        return {
          nom: participant.type === "user"
            ? `👤 ${participant.nom}`
            : `🎭 ${participant.nom}`,
          points,
        };
      });

      // ============================================================
      // 📆 STATISTIQUES ANNUELLES
      // ============================================================

      const statsByYear = participants.map((participant) => {
        const points = calculatePointsForParticipant(
          participant.type,
          participant.id,
          (p) => {
            const d = new Date(p.date_partie);

            return d.getFullYear() === annee;
          }
        );

        return {
          nom: participant.type === "user"
            ? `👤 ${participant.nom}`
            : `🎭 ${participant.nom}`,
          points,
        };
      });

      setMonthlyStats(
        statsByMonth.sort(
          (a, b) => b.points - a.points
        )
      );

      setYearlyStats(
        statsByYear.sort(
          (a, b) => b.points - a.points
        )
      );

      // --- Statistiques générales ---
      const totalParties = filteredParties.length;

      const gameCounts = filteredParties.reduce(
        (acc, p) => {
          acc[p.jeu_id] =
            (acc[p.jeu_id] || 0) + 1;

          return acc;
        },
        {}
      );

      const topGames = Object.entries(gameCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([jeuId, count]) => {
          const jeu = jeux.find(
            (j) => j.id === jeuId
          );

          return {
            id: jeuId,
            nom: jeu?.nom || "?",
            couverture_url:
              jeu?.couverture_url,
            count,
          };
        });

      setGeneralStats({
        totalParties,
        topGames,
      });

      // ============================================================
      // 🏆 CLASSEMENT GÉNÉRAL
      // ============================================================

      const ranking = participants.map(
        (participant) => ({
          nom: participant.type === "user"
            ? `👤 ${participant.nom}`
            : `🎭 ${participant.nom}`,

          points:
            calculatePointsForParticipant(
              participant.type,
              participant.id,
              () => true
            ),
        })
      );

      setGeneralRanking(
        ranking.sort(
          (a, b) => b.points - a.points
        )
      );

    } catch (err) {
      console.error(
        "Erreur fetchStats :",
        err
      );
    }
  }

  // -------------------
  // 🔄 RESET DES FILTRES
  // -------------------
  const resetFilters = () => {
    setSelectedLieu("La loi des cartes");
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  // -------------------
  // 📈 AFFICHAGE DES BARRES
  // -------------------
  const renderBars = (data) => {
    const maxValue = Math.max(
      ...data.map((d) =>
        Number(d.points.toFixed(2))
      ),
      1
    );

    const maxValueZero = Math.max(
      ...data.map((d) =>
        Number(d.points.toFixed(2))
      ),
      0
    );

    // Si maxValue est 0 (aucun score), on n'affiche rien
    if (maxValueZero === 0)
      return (
        <div className="space-y-2">
          <p className="text-gray-500">
            Aucun score disponible.
          </p>
        </div>
      );

    return (
      <div className="space-y-2">
        {data
          // On n'affiche que les joueurs ayant des points non nuls
          .filter(
            (d) =>
              d.points &&
              Number(d.points.toFixed(2)) !== 0
          )
          .map((d) => (
            <div
              key={d.nom}
              className="flex items-center space-x-2"
            >
              <span className="w-32 truncate">
                {d.nom}
              </span>

              <div className="bg-gray-300 h-6 flex-1 rounded overflow-hidden">
                <div
                  className="bg-green-500 h-6 rounded"
                  style={{
                    width: `${
                      (
                        Number(
                          d.points.toFixed(2)
                        ) / maxValue
                      ) * 100
                    }%`,
                  }}
                ></div>
              </div>

              <span className="w-12 text-right">
                {d.points.toFixed(2)}
              </span>
            </div>
          ))}
      </div>
    );
  };

  // -------------------
  // 🏅 RENDU FINAL
  // -------------------
  const medalEmojis = [
    "🥇",
    "🥈",
    "🥉",
    "🏅",
    "🎖️",
  ];

  return (
    <div className="p-6 space-y-6">

      <h2 className="text-2xl font-bold mb-4">
        📊 Statistiques Générales ({selectedLieu})
      </h2>

      <p className="mb-2">
        Nombre total de parties :{" "}
        {generalStats.totalParties}
      </p>

      {/* ✅ TOP 5 jeux les plus joués */}
      <div>
        <h3 className="text-xl font-semibold mb-3">
          🎮 Top 5 jeux les plus joués
        </h3>

        <div className="flex flex-wrap gap-4 items-center">

          {generalStats.topGames.map(
            (jeu, index) => (
              <div
                key={jeu.id}
                className="relative"
              >
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
            )
          )}

        </div>
      </div>

      <h2 className="text-2xl font-bold mt-10">
        📅 Classement du Mois :{" "}
        {months[selectedMonth - 1]}{" "}
        {selectedYear}
      </h2>

      {renderBars(monthlyStats)}

      <h2 className="text-2xl font-bold mt-10">
        📆 Classement Annuel :{" "}
        {selectedYear}
      </h2>

      {renderBars(yearlyStats)}

      <h2 className="text-2xl font-bold mt-10">
        🏆 Classement Général
      </h2>

      {renderBars(generalRanking)}

      {/* 🎯 Filtres (admin uniquement) */}
      {userRole === "admin" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end mb-8">

          <div>
            <label className="block text-sm font-semibold mb-1">
              🏠 Lieu
            </label>

            <select
              value={selectedLieu}
              onChange={(e) =>
                setSelectedLieu(e.target.value)
              }
              className="border rounded px-2 py-1 w-full"
            >
              {lieux.map((lieu) => (
                <option
                  key={lieu}
                  value={lieu}
                >
                  {lieu}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              📅 Mois
            </label>

            <select
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(
                  parseInt(e.target.value)
                )
              }
              className="border rounded px-2 py-1 w-full"
            >
              {months.map((m, i) => (
                <option
                  key={i + 1}
                  value={i + 1}
                >
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              🗓️ Année
            </label>

            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(
                  parseInt(e.target.value)
                )
              }
              className="border rounded px-2 py-1 w-full"
            >
              {years.map((y) => (
                <option
                  key={y}
                  value={y}
                >
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* <button 
            onClick={fetchStats} 
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition" 
          > 
            🔄 Actualiser 
          </button> */}

          <button
            onClick={resetFilters}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
          >
            ♻️ Réinitialiser
          </button>

        </div>
      )}
    </div>
  );
}