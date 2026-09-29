import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import EditJeu from "./EditJeu";
import CreatePartieModal from "./CreatePartieModal";
import {
  Search,
  ArrowUpDown,
  Plus,
  Users,
  Clock3,
  UserRound,
  Pencil,
  Trophy,
  Star,
  Scale,
  Heart,
  Play,
  ExternalLink,
  Gamepad2,
  Library,
} from "lucide-react";

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
  const bestScoresFetched = useRef(false);
  const bestScoreSynced = useRef(false);
  const [profils, setProfils] = useState([]);
  const [profilCourant, setProfilCourant] = useState(null);

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

    const fetchProfils = async () => {
      const { data, error } = await supabase
        .from("profils")
        .select("id, nom");

      if (!error && data) {
        setProfils(data);

        const me = data.find(p => p.id === user.id);

        if (me) {
          setProfilCourant(me);
          setProprietaire(me.id);
        }
      }
    };

    fetchProfils();
    fetchRole();
    fetchJeux();
  }, [user]);

  useEffect(() => {
    const fetchBestScores = async () => {
      if (!jeux.length || bestScoresFetched.current) return;

      bestScoresFetched.current = true;

      try {
        const { data: allParties, error: errorParties } = await supabase
          .from("parties")
          .select("id, jeu_id");

        if (errorParties || !allParties?.length) return;

        const partieIds = allParties.map((p) => p.id);

        const { data: allInscriptions, error: errorInscriptions } =
          await supabase
            .from("inscriptions")
            .select("partie_id, score, utilisateurs:utilisateur_id(nom)")
            .in("partie_id", partieIds);

        if (errorInscriptions || !allInscriptions?.length) return;

        const inscriptionsByJeu = {};

        for (const inscription of allInscriptions) {
          const partie = allParties.find(
            (p) => p.id === inscription.partie_id
          );

          if (!partie) continue;

          const jeuId = partie.jeu_id;

          if (!inscriptionsByJeu[jeuId]) {
            inscriptionsByJeu[jeuId] = [];
          }

          inscriptionsByJeu[jeuId].push(inscription);
        }

        const updatedJeux = jeux.map((jeu) => {
          const inscriptions = inscriptionsByJeu[jeu.id] || [];

          const valid = inscriptions.filter(
            (i) => i.score != null && i.score > 0
          );

          if (!valid.length) {
            return {
              ...jeu,
              bestScore: null,
              bestUsers: null,
            };
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
  }, [jeux]);

  const syncBestScores = async (jeux) => {
    if (bestScoreSynced.current) return;

    bestScoreSynced.current = true;

    for (const jeu of jeux) {
      if (!jeu.bestScore || jeu.bestScore <= 0) continue;

      if (!Array.isArray(jeu.bestUsers) || jeu.bestUsers.length === 0) {
        continue;
      }

      const bestUser = jeu.bestUsers[0];

      const sameScore = jeu.best_score === jeu.bestScore;
      const sameUser = jeu.best_users === bestUser;

      if (sameScore && sameUser) continue;

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

  const fetchJeux = async () => {
    const { data, error } = await supabase
      .from("jeux")
      .select("*")
      .order("nom", { ascending: true });

    if (!error) {
      setJeux(data || []);
      bestScoresFetched.current = false;
      bestScoreSynced.current = false;
    }
  };

  const fetchBGGData = async (bggId) => {
    if (!bggId) {
      return {
        couverture_url: null,
        poids: null,
        note: null,
      };
    }

    try {
      const res = await fetch(
        "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/fetch-bgg-cover",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: bggId }),
        }
      );

      const data = await res.json();

      console.log(data);

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        couverture_url: data.image || data.thumbnail || null,
        poids: data.weight || null,
        note: data.rating || null,
      };
    } catch (err) {
      console.error("Erreur fetchBGGData :", err);

      return {
        couverture_url: null,
        poids: null,
        note: null,
      };
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
      .insert([
        {
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
          poids: null,
          note: null,
        },
      ])
      .select("*");

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (!data || !data[0]) return;

    let newJeu = data[0];

    const bggData = await fetchBGGData(bggId);

    const { error: updateError } = await supabase
      .from("jeux")
      .update({
        couverture_url: bggData.couverture_url,
        note: bggData.note,
        poids: bggData.poids,
      })
      .eq("id", newJeu.id)
      .select("*");

    if (updateError) {
      console.error("Erreur update couverture :", updateError);
    }

    newJeu = {
      ...newJeu,
      ...bggData,
    };

    setJeux(prev => [newJeu, ...prev]);

    setAddingJeu(false);

    setNom("");
    setProprietaire("");
    setDuree("");
    setRegleYoutube("");
    setMinJoueurs("");
    setMaxJoueurs("");
    setType("");
    setBggId("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    await fetch(
      "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/notify-game",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "notif_jeux",
          title: `🎲 Nouveau jeu : ${newJeu.nom}`,
          body: `${newJeu.nom} à été ajouté à la ludothèque c'est un jeu ${newJeu.type} pour ${newJeu.min_joueurs} à ${newJeu.max_joueurs} joueurs d'une durée de ${newJeu.duree} minutes. Cliquez pour plus de détails !`,
          url: "/catalogue",
        }),
      }
    );
  };

  useEffect(() => {
    const text = searchText.toLowerCase().trim();

    let filtered = jeux.filter(j => {
      const proprietaireNom =
        profils.find(
          p => String(p.id) === String(j.proprietaire)
        )?.nom || "";

      return (
        (j.nom || "").toLowerCase().includes(text) ||
        (j.type || "").toLowerCase().includes(text) ||
        proprietaireNom.toLowerCase().includes(text) ||
        (j.duree || "").toString().toLowerCase().includes(text) ||
        (j.max_joueurs || "").toString().includes(text)
      );
    });

    filtered.sort((a, b) => {
      switch (sortOption) {
        case "nom-asc":
          return (a.nom || "").localeCompare(b.nom || "");

        case "nom-desc":
          return (b.nom || "").localeCompare(a.nom || "");

        case "max-joueurs-asc":
          return (a.max_joueurs || 0) - (b.max_joueurs || 0);

        case "max-joueurs-desc":
          return (b.max_joueurs || 0) - (a.max_joueurs || 0);

        case "fav-desc":
          return (b.fav || 0) - (a.fav || 0);

        case "fav-asc":
          return (a.fav || 0) - (b.fav || 0);

        case "note-desc":
          return (b.note || 0) - (a.note || 0);

        case "note-asc":
          return (a.note || 0) - (b.note || 0);

        case "poids-desc":
          return (b.poids || 0) - (a.poids || 0);

        case "poids-asc":
          return (a.poids || 0) - (b.poids || 0);

        default:
          return 0;
      }
    });

    setFilteredJeux(filtered);
  }, [searchText, jeux, sortOption, profils]);

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-[1800px] mx-auto">

        {/* =====================================================
            EN-TÊTE
        ====================================================== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-900 to-slate-900 px-6 py-7 sm:px-8 sm:py-8 mb-6 shadow-2xl border border-white/10">

          {/* Décoration */}
          <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -left-20 -bottom-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-indigo-200 text-xs font-bold tracking-wider uppercase mb-3">
                <Gamepad2 className="w-4 h-4" />
                La Loi des Cartes
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                LUDOTHÈQUE
              </h1>

              <p className="mt-2 text-sm sm:text-base text-indigo-200 max-w-2xl">
                Retrouvez tous les jeux de l'association, leurs informations,
                leurs scores et les parties auxquelles ils peuvent participer.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start lg:self-center">
              <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-center backdrop-blur">
                <div className="text-2xl font-black text-white">
                  {jeux.length}
                </div>
                <div className="text-xs font-medium text-indigo-200">
                  jeux
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-center backdrop-blur">
                <div className="text-2xl font-black text-white">
                  {filteredJeux.length}
                </div>
                <div className="text-xs font-medium text-indigo-200">
                  affichés
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            BARRE DE RECHERCHE / TRI
        ====================================================== */}
        <div className="mb-6 rounded-3xl bg-white/95 p-4 sm:p-5 shadow-xl border border-white/20">

          <div className="flex flex-col xl:flex-row gap-3">

            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

              <input
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Rechercher par nom, type, propriétaire, durée ou nombre max de joueurs"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>

            {/* Tri */}
            <div className="relative xl:w-64">
              <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />

              <select
                className="w-full appearance-none pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 cursor-pointer"
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
            </div>

            {/* Ajouter */}
            {user &&
              (userRole === "admin" ||
                userRole === "ludoplus" ||
                userRole === "ludo") && (
                <button
                  onClick={() => setAddingJeu(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg shadow-indigo-900/20 hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-0.5 transition"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un jeu
                </button>
              )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              {filteredJeux.length} jeu{filteredJeux.length > 1 ? "x" : ""} correspondant
              {filteredJeux.length > 1 ? "s" : ""}
            </span>

            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        </div>

        {/* =====================================================
            LISTE DES JEUX
        ====================================================== */}
        {filteredJeux.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filteredJeux.map(j => {

              const proprietaireNom =
                profils.find(
                  p => String(p.id) === String(j.proprietaire)
                )?.nom || "?";

              return (
                <div
                  key={j.id}
                  className="group relative overflow-hidden rounded-3xl bg-white shadow-xl border border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >

                  {/* =================================================
                      IMAGE
                  ================================================== */}
                  <div className="relative bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 h-56 overflow-hidden">

                    {/* Image */}
                    {j.couverture_url ? (
                      j.bgg_api ? (
                        <a
                          href={`https://boardgamegeek.com/boardgame/${j.bgg_api}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full h-full"
                        >
                          <img
                            src={j.couverture_url}
                            alt={j.nom}
                            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                          />
                        </a>
                      ) : (
                        <img
                          src={j.couverture_url}
                          alt={j.nom}
                          className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Library className="w-14 h-14 mb-2" />
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          Pas de couverture
                        </span>
                      </div>
                    )}

                    {/* Voile léger au survol */}
                    <div className="absolute inset-0 bg-indigo-950/0 group-hover:bg-indigo-950/5 transition pointer-events-none" />

                    {/* =================================================
                        BADGES
                    ================================================== */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">

                      {j.fav > 0 && (
                        <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold rounded-full px-2.5 py-1 shadow-lg">
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          {j.fav}
                        </span>
                      )}

                      {j.note && j.note > 0 && (
                        <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {parseFloat(j.note).toFixed(1)} / 10
                        </span>
                      )}

                      {j.poids && j.poids > 0 && (
                        <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                          <Scale className="w-3.5 h-3.5" />
                          {parseFloat(j.poids).toFixed(2)} / 5
                        </span>
                      )}

                      {j.bestScore && j.bestScore > 0 && (
                        <span
                          className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 transition"
                          title={j.bestUsers.join(", ")}
                          onClick={() =>
                            alert(
                              `Meilleur score par ${j.bestUsers.join(", ")}`
                            )
                          }
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          {j.bestScore}
                        </span>
                      )}
                    </div>

                    {/* =================================================
                        BOUTON RÈGLES YOUTUBE
                    ================================================== */}
                    {j.regle_youtube && (
                      <a
                        href={j.regle_youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600/95 text-white text-xs font-bold rounded-xl shadow-lg hover:bg-red-700 hover:scale-105 transition z-10"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Règles
                      </a>
                    )}

                    {/* BGG */}
                    {j.bgg_api && (
                      <a
                        href={`https://boardgamegeek.com/boardgame/${j.bgg_api}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/90 backdrop-blur text-slate-700 text-xs font-bold rounded-xl shadow hover:bg-white transition z-10"
                      >
                        BGG
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* =================================================
                      CONTENU
                  ================================================== */}
                  <div className="p-4">

                    <div className="mb-3">
                      <h2 className="text-lg font-black text-slate-900 leading-tight line-clamp-2">
                        {j.nom}
                      </h2>

                      {j.type && (
                        <span className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                          {j.type}
                        </span>
                      )}
                    </div>

                    {/* Infos */}
                    <div className="space-y-2 text-sm">

                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>
                          <strong className="text-slate-800">
                            {j.min_joueurs} à {j.max_joueurs}
                          </strong>{" "}
                          joueurs
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock3 className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>
                          <strong className="text-slate-800">
                            {j.duree || "?"}
                          </strong>{" "}
                          minutes
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <UserRound className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate">
                          {proprietaireNom}
                        </span>
                      </div>
                    </div>

                    {/* =================================================
                        ACTIONS
                    ================================================== */}
                    {user && (
                      <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100">

                        {(j.utilisateur_id === user.id ||
                          userRole === "admin" ||
                          userRole === "ludoplus") && (
                          <button
                            onClick={() => setEditingJeu(j)}
                            className="inline-flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold shadow-sm hover:bg-amber-600 hover:-translate-y-0.5 transition"
                          >
                            <Pencil className="w-4 h-4" />
                            Modifier
                          </button>
                        )}

                        {(userRole === "admin" ||
                          userRole === "ludoplus" ||
                          userRole === "ludo" ||
                          userRole === "membre") && (
                          <button
                            onClick={() => setSelectedJeu(j)}
                            className="inline-flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold shadow-sm hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-0.5 transition"
                          >
                            <Plus className="w-4 h-4" />
                            Créer partie
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* =====================================================
             AUCUN RÉSULTAT
          ====================================================== */
          <div className="rounded-3xl bg-white/95 shadow-xl p-10 sm:p-14 text-center">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-5">
              <Search className="w-9 h-9 text-indigo-500" />
            </div>

            <h2 className="text-xl font-black text-slate-900">
              Aucun jeu trouvé
            </h2>

            <p className="mt-2 text-slate-500">
              Aucun jeu ne correspond à votre recherche.
            </p>

            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition"
              >
                Réinitialiser la recherche
              </button>
            )}
          </div>
        )}
      </div>

      {/* =========================================================
          MODAL ÉDITION
      ========================================================== */}
      {editingJeu && (
        <EditJeu
          jeu={editingJeu}
          onClose={() => setEditingJeu(null)}
          onUpdate={(updatedJeu) => {
            if (!updatedJeu?.id) return;

            setJeux(prev =>
              prev.map(j =>
                String(j.id) === String(updatedJeu.id)
                  ? updatedJeu
                  : j
              )
            );
          }}
        />
      )}

      {/* =========================================================
          MODAL AJOUT
      ========================================================== */}
      {addingJeu && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">

          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Plus className="w-6 h-6 text-indigo-600" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Ajouter un jeu
                </h2>

                <p className="text-xs text-slate-500">
                  Ajouter un nouveau jeu à la ludothèque
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">

              <input
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Nom du jeu"
                value={nom}
                onChange={e => setNom(e.target.value)}
              />

              <input
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Lien règles YouTube"
                value={regleYoutube}
                onChange={e => setRegleYoutube(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Joueurs min"
                  value={minJoueurs}
                  onChange={e => setMinJoueurs(e.target.value)}
                />

                <input
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Joueurs max"
                  value={maxJoueurs}
                  onChange={e => setMaxJoueurs(e.target.value)}
                />
              </div>

              <input
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Type de jeu"
                value={type}
                onChange={e => setType(e.target.value)}
              />

              <input
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Durée"
                value={duree}
                onChange={e => setDuree(e.target.value)}
              />

              <select
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                value={proprietaire}
                onChange={e => setProprietaire(e.target.value)}
              >
                {profils.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                    {p.id === user.id ? " (moi)" : ""}
                  </option>
                ))}
              </select>

              <input
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="ID BGG (Numéro dans l'URL)"
                value={bggId}
                onChange={e => setBggId(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">

              <button
                onClick={() => setAddingJeu(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Annuler
              </button>

              <button
                onClick={addJeu}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:from-indigo-700 hover:to-purple-700 transition"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>

            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALE CRÉATION PARTIE
      ========================================================== */}
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