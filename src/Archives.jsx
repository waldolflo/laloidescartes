import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import RankModal from "./RankModal";
import {
  Search,
  Archive,
  CalendarDays,
  Clock3,
  MapPin,
  Users,
  Trophy,
  Medal,
  Gamepad2,
  X,
  SlidersHorizontal,
  Crown,
} from "lucide-react";

export default function Archives({ user, authUser }) {
  const currentUser = user || authUser;

  const [archives, setArchives] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLieu, setSelectedLieu] = useState("La loi des cartes");
  const [selectedPartieForRank, setSelectedPartieForRank] =
    useState(null);

  // ============================================================
  // COULEUR GÉNÉRALE
  // Même logique que l'agenda et les parties
  // ============================================================

  const couleursArchives = [
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

  const couleurArchives =
    couleursArchives[
      (jourDuMois - 1) % couleursArchives.length
    ];

  // ============================================================
  // FETCH ROLE
  // ============================================================

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchRole = async () => {
      const { data } = await supabase
        .from("profils")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      setUserRole(data?.role || "");
    };

    fetchRole();
  }, [currentUser]);

  // ============================================================
  // FETCH PARTIES PASSÉES
  // ============================================================

  useEffect(() => {
    fetchPast();
  }, []);

  const fetchPast = async () => {
    try {
      // 1️⃣ Récupérer toutes les parties
      const {
        data: partiesData,
        error: errorParties,
      } = await supabase
        .from("parties")
        .select(
          "*, jeux(*), organisateur:profils!parties_utilisateur_id_fkey(id, nom)"
        )
        .order("date_partie", { ascending: true });

      if (errorParties) throw errorParties;

      const now = new Date();

      const pastParties = (partiesData || []).filter(
        (p) =>
          new Date(
            `${p.date_partie}T${p.heure_partie}`
          ) < now
      );

      // S'il n'y a aucune partie passée
      if (pastParties.length === 0) {
        setArchives([]);
        return;
      }

      // 2️⃣ Récupérer toutes les inscriptions
      const partieIds = pastParties.map((p) => p.id);

      const {
        data: insData,
        error: errorInscriptions,
      } = await supabase
        .from("inscriptions")
        .select(
          "id, utilisateur_id, joueur_id, partie_id, rank, score"
        )
        .in("partie_id", partieIds);

      if (errorInscriptions) throw errorInscriptions;

      const inscriptions = insData || [];

      // 3️⃣ Récupérer uniquement les profils
      // des vrais utilisateurs
      const userIds = [
        ...new Set(
          inscriptions
            .map((i) => i.utilisateur_id)
            .filter(Boolean)
        ),
      ];

      let profilsData = [];

      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from("profils")
          .select("id, nom")
          .in("id", userIds);

        if (error) throw error;

        profilsData = data || [];
      }

      // 4️⃣ Récupérer les joueurs sans compte
      const joueurIds = [
        ...new Set(
          inscriptions
            .map((i) => i.joueur_id)
            .filter(Boolean)
        ),
      ];

      let joueursData = [];

      if (joueurIds.length > 0) {
        const { data, error } = await supabase
          .from("joueurs")
          .select("id, nom")
          .in("id", joueurIds);

        if (error) throw error;

        joueursData = data || [];
      }

      // 5️⃣ Assembler les inscriptions
      const inscritsMap = inscriptions.reduce(
        (acc, i) => {
          const profil = profilsData.find(
            (u) => u.id === i.utilisateur_id
          );

          const joueur = joueursData.find(
            (j) => j.id === i.joueur_id
          );

          const partieList =
            acc[i.partie_id] || [];

          partieList.push({
            ...i,
            profil: profil || null,
            joueur: joueur || null,
          });

          acc[i.partie_id] = partieList;

          return acc;
        },
        {}
      );

      // 6️⃣ Ajouter les inscriptions aux parties
      const fullPast = pastParties.map((p) => ({
        ...p,
        inscrits: inscritsMap[p.id] || [],
      }));

      // 7️⃣ Trier par date décroissante
      fullPast.sort(
        (a, b) =>
          new Date(
            `${b.date_partie}T${b.heure_partie}`
          ) -
          new Date(
            `${a.date_partie}T${a.heure_partie}`
          )
      );

      setArchives(fullPast);
    } catch (err) {
      console.error("Erreur fetchPast :", err);
    }
  };

  // ============================================================
  // FORMATAGE
  // ============================================================

  const formatDate = (d) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(
      "fr-FR",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

  const formatHeure = (t) =>
    t ? t.slice(0, 5) : "";

  // ============================================================
  // RECHERCHE
  // ============================================================

  const filterSearch = (list) => {
    const s = search.toLowerCase();

    return list.filter(
      (p) =>
        p.jeux?.nom?.toLowerCase().includes(s) ||
        p.nom?.toLowerCase().includes(s) ||
        p.lieu?.toLowerCase().includes(s) ||
        p.organisateur?.nom
          ?.toLowerCase()
          .includes(s) ||
        formatDate(p.date_partie)
          .toLowerCase()
          .includes(s)
    );
  };

  // ============================================================
  // LIEUX
  // ============================================================

  const lieux = [
    "Tous",
    ...new Set(
      archives.map(
        (p) => p.lieu || "Inconnu"
      )
    ),
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
        className={`relative max-w-7xl mx-auto overflow-hidden rounded-[2rem] shadow-2xl bg-gradient-to-br ${couleurArchives}`}
      >

        {/* DÉCOR */}
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

            {/* LOGO */}
            <div className="flex-shrink-0 flex justify-center lg:justify-start">

              <div className="bg-white rounded-2xl px-5 py-3 shadow-2xl">

                <img
                  src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
                  alt="La Loi des Cartes"
                  className="h-20 md:h-24 w-auto object-contain"
                />

              </div>

            </div>

            {/* TITRE */}
            <div className="flex-1 text-center lg:text-left">

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-purple-200 text-xs md:text-sm font-bold uppercase tracking-[0.18em]">

                <Archive size={16} />

                La Loi des Cartes

              </div>

              <h1 className="mt-3 text-4xl md:text-5xl font-black text-white tracking-tight leading-none">

                ARCHIVES

                <span className="block text-purple-300">
                  DES PARTIES
                </span>

              </h1>

              <p className="mt-3 text-purple-100 text-base md:text-lg">

                Retrouvez l'historique des parties,
                leurs joueurs et leurs classements.

              </p>

            </div>

            {/* STATISTIQUE */}
            <div className="flex justify-center">

              <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">

                <div className="text-3xl font-black text-white">
                  {archives.length}
                </div>

                <div className="text-xs uppercase tracking-wider text-purple-200 font-bold">
                  parties archivées
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          FILTRES
          ======================================================== */}

      <div className="max-w-7xl mx-auto mt-6">

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">

          <div className="flex flex-col lg:flex-row gap-3">

            {/* RECHERCHE */}

            <div className="relative flex-1">

              <Search
                size={21}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Rechercher un jeu, une partie, un joueur, un lieu..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />

              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition"
                  aria-label="Effacer la recherche"
                >
                  <X size={16} />
                </button>
              )}

            </div>

            {/* FILTRE LIEU */}

            <div className="relative lg:w-64">

              <SlidersHorizontal
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 pointer-events-none"
              />

              <select
                value={selectedLieu}
                onChange={(e) =>
                  setSelectedLieu(e.target.value)
                }
                className="w-full appearance-none pl-11 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              >
                {lieux.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

            </div>

          </div>

        </div>

      </div>

      {/* ========================================================
          TITRE RESULTATS
          ======================================================== */}

      <div className="max-w-7xl mx-auto mt-8 mb-4">

        <h2 className="text-xl md:text-2xl font-black text-gray-900">
          Historique des parties
        </h2>

        <p className="text-sm text-gray-500 mt-1">

          {filterSearch(
            archives.filter(
              (p) =>
                selectedLieu === "Tous" ||
                p.lieu === selectedLieu
            )
          ).length}{" "}
          partie
          {filterSearch(
            archives.filter(
              (p) =>
                selectedLieu === "Tous" ||
                p.lieu === selectedLieu
            )
          ).length > 1
            ? "s"
            : ""}{" "}
          affichée
          {filterSearch(
            archives.filter(
              (p) =>
                selectedLieu === "Tous" ||
                p.lieu === selectedLieu
            )
          ).length > 1
            ? "s"
            : ""}

        </p>

      </div>

      {/* ========================================================
          LISTE
          ======================================================== */}

      <div className="max-w-7xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

        {filterSearch(
          archives.filter(
            (p) =>
              selectedLieu === "Tous" ||
              p.lieu === selectedLieu
          )
        ).map((p) => {

          // Copie avant tri pour ne pas modifier directement
          // le tableau d'origine
          const classement = [
            ...(p.inscrits || []),
          ].sort(
            (a, b) =>
              (a.rank || 999) -
              (b.rank || 999)
          );

          return (
            <div
              key={p.id}
              className="group relative bg-white rounded-[1.5rem] shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >

              {/* ==================================================
                  BANDEAU SUPÉRIEUR
                  ================================================== */}

              <div className="h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />

              {/* ==================================================
                  IMAGE
                  ================================================== */}

              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-4">

                {p.jeux?.couverture_url ? (

                  <img
                    src={p.jeux.couverture_url}
                    alt={p.jeux.nom}
                    className="w-full h-48 object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                  />

                ) : (

                  <div className="h-48 flex flex-col items-center justify-center text-gray-300">

                    <Gamepad2 size={48} />

                    <span className="mt-2 text-sm font-semibold">
                      Pas d'image
                    </span>

                  </div>

                )}

                {/* BADGE ARCHIVE */}

                <div className="absolute top-5 left-5">

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900/80 backdrop-blur-sm text-white text-xs font-bold shadow-lg">

                    <Archive size={13} />

                    Archivée

                  </span>

                </div>

              </div>

              {/* ==================================================
                  CONTENU
                  ================================================== */}

              <div className="p-5">

                {/* NOM DU JEU */}

                <h3 className="text-xl font-black text-gray-900 text-center leading-tight">

                  {p.jeux?.nom}

                </h3>

                {/* DATE */}

                <div className="mt-4 flex items-center gap-3 bg-purple-50 rounded-xl px-3 py-2.5">

                  <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0">

                    <CalendarDays size={18} />

                  </div>

                  <div className="min-w-0">

                    <p className="text-xs font-bold uppercase tracking-wide text-purple-500">
                      Date
                    </p>

                    <p className="text-sm font-black text-gray-800 capitalize">
                      {formatDate(p.date_partie)}
                    </p>

                  </div>

                </div>

                {/* HEURE */}

                <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">

                  <Clock3
                    size={17}
                    className="text-indigo-600 flex-shrink-0"
                  />

                  <div>

                    <p className="text-[10px] uppercase font-bold text-gray-400">
                      Heure
                    </p>

                    <p className="text-sm font-black text-gray-800">
                      {formatHeure(p.heure_partie)}
                    </p>

                  </div>

                </div>

                {/* ORGANISATEUR / LIEU */}

                <div className="mt-3 space-y-2">

                  {p.organisateur?.nom && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 px-1">

                      <Users
                        size={17}
                        className="text-purple-600 flex-shrink-0"
                      />

                      <span>
                        Organisé par{" "}
                        <strong className="text-gray-800">
                          {p.organisateur.nom}
                        </strong>
                      </span>

                    </div>
                  )}

                  {p.lieu && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 px-1">

                      <MapPin
                        size={17}
                        className="text-purple-600 flex-shrink-0"
                      />

                      <span className="font-semibold">
                        {p.lieu}
                      </span>

                    </div>
                  )}

                </div>

                {/* DESCRIPTION */}

                {p.description && (
                  <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5">

                    <p className="text-sm text-gray-600 leading-relaxed">
                      {p.description}
                    </p>

                  </div>
                )}

                {/* ==================================================
                    CLASSEMENT
                    ================================================== */}

                {classement.length > 0 && (

                  <div className="mt-5">

                    <div className="flex items-center justify-between mb-3">

                      <div className="flex items-center gap-2">

                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 text-white flex items-center justify-center">

                          <Trophy size={17} />

                        </div>

                        <span className="text-sm font-black text-gray-800">
                          Classement
                        </span>

                      </div>

                      <span className="text-xs font-bold text-gray-400">
                        {classement.length} joueur
                        {classement.length > 1
                          ? "s"
                          : ""}
                      </span>

                    </div>

                    <div className="space-y-1.5">

                      {classement.map((i) => {

                        const rank = i.rank;
                        const score = i.score;

                        const nom =
                          i.profil?.nom ||
                          i.joueur?.nom ||
                          "Joueur inconnu";

                        let bgColor =
                          "bg-gray-50 border-gray-100";

                        let rankColor =
                          "bg-gray-200 text-gray-600";

                        let emoji = "";

                        if (rank === 1) {

                          bgColor =
                            "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200";

                          rankColor =
                            "bg-gradient-to-br from-yellow-400 to-amber-500 text-white";

                          emoji = "🥇";

                        } else if (rank === 2) {

                          bgColor =
                            "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200";

                          rankColor =
                            "bg-gradient-to-br from-gray-400 to-gray-500 text-white";

                          emoji = "🥈";

                        } else if (rank === 3) {

                          bgColor =
                            "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200";

                          rankColor =
                            "bg-gradient-to-br from-orange-400 to-orange-600 text-white";

                          emoji = "🥉";

                        }

                        return (

                          <div
                            key={i.id}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${bgColor}`}
                          >

                            {/* RANG */}

                            <div
                              className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black ${rankColor}`}
                            >
                              {emoji || rank || "—"}
                            </div>

                            {/* NOM */}

                            <div className="min-w-0 flex-1">

                              <div className="flex items-center gap-1.5">

                                <span className="font-bold text-sm text-gray-800 truncate">
                                  {nom}
                                </span>

                                {/* Joueur sans compte */}
                                {i.joueur && !i.profil && (
                                  <span
                                    className="text-xs"
                                    title="Joueur sans compte"
                                  >
                                    👥
                                  </span>
                                )}

                              </div>

                            </div>

                            {/* SCORE */}

                            <div className="text-right flex-shrink-0">

                              {score !== null &&
                                score !== undefined && (
                                  <div className="text-sm font-black text-gray-800">
                                    {score}
                                    <span className="text-[10px] font-bold text-gray-400 ml-0.5">
                                      pts
                                    </span>
                                  </div>
                                )}

                              {rank && (
                                <div className="text-[10px] font-bold text-gray-400">
                                  Rang {rank}
                                </div>
                              )}

                            </div>

                          </div>

                        );

                      })}

                    </div>

                  </div>

                )}

                {/* ==================================================
                    GÉRER LES SCORES
                    ================================================== */}

                {(p.utilisateur_id ===
                  currentUser.id ||
                  userRole === "admin") && (

                  <button
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-black shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    onClick={() =>
                      setSelectedPartieForRank(p)
                    }
                  >

                    <Trophy size={18} />

                    Gérer les scores

                  </button>

                )}

              </div>

            </div>
          );
        })}

      </div>

      {/* ========================================================
          AUCUN RESULTAT
          ======================================================== */}

      {filterSearch(
        archives.filter(
          (p) =>
            selectedLieu === "Tous" ||
            p.lieu === selectedLieu
        )
      ).length === 0 && (

        <div className="max-w-2xl mx-auto mt-10 mb-12">

          <div className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-10 text-center">

            <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">

              <Archive size={32} />

            </div>

            <h3 className="mt-5 text-xl font-black text-gray-900">

              {search
                ? "Aucune partie trouvée"
                : archives.length === 0
                ? "Aucune partie archivée"
                : "Aucune partie pour ce lieu"}

            </h3>

            <p className="mt-2 text-gray-500">

              {search
                ? "Essayez avec un autre terme de recherche."
                : archives.length === 0
                ? "Les anciennes parties apparaîtront ici une fois terminées."
                : "Essayez de sélectionner un autre lieu."}

            </p>

            {search && (

              <button
                onClick={() => setSearch("")}
                className="mt-5 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition"
              >
                Effacer la recherche
              </button>

            )}

          </div>

        </div>

      )}

      {/* ========================================================
          RANK MODAL
          ======================================================== */}

      {selectedPartieForRank && (

        <RankModal
          partie={selectedPartieForRank}
          onClose={() =>
            setSelectedPartieForRank(null)
          }
          fetchParties={fetchPast}
        />

      )}

    </div>
  );
}