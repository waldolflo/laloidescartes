import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  Trophy,
  CalendarDays,
  MapPin,
  RotateCcw,
  Dices,
  Medal,
  BarChart3,
  Users,
  Gamepad2,
  Clock3,
} from "lucide-react";

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
  const [selectedLieu, setSelectedLieu] = useState(
    "La loi des cartes"
  );

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    now.getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(
    now.getFullYear()
  );

  const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => now.getFullYear() - i
  );

  // ============================================================
  // COULEUR GÉNÉRALE
  // Même logique que Catalogue / Parties
  // ============================================================

  const couleursStatistiques = [
    "from-purple-950 via-purple-900 to-indigo-950",
    "from-blue-950 via-blue-900 to-indigo-950",
    "from-teal-950 via-teal-900 to-cyan-950",
    "from-green-950 via-green-900 to-emerald-950",
    "from-orange-950 via-orange-900 to-amber-950",
    "from-pink-950 via-pink-900 to-fuchsia-950",
    "from-red-950 via-red-900 to-rose-950",
    "from-indigo-950 via-indigo-900 to-blue-950",
    "from-cyan-950 via-cyan-900 to-blue-950",
    "from-amber-950 via-amber-900 to-orange-950",
  ];

  const jourDuMois = new Date().getDate();

  const couleurStatistiques =
    couleursStatistiques[
      (jourDuMois - 1) % couleursStatistiques.length
    ];

  // ============================================================
  // FETCH ROLE + STATS
  // ============================================================

  useEffect(() => {
    if (!user) return;

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("profils")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!error) {
        setUserRole(data?.role || "");
      }
    };

    fetchRole();
    fetchStats();
  }, [
    user,
    userRole,
    selectedLieu,
    selectedMonth,
    selectedYear,
  ]);

  // ============================================================
  // FETCH STATS
  // ============================================================

  async function fetchStats() {
    try {
      const {
        data: parties,
        error: partiesError,
      } = await supabase
        .from("parties")
        .select("id, jeu_id, date_partie, lieu");

      if (partiesError) throw partiesError;

      const {
        data: jeux,
        error: jeuxError,
      } = await supabase
        .from("jeux")
        .select(
          "id, nom, couverture_url, poids"
        );

      if (jeuxError) throw jeuxError;

      // Utilisateurs avec compte
      const {
        data: users,
        error: userError,
      } = await supabase
        .from("profils")
        .select("id, nom");

      if (userError) throw userError;

      // Joueurs sans compte
      const {
        data: joueurs,
        error: joueursError,
      } = await supabase
        .from("joueurs")
        .select("id, nom, utilisateur_id");

      if (joueursError) throw joueursError;

      // Inscriptions
      const {
        data: inscriptions,
        error: inscriptionsError,
      } = await supabase
        .from("inscriptions")
        .select(
          "partie_id, utilisateur_id, joueur_id, rank"
        );

      if (inscriptionsError) {
        throw inscriptionsError;
      }

      // ============================================================
      // LIEUX
      // ============================================================

      const uniqueLieux = [
        ...new Set(
          parties
            .map((p) => p.lieu)
            .filter(Boolean)
        ),
      ];

      setLieux(uniqueLieux);

      // ============================================================
      // FILTRES
      // ============================================================

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

      // ============================================================
      // CALCUL DES POINTS
      // ============================================================

      const calcPoints = (
        rank,
        poids,
        nbJoueurs
      ) => {
        if (!rank || rank < 1) return 0;

        const basePoints =
          rank === 1
            ? 2.5
            : rank === 2
            ? 2
            : rank === 3
            ? 1.5
            : 1;

        const boostPoids =
          0.5 *
          (
            (Math.sqrt(poids || 1) - 1) /
            (Math.sqrt(5) - 1)
          );

        const boostJoueurs =
          0.1 *
          Math.log(nbJoueurs || 1);

        const multiplier =
          1 +
          boostPoids +
          boostJoueurs;

        return (
          Math.round(
            basePoints *
              multiplier *
              100
          ) / 100
        );
      };

      // ============================================================
      // CALCUL POUR UN PARTICIPANT
      // ============================================================

      const calculatePointsForParticipant = (
        participantType,
        participantId,
        filterFn
      ) => {
        return inscriptions
          .filter((ins) => {
            if (
              participantType === "user"
            ) {
              if (
                ins.utilisateur_id ===
                participantId
              ) {
                return true;
              }

              if (
                ins.joueur_id !== null
              ) {
                const joueurLie =
                  joueurs.find(
                    (j) =>
                      String(j.id) ===
                      String(
                        ins.joueur_id
                      )
                  );

                return (
                  joueurLie?.utilisateur_id ===
                  participantId
                );
              }

              return false;
            }

            if (
              participantType === "player"
            ) {
              if (
                ins.joueur_id === null
              ) {
                return false;
              }

              const joueur =
                joueurs.find(
                  (j) =>
                    String(j.id) ===
                    String(
                      ins.joueur_id
                    )
                );

              return (
                String(
                  ins.joueur_id
                ) ===
                  String(
                    participantId
                  ) &&
                !joueur?.utilisateur_id
              );
            }

            return false;
          })
          .filter((ins) => {
            const partie =
              filteredParties.find(
                (p) =>
                  p.id ===
                  ins.partie_id
              );

            return (
              partie &&
              filterFn(partie)
            );
          })
          .reduce((acc, ins) => {
            const partie =
              filteredParties.find(
                (p) =>
                  p.id ===
                  ins.partie_id
              );

            if (
              !partie ||
              !ins.rank ||
              ins.rank < 1
            ) {
              return acc;
            }

            const jeu = jeux.find(
              (j) =>
                j.id ===
                partie.jeu_id
            );

            const nbJoueurs =
              inscriptions.filter(
                (i) =>
                  i.partie_id ===
                  partie.id
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
      // PARTICIPANTS
      // ============================================================

      const participants = [
        ...users.map((user) => ({
          type: "user",
          id: user.id,
          nom: user.nom,
        })),

        ...joueurs
          .filter(
            (joueur) =>
              !joueur.utilisateur_id
          )
          .map((joueur) => ({
            type: "player",
            id: joueur.id,
            nom: joueur.nom,
          })),
      ];

      // ============================================================
      // STATISTIQUES MENSUELLES
      // ============================================================

      const statsByMonth =
        participants.map(
          (participant) => {
            const points =
              calculatePointsForParticipant(
                participant.type,
                participant.id,
                (p) => {
                  const d =
                    new Date(
                      p.date_partie
                    );

                  return (
                    d.getMonth() + 1 ===
                      mois &&
                    d.getFullYear() ===
                      annee
                  );
                }
              );

            return {
              nom:
                participant.type ===
                "user"
                  ? `👤 ${participant.nom}`
                  : `🎭 ${participant.nom}`,
              points,
            };
          }
        );

      // ============================================================
      // STATISTIQUES ANNUELLES
      // ============================================================

      const statsByYear =
        participants.map(
          (participant) => {
            const points =
              calculatePointsForParticipant(
                participant.type,
                participant.id,
                (p) => {
                  const d =
                    new Date(
                      p.date_partie
                    );

                  return (
                    d.getFullYear() ===
                    annee
                  );
                }
              );

            return {
              nom:
                participant.type ===
                "user"
                  ? `👤 ${participant.nom}`
                  : `🎭 ${participant.nom}`,
              points,
            };
          }
        );

      setMonthlyStats(
        statsByMonth.sort(
          (a, b) =>
            b.points - a.points
        )
      );

      setYearlyStats(
        statsByYear.sort(
          (a, b) =>
            b.points - a.points
        )
      );

      // ============================================================
      // STATS GÉNÉRALES
      // ============================================================

      const totalParties =
        filteredParties.length;

      const gameCounts =
        filteredParties.reduce(
          (acc, p) => {
            acc[p.jeu_id] =
              (acc[p.jeu_id] || 0) + 1;

            return acc;
          },
          {}
        );

      const topGames =
        Object.entries(gameCounts)
          .sort(
            (a, b) =>
              b[1] - a[1]
          )
          .slice(0, 10)
          .map(
            ([jeuId, count]) => {
              const jeu =
                jeux.find(
                  (j) =>
                    j.id === jeuId
                );

              return {
                id: jeuId,
                nom:
                  jeu?.nom || "?",
                couverture_url:
                  jeu?.couverture_url,
                count,
              };
            }
          );

      setGeneralStats({
        totalParties,
        topGames,
      });

      // ============================================================
      // CLASSEMENT GÉNÉRAL
      // ============================================================

      const ranking =
        participants.map(
          (participant) => ({
            nom:
              participant.type ===
              "user"
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
          (a, b) =>
            b.points - a.points
        )
      );
    } catch (err) {
      console.error(
        "Erreur fetchStats :",
        err
      );
    }
  }

  // ============================================================
  // RESET
  // ============================================================

  const resetFilters = () => {
    setSelectedLieu(
      "La loi des cartes"
    );

    setSelectedMonth(
      now.getMonth() + 1
    );

    setSelectedYear(
      now.getFullYear()
    );
  };

  // ============================================================
  // BARRES
  // ============================================================

  const renderBars = (data) => {
    const maxValue =
      Math.max(
        ...data.map((d) =>
          Number(
            d.points.toFixed(2)
          )
        ),
        1
      );

    const maxValueZero =
      Math.max(
        ...data.map((d) =>
          Number(
            d.points.toFixed(2)
          )
        ),
        0
      );

    if (maxValueZero === 0) {
      return (
        <div className="py-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
            <Trophy size={28} />
          </div>

          <p className="mt-3 text-sm font-semibold text-gray-500">
            Aucun score disponible.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {data
          .filter(
            (d) =>
              d.points &&
              Number(
                d.points.toFixed(2)
              ) !== 0
          )
          .map((d, index) => (
            <div
              key={d.nom}
              className="flex items-center gap-3"
            >
              {/* Position */}
              <div className="w-8 flex-shrink-0 text-center">
                {index < 3 ? (
                  <span className="text-lg">
                    {
                      [
                        "🥇",
                        "🥈",
                        "🥉",
                      ][index]
                    }
                  </span>
                ) : (
                  <span className="text-xs font-black text-gray-400">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Nom */}
              <div className="w-32 sm:w-40 flex-shrink-0 truncate">
                <span className="text-sm font-bold text-gray-700">
                  {d.nom}
                </span>
              </div>

              {/* Barre */}
              <div className="flex-1 h-8 bg-gray-100 rounded-xl overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500"
                  style={{
                    width: `${
                      (Number(
                        d.points.toFixed(
                          2
                        )
                      ) /
                        maxValue) *
                      100
                    }%`,
                  }}
                />
              </div>

              {/* Score */}
              <div className="w-14 flex-shrink-0 text-right">
                <span className="text-sm font-black text-gray-900">
                  {d.points.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
      </div>
    );
  };

  // ============================================================
  // MÉDAILLES
  // ============================================================

  const medalEmojis = [
    "🥇",
    "🥈",
    "🥉",
    "🏅",
    "🎖️",
  ];

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <div className="min-h-screen px-4 py-6 md:px-6">

      {/* ========================================================
          EN-TÊTE
      ======================================================== */}

      <section
        className={`relative max-w-7xl mx-auto overflow-hidden rounded-[2rem] shadow-2xl bg-gradient-to-br ${couleurStatistiques}`}
      >

        {/* Décor */}

        <div className="absolute inset-0 overflow-hidden pointer-events-none">

          <img
            src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
            alt=""
            className="absolute -right-24 top-1/4 w-[500px] opacity-[0.035] rotate-[-12deg]"
          />

          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-3xl" />

          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-fuchsia-500/10 blur-3xl" />

        </div>

        <div className="relative px-5 py-7 md:px-10 md:py-9">

          <div className="flex flex-col lg:flex-row lg:items-center gap-6">

            {/* Logo */}

            <div className="flex-shrink-0 flex justify-center lg:justify-start">

              <div className="bg-white rounded-2xl px-5 py-3 shadow-2xl">

                <img
                  src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
                  alt="La Loi des Cartes"
                  className="h-20 md:h-24 w-auto object-contain"
                />

              </div>

            </div>

            {/* Texte */}

            <div className="flex-1 text-center lg:text-left">

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-purple-200 text-xs md:text-sm font-bold uppercase tracking-[0.18em]">
                <BarChart3 size={16} />
                La Loi des Cartes
              </div>

              <h1 className="mt-3 text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                STATISTIQUES
                <span className="block text-purple-300">
                  DU CLUB
                </span>
              </h1>

              <p className="mt-3 text-purple-100 text-base md:text-lg">
                Retrouvez les classements,
                les parties jouées et les
                jeux les plus populaires.
              </p>

            </div>

            {/* Statistiques */}

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">

              <div className="inline-flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white text-indigo-900 font-black shadow-xl">

                <Trophy size={20} />

                <span>
                  {generalStats.totalParties} partie
                  {generalStats.totalParties > 1
                    ? "s"
                    : ""}
                </span>

              </div>

              <div className="inline-flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold">

                <MapPin size={19} />

                <span className="truncate max-w-[180px]">
                  {selectedLieu}
                </span>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* ========================================================
          STATISTIQUES GÉNÉRALES
      ======================================================== */}

      <div className="max-w-7xl mx-auto mt-8">

        <div className="mb-4">

          <h2 className="text-xl md:text-2xl font-black text-gray-900">
            Statistiques générales
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Activité du club à{" "}
            <span className="font-bold">
              {selectedLieu}
            </span>
          </p>

        </div>

        {/* Cartes chiffres */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 flex items-center gap-4">

            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Gamepad2 size={24} />
            </div>

            <div>

              <p className="text-xs uppercase tracking-wide font-bold text-gray-400">
                Parties jouées
              </p>

              <p className="text-2xl font-black text-gray-900">
                {generalStats.totalParties}
              </p>

            </div>

          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 flex items-center gap-4">

            <div className="w-12 h-12 rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center flex-shrink-0">
              <Trophy size={24} />
            </div>

            <div>

              <p className="text-xs uppercase tracking-wide font-bold text-gray-400">
                Top jeux
              </p>

              <p className="text-2xl font-black text-gray-900">
                {generalStats.topGames.length}
              </p>

            </div>

          </div>

        </div>

        {/* ======================================================
            TOP 5
        ====================================================== */}

        <div className="bg-white rounded-[1.5rem] shadow-lg border border-gray-100 overflow-hidden">

          <div className="p-5 border-b border-gray-100">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Dices size={20} />
              </div>

              <div>

                <h3 className="text-lg font-black text-gray-900">
                  Top 10 jeux les plus joués
                </h3>

                <p className="text-sm text-gray-500">
                  Les jeux les plus présents
                  sur ce lieu
                </p>

              </div>

            </div>

          </div>

          <div className="p-5">

            {generalStats.topGames.length > 0 ? (

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">

                {generalStats.topGames.map(
                  (jeu, index) => (
                    <div
                      key={jeu.id}
                      className="group relative"
                    >

                      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden border border-gray-100 shadow-md">

                        {jeu.couverture_url ? (
                          <img
                            src={
                              jeu.couverture_url
                            }
                            alt={
                              jeu.nom
                            }
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                            <Dices
                              size={36}
                            />
                          </div>
                        )}

                        <span className="absolute -top-1 -right-1 text-3xl drop-shadow-md">
                          {
                            medalEmojis[
                              index
                            ]
                          }
                        </span>

                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">

                          <p className="text-white text-sm font-black truncate">
                            {jeu.nom}
                          </p>

                          <p className="text-white/80 text-xs font-semibold">
                            {jeu.count} partie
                            {jeu.count > 1
                              ? "s"
                              : ""}
                          </p>

                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>

            ) : (

              <div className="py-8 text-center text-gray-400">
                <Dices
                  size={32}
                  className="mx-auto"
                />

                <p className="mt-2 text-sm">
                  Aucune partie enregistrée.
                </p>
              </div>

            )}

          </div>

        </div>

      </div>

      {/* ========================================================
          CLASSEMENT DU MOIS
      ======================================================== */}

      <div className="max-w-7xl mx-auto mt-8">

        <div className="bg-white rounded-[1.5rem] shadow-lg border border-gray-100 overflow-hidden">

          <div className="p-5 border-b border-gray-100">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <CalendarDays size={20} />
              </div>

              <div>

                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Classement du mois
                </h2>

                <p className="text-sm text-gray-500">
                  {months[
                    selectedMonth - 1
                  ]}{" "}
                  {selectedYear}
                </p>

              </div>

            </div>

          </div>

          <div className="p-5">
            {renderBars(
              monthlyStats
            )}
          </div>

        </div>

      </div>

      {/* ========================================================
          CLASSEMENT ANNUEL
      ======================================================== */}

      <div className="max-w-7xl mx-auto mt-6">

        <div className="bg-white rounded-[1.5rem] shadow-lg border border-gray-100 overflow-hidden">

          <div className="p-5 border-b border-gray-100">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <BarChart3 size={20} />
              </div>

              <div>

                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Classement annuel
                </h2>

                <p className="text-sm text-gray-500">
                  Saison {selectedYear}
                </p>

              </div>

            </div>

          </div>

          <div className="p-5">
            {renderBars(
              yearlyStats
            )}
          </div>

        </div>

      </div>

      {/* ========================================================
          CLASSEMENT GÉNÉRAL
      ======================================================== */}

      <div className="max-w-7xl mx-auto mt-6 mb-8">

        <div className="bg-white rounded-[1.5rem] shadow-lg border border-gray-100 overflow-hidden">

          <div className="p-5 border-b border-gray-100">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center">
                <Trophy size={20} />
              </div>

              <div>

                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Classement général
                </h2>

                <p className="text-sm text-gray-500">
                  Toutes les parties
                  enregistrées
                </p>

              </div>

            </div>

          </div>

          <div className="p-5">
            {renderBars(
              generalRanking
            )}
          </div>

        </div>

      </div>
      {/* ========================================================
          FILTRES ADMIN
      ======================================================== */}

      {userRole === "admin" && (
        <div className="max-w-7xl mx-auto mt-6">

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-3">

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">

              {/* Lieu */}

              <div>

                <label className="block mb-1.5 text-sm font-bold text-gray-700">
                  Lieu
                </label>

                <div className="relative">

                  <MapPin
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />

                  <select
                    value={selectedLieu}
                    onChange={(e) =>
                      setSelectedLieu(
                        e.target.value
                      )
                    }
                    className="appearance-none w-full pl-10 pr-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition cursor-pointer"
                  >
                    {lieux.map(
                      (lieu) => (
                        <option
                          key={lieu}
                          value={lieu}
                        >
                          {lieu}
                        </option>
                      )
                    )}
                  </select>

                </div>

              </div>

              {/* Mois */}

              <div>

                <label className="block mb-1.5 text-sm font-bold text-gray-700">
                  Mois
                </label>

                <div className="relative">

                  <CalendarDays
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />

                  <select
                    value={selectedMonth}
                    onChange={(e) =>
                      setSelectedMonth(
                        parseInt(
                          e.target.value
                        )
                      )
                    }
                    className="appearance-none w-full pl-10 pr-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition cursor-pointer"
                  >
                    {months.map(
                      (m, i) => (
                        <option
                          key={i + 1}
                          value={i + 1}
                        >
                          {m}
                        </option>
                      )
                    )}
                  </select>

                </div>

              </div>

              {/* Année */}

              <div>

                <label className="block mb-1.5 text-sm font-bold text-gray-700">
                  Année
                </label>

                <div className="relative">

                  <CalendarDays
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />

                  <select
                    value={selectedYear}
                    onChange={(e) =>
                      setSelectedYear(
                        parseInt(
                          e.target.value
                        )
                      )
                    }
                    className="appearance-none w-full pl-10 pr-3 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition cursor-pointer"
                  >
                    {years.map(
                      (y) => (
                        <option
                          key={y}
                          value={y}
                        >
                          {y}
                        </option>
                      )
                    )}
                  </select>

                </div>

              </div>

              {/* Reset */}

              <button
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition"
              >
                <RotateCcw size={18} />
                Réinitialiser
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}