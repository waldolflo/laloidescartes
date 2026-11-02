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
  Dices,
  Library,
  X,
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
  const [extensionsSelectionnees, setExtensionsSelectionnees] = useState([]);
  const [nouvelIdExtension, setNouvelIdExtension] = useState("");
  const [addingExtension, setAddingExtension] = useState(false);
  const [extensionsOuvertes, setExtensionsOuvertes] = useState(null);
  const [scoresOuverts, setScoresOuverts] = useState(null);

  // ============================================================
  // COULEUR GÉNÉRALE
  // Même logique que Parties
  // ============================================================

  const couleursCatalogue = [
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

  const couleurCatalogue =
    couleursCatalogue[(jourDuMois - 1) % couleursCatalogue.length];

  // ============================================================
  // FETCH ROLE + PROFILS + JEUX
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

    const fetchProfils = async () => {
      const { data, error } = await supabase
        .from("profils")
        .select("id, nom");

      if (!error && data) {
        setProfils(data);

        const me = data.find(
          (p) => String(p.id) === String(user.id)
        );

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

  // ============================================================
  // MEILLEURS SCORES
  // ============================================================

  useEffect(() => {
    const fetchBestScores = async () => {
      if (!jeux.length || bestScoresFetched.current) return;

      bestScoresFetched.current = true;

      try {
        const { data: allParties, error: errorParties } =
          await supabase
            .from("parties")
            .select("id, jeu_id");

        if (errorParties || !allParties?.length) return;

        const partieIds = allParties.map((p) => p.id);

        const {
          data: allInscriptions,
          error: errorInscriptions,
        } = await supabase
          .from("inscriptions")
          .select(
            "partie_id, score, utilisateurs:utilisateur_id(nom)"
          )
          .in("partie_id", partieIds);

        if (
          errorInscriptions ||
          !allInscriptions?.length
        ) {
          return;
        }

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
          const inscriptions =
            inscriptionsByJeu[jeu.id] || [];

          const valid = inscriptions.filter(
            (i) =>
              i.score != null &&
              i.score > 0
          );

          if (!valid.length) {
            return {
              ...jeu,
              bestScore: null,
              bestUsers: null,
            };
          }

          const maxScore = Math.max(
            ...valid.map((i) => i.score)
          );

          const bestUsers = valid
            .filter((i) => i.score === maxScore)
            .map(
              (i) =>
                i.utilisateurs?.nom || "?"
            );

          return {
            ...jeu,
            bestScore: maxScore,
            bestUsers,
          };
        });

        setJeux(updatedJeux);
        syncBestScores(updatedJeux);
      } catch (err) {
        console.error(
          "Erreur fetchBestScores :",
          err
        );
      }
    };

    fetchBestScores();
  }, [jeux]);

  // ============================================================
  // SYNCHRONISATION MEILLEURS SCORES
  // ============================================================

  const syncBestScores = async (jeux) => {
    if (bestScoreSynced.current) return;

    bestScoreSynced.current = true;

    for (const jeu of jeux) {
      if (
        !jeu.bestScore ||
        jeu.bestScore <= 0
      ) {
        continue;
      }

      if (
        !Array.isArray(jeu.bestUsers) ||
        jeu.bestUsers.length === 0
      ) {
        continue;
      }

      const bestUser = jeu.bestUsers[0];

      const sameScore =
        jeu.best_score === jeu.bestScore;

      const sameUser =
        jeu.best_users === bestUser;

      if (sameScore && sameUser) continue;

      const { error } = await supabase
        .from("jeux")
        .update({
          best_score: jeu.bestScore,
          best_users: bestUser,
        })
        .eq("id", jeu.id);

      if (error) {
        console.error(
          `❌ Sync bestScore (${jeu.nom})`,
          error
        );
      } else {
        console.log(
          `✔ BestScore sync (${jeu.nom})`
        );
      }
    }
  };

  // ============================================================
  // FETCH JEUX
  // ============================================================

  const fetchJeux = async () => {
    const { data, error } = await supabase
      .from("jeux")
      .select("*")
      .order("nom", { ascending: true });

    if (error) {
      console.error("Erreur récupération jeux :", error);
      return;
    }

    const jeuxData = data || [];

    if (!jeuxData.length) {
      setJeux([]);
      return;
    }

    const jeuIds = jeuxData.map((jeu) => jeu.id);

    const { data: extensions, error: extensionsError } =
      await supabase
        .from("extensions_jeux")
        .select("*")
        .in("jeu_id", jeuIds);

    if (extensionsError) {
      console.error(
        "Erreur récupération extensions :",
        extensionsError
      );
    }

    const extensionsByJeu = {};

    (extensions || []).forEach((extension) => {
      if (!extensionsByJeu[extension.jeu_id]) {
        extensionsByJeu[extension.jeu_id] = [];
      }

      extensionsByJeu[extension.jeu_id].push(extension);
    });

    const jeuxAvecExtensions = jeuxData.map((jeu) => ({
      ...jeu,
      extensions: extensionsByJeu[jeu.id] || [],
    }));

    setJeux(jeuxAvecExtensions);

    bestScoresFetched.current = false;
    bestScoreSynced.current = false;
  };

  // ============================================================
  // BGG
  // ============================================================

  const fetchBGGData = async (bggId) => {
    if (!bggId) {
      return {
        couverture_url: null,
        couverture_bgg_url: null,
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
          body: JSON.stringify({
            id: bggId,
          }),
        }
      );

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        nom: data.name || data.title || null,
        // URL Supabase Storage
        couverture_url:
          data.image || null,

        // URL originale BGG
        couverture_bgg_url:
          data.bggImage || null,

        poids:
          data.weight || null,

        note:
          data.rating || null,
      };

    } catch (err) {
      console.error(
        "Erreur fetchBGGData :",
        err
      );

      return {
        nom: null,
        couverture_url: null,
        couverture_bgg_url: null,
        poids: null,
        note: null,
      };
    }
  };

  const ajouterExtension = async () => {
    const id = nouvelIdExtension.trim();

    if (!/^\d+$/.test(id)) {
      setErrorMsg("Saisis un identifiant BGG valide.");
      return;
    }

    if (
      extensionsSelectionnees.some(
        (ext) => String(ext.bgg_id) === id
      )
    ) {
      setErrorMsg("Cette extension est déjà présente.");
      return;
    }

    setErrorMsg("");
    setAddingExtension(true);

    try {
      const extensionData = await fetchBGGData(id);

      if (
        !extensionData.nom &&
        !extensionData.couverture_url &&
        !extensionData.couverture_bgg_url
      ) {
        throw new Error(
          "Aucune information trouvée pour cet identifiant BGG."
        );
      }

      setExtensionsSelectionnees((prev) => [
        ...prev,
        {
          bgg_id: id,
          nom: extensionData.nom || `Extension BGG ${id}`,
          couverture_url: extensionData.couverture_url,
          couverture_bgg_url: extensionData.couverture_bgg_url,
        },
      ]);

      setNouvelIdExtension("");
    } catch (err) {
      setErrorMsg(
        err.message || "Impossible de récupérer cette extension."
      );
    } finally {
      setAddingExtension(false);
    }
  };
  // ============================================================
  // AJOUT JEU
  // ============================================================

  const addJeu = async () => {
    if (!nom.trim()) {
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
          couverture_bgg_url: null,
          poids: null,
          note: null,
        },
      ])
      .select("*");

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (!data?.[0]) return;

    let newJeu = data[0];

    try {
      // Jeu principal
      const bggData = await fetchBGGData(bggId);

      const { error: updateError } = await supabase
        .from("jeux")
        .update({
          couverture_url: bggData.couverture_url,
          couverture_bgg_url: bggData.couverture_bgg_url,
          note: bggData.note,
          poids: bggData.poids,
        })
        .eq("id", newJeu.id);

      if (updateError) {
        console.error("Erreur mise à jour jeu :", updateError);
      }

      newJeu = {
        ...newJeu,
        ...bggData,
      };

      // Extensions
      let extensionsEnregistrees = [];

      if (extensionsSelectionnees.length > 0) {
        const extensionsData = extensionsSelectionnees.map((ext) => ({
          jeu_id: newJeu.id,
          bgg_id: String(ext.bgg_id),
          nom: ext.nom,
          couverture_url: ext.couverture_url,
          couverture_bgg_url: ext.couverture_bgg_url,
        }));

        const {
          data: insertedExtensions,
          error: extensionError,
        } = await supabase
          .from("extensions_jeux")
          .insert(extensionsData)
          .select("*");

        if (extensionError) {
          console.error(
            "Erreur enregistrement extensions :",
            extensionError
          );

          alert(
            "Le jeu a été créé, mais une erreur est survenue lors de l'enregistrement de ses extensions : " +
              extensionError.message
          );
        } else {
          extensionsEnregistrees = insertedExtensions || [];
        }
      }

      newJeu.extensions = extensionsEnregistrees;

      setJeux((prev) => [newJeu, ...prev]);

      setAddingJeu(false);

      setNom("");
      setProprietaire("");
      setDuree("");
      setRegleYoutube("");
      setMinJoueurs("");
      setMaxJoueurs("");
      setType("");
      setBggId("");
      setExtensionsSelectionnees([]);
      setNouvelIdExtension("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
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
      }
    } catch (err) {
      console.error("Erreur ajout jeu :", err);
      setErrorMsg(err.message || "Erreur lors de l'ajout du jeu.");
    }
  };

  // ============================================================
  // RECHERCHE + TRI
  // ============================================================

  useEffect(() => {
    const text =
      searchText.toLowerCase().trim();

    let filtered = jeux.filter((j) => {
      const proprietaireNom =
        profils.find(
          (p) =>
            String(p.id) ===
            String(j.proprietaire)
        )?.nom || "";

      return (
        (j.nom || "")
          .toLowerCase()
          .includes(text) ||
        (j.type || "")
          .toLowerCase()
          .includes(text) ||
        proprietaireNom
          .toLowerCase()
          .includes(text) ||
        (j.duree || "")
          .toString()
          .toLowerCase()
          .includes(text) ||
        (j.max_joueurs || "")
          .toString()
          .includes(text)
      );
    });

    filtered.sort((a, b) => {
      switch (sortOption) {
        case "nom-asc":
          return (a.nom || "").localeCompare(
            b.nom || ""
          );

        case "nom-desc":
          return (b.nom || "").localeCompare(
            a.nom || ""
          );

        case "max-joueurs-asc":
          return (
            (a.max_joueurs || 0) -
            (b.max_joueurs || 0)
          );

        case "max-joueurs-desc":
          return (
            (b.max_joueurs || 0) -
            (a.max_joueurs || 0)
          );

        case "fav-desc":
          return (
            (b.fav || 0) -
            (a.fav || 0)
          );

        case "fav-asc":
          return (
            (a.fav || 0) -
            (b.fav || 0)
          );

        case "note-desc":
          return (
            (b.note || 0) -
            (a.note || 0)
          );

        case "note-asc":
          return (
            (a.note || 0) -
            (b.note || 0)
          );

        case "poids-desc":
          return (
            (b.poids || 0) -
            (a.poids || 0)
          );

        case "poids-asc":
          return (
            (a.poids || 0) -
            (b.poids || 0)
          );

        default:
          return 0;
      }
    });

    setFilteredJeux(filtered);
  }, [
    searchText,
    jeux,
    sortOption,
    profils,
  ]);

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <div className="min-h-screen px-4 py-6 md:px-6">

      {/* ========================================================
          EN-TÊTE
      ======================================================== */}

      <section
        className={`relative max-w-[1600px] mx-auto overflow-hidden rounded-[2rem] shadow-2xl bg-gradient-to-br ${couleurCatalogue}`}
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
                <Dices size={16} />
                La Loi des Cartes
              </div>

              <h1 className="mt-3 text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                LUDOTHÈQUE
                <span className="block text-purple-300">
                  DU CLUB
                </span>
              </h1>

              <p className="mt-3 text-purple-100 text-base md:text-lg">
                Retrouvez tous les jeux de
                l'association en détail.
              </p>

            </div>

            {/* Statistiques */}

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">

              <div className="inline-flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white text-indigo-900 font-black shadow-xl">

                <Library size={20} />

                <span>
                  {jeux.length} jeu
                  {jeux.length > 1
                    ? "x"
                    : ""}
                </span>

              </div>

              <div className="inline-flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold">

                <Search size={19} />

                <span>
                  {filteredJeux.length} affiché
                  {filteredJeux.length > 1
                    ? "s"
                    : ""}
                </span>

              </div>

            </div>

          </div>

        </div>
      </section>
      {/* ========================================================
          RECHERCHE + TRI
      ======================================================== */}

      <div className="max-w-[1600px] mx-auto mt-6">

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-3">

          <div className="flex flex-col lg:flex-row gap-3">

            {/* Recherche */}

            <div className="relative flex-1">

              <Search
                size={21}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Rechercher un jeu, un type, un propriétaire, une durée..."
                value={searchText}
                onChange={(e) =>
                  setSearchText(e.target.value)
                }
                className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />

              {searchText && (
                <button
                  onClick={() =>
                    setSearchText("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition"
                  aria-label="Effacer la recherche"
                >
                  <X size={16} />
                </button>
              )}

            </div>

            {/* Tri */}

            <div className="relative lg:w-64">

              <ArrowUpDown
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />

              <select
                value={sortOption}
                onChange={(e) =>
                  setSortOption(
                    e.target.value
                  )
                }
                className="w-full appearance-none pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition cursor-pointer"
              >
                <option value="nom-asc">
                  Nom A → Z
                </option>

                <option value="nom-desc">
                  Nom Z → A
                </option>

                <option value="max-joueurs-asc">
                  Joueurs max ↑
                </option>

                <option value="max-joueurs-desc">
                  Joueurs max ↓
                </option>

                <option value="fav-desc">
                  Favoris ↓
                </option>

                <option value="fav-asc">
                  Favoris ↑
                </option>

                <option value="note-desc">
                  Note ↓
                </option>

                <option value="note-asc">
                  Note ↑
                </option>

                <option value="poids-desc">
                  Poids ↓
                </option>

                <option value="poids-asc">
                  Poids ↑
                </option>
              </select>

            </div>

            {/* Ajouter */}

            {user &&
              (
                userRole === "admin" ||
                userRole === "ludoplus" ||
                userRole === "ludo"
              ) && (
                <button
                  onClick={() => {
                    setErrorMsg("");
                    setExtensionsSelectionnees([]);
                    setNouvelIdExtension("");
                    setAddingJeu(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  <Plus size={20} />
                  Ajouter un jeu
                </button>
              )}

          </div>

          <div className="mt-3 px-1 flex items-center justify-between text-xs text-gray-500">

            <span>
              {filteredJeux.length} jeu
              {filteredJeux.length > 1
                ? "x"
                : ""}{" "}
              correspondant
              {filteredJeux.length > 1
                ? "s"
                : ""}
            </span>

            {searchText && (
              <button
                onClick={() =>
                  setSearchText("")
                }
                className="font-bold text-purple-600 hover:text-purple-800 transition"
              >
                Effacer la recherche
              </button>
            )}

          </div>

        </div>

      </div>

      {/* ========================================================
          TITRE RESULTATS
      ======================================================== */}

      <div className="max-w-[1600px] mx-auto mt-8 mb-4">

        <h2 className="text-xl md:text-2xl font-black text-gray-900">
          Jeux de la ludothèque
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          {filteredJeux.length} jeu
          {filteredJeux.length > 1
            ? "x"
            : ""}{" "}
          disponible
          {filteredJeux.length > 1
            ? "s"
            : ""}
        </p>

      </div>

      {/* ========================================================
          LISTE DES JEUX
      ======================================================== */}

      {filteredJeux.length > 0 ? (

        <div className="max-w-[1600px] mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">

          {filteredJeux.map((j) => {

            const proprietaireNom =
              profils.find(
                (p) =>
                  String(p.id) ===
                  String(j.proprietaire)
              )?.nom || "?";

            return (

              <div
                key={j.id}
                className={`group relative bg-white rounded-[1.5rem] shadow-lg border border-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                  scoresOuverts === j.id || extensionsOuvertes === j.id
                    ? "z-[90]"
                    : "z-0"
                }`}
              >

                {/* ==================================================
                    BADGES
                ================================================== */}

                <div className="absolute top-3 right-3 z-[60] flex flex-col items-end gap-1.5">

                  {j.fav > 0 && (
                    <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-black rounded-full px-2.5 py-1 shadow-lg">
                      <Heart
                        size={12}
                        fill="currentColor"
                      />
                      {j.fav}
                    </span>
                  )}

                  {j.note &&
                    j.note > 0 && (
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-gray-900 text-xs font-black px-2.5 py-1 rounded-full shadow-lg">
                        <Star
                          size={12}
                          fill="currentColor"
                        />
                        {parseFloat(
                          j.note
                        ).toFixed(1)}
                      </span>
                    )}

                  {j.poids &&
                    j.poids > 0 && (
                      <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                        <Scale size={12} />
                        {parseFloat(
                          j.poids
                        ).toFixed(2)}
                      </span>
                    )}

                  {j.bestScore && j.bestScore > 0 && (
                    <div className="relative isolate">

                      <button
                        type="button"
                        onMouseEnter={() => setScoresOuverts(j.id)}
                        onMouseLeave={() => setScoresOuverts(null)}
                        onClick={() =>
                          setScoresOuverts(
                            scoresOuverts === j.id ? null : j.id
                          )
                        }
                        className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 transition"
                      >
                        <Trophy size={12} />
                        {j.bestScore}
                      </button>

                      {/* Info-bulle du meilleur score */}
                      {scoresOuverts === j.id && (
                        <div
                          onMouseEnter={() => setScoresOuverts(j.id)}
                          onMouseLeave={() => setScoresOuverts(null)}
                          className="absolute top-full right-0 mt-2 w-52 p-3 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 z-[100]"
                        >
                          <p className="text-xs font-black text-emerald-700 mb-2">
                            Meilleur score
                          </p>

                          <p className="text-sm font-bold">
                            🏆 {j.bestScore} points
                          </p>

                          <ul className="mt-1 space-y-1">
                            {(j.bestUsers || []).map((nom, index) => (
                              <li
                                key={index}
                                className="text-xs font-semibold flex items-center gap-2"
                              >
                                <span className="text-emerald-500">◆</span>
                                {nom}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  )}

                </div>

                {/* ==================================================
                    IMAGE
                ================================================== */}

                <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-t-[1.5rem] overflow-visible">

                  <div className="relative h-48 flex items-center justify-center">

                    {/* Couverture principale */}
                    {j.couverture_url ? (
                      <div className="relative z-10 w-full h-full flex items-center justify-center">
                        {j.bgg_api ? (
                          <a
                            href={`https://boardgamegeek.com/boardgame/${j.bgg_api}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full h-full"
                          >
                            <img
                              src={j.couverture_url}
                              alt={j.nom}
                              className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                          </a>
                        ) : (
                          <img
                            src={j.couverture_url}
                            alt={j.nom}
                            className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="relative z-10 h-48 flex flex-col items-center justify-center text-gray-300">
                        <Library size={48} />
                        <span className="mt-2 text-sm font-semibold">
                          Pas d'image
                        </span>
                      </div>
                    )}

                    {/* Extensions au premier plan */}
                    {(j.extensions || [])
                      .filter((ext) => ext.couverture_url)
                      .slice(0, 3)
                      .map((ext, index) => {
                        const positions = [
                          { x: 40, y: 48, rotate: -8 },
                          { x: 80, y: 48, rotate: 5 },
                          { x: 120, y: 48, rotate: -5 },
                        ];

                        const position = positions[index];

                        return (
                          <img
                            key={ext.id}
                            src={ext.couverture_url}
                            alt={ext.nom || `Extension ${ext.bgg_id}`}
                            title={ext.nom || `Extension BGG ${ext.bgg_id}`}
                            className="absolute z-20 h-16 w-12 object-cover rounded-md shadow-lg border-2 border-white transition-transform duration-300 group-hover:scale-110"
                            style={{
                              transform: `translate(${position.x}px, ${position.y}px) rotate(${position.rotate}deg)`,
                            }}
                          />
                        );
                      })}

                  </div>

                  {/* Règles */}
                  {j.regle_youtube && (
                    <a
                      href={j.regle_youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-5 left-5 z-20 inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600/95 text-white text-xs font-bold rounded-xl shadow-lg hover:bg-red-700 hover:scale-105 transition"
                    >
                      <Play size={14} fill="currentColor" />
                      Règles
                    </a>
                  )}

                  {/* BGG 
                  {j.bgg_api && (
                    <a
                      href={`https://boardgamegeek.com/boardgame/${j.bgg_api}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-[4.5rem] left-5 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur text-gray-700 text-xs font-bold rounded-xl shadow hover:bg-white transition"
                    >
                      BGG
                      <ExternalLink size={12} />
                    </a>
                  )} */}

                  {/* Nombre d'extensions */}
                  {j.extensions?.length > 0 && (
                    <div className="absolute top-3 left-3 z-[70]">

                      <button
                        type="button"
                        onMouseEnter={() => setExtensionsOuvertes(j.id)}
                        onMouseLeave={() => setExtensionsOuvertes(null)}
                        onClick={() =>
                          setExtensionsOuvertes(
                            extensionsOuvertes === j.id ? null : j.id
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-lg hover:bg-purple-700 transition"
                      >
                        <Dices size={14} />
                        +{j.extensions.length} extension
                        {j.extensions.length > 1 ? "s" : ""}
                      </button>

                      {/* Liste des extensions */}
                      {extensionsOuvertes === j.id && (
                        <div
                          onMouseEnter={() => setExtensionsOuvertes(j.id)}
                          onMouseLeave={() => setExtensionsOuvertes(null)}
                          className="absolute left-0 top-full mt-2 w-64 max-h-64 overflow-y-auto rounded-xl bg-white shadow-2xl border border-gray-200 p-2 z-[100]"
                        >
                          {j.extensions.map((ext) => (
                            <div
                              key={ext.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                            >
                              {ext.couverture_url || ext.couverture_bgg_url ? (
                                <img
                                  src={ext.couverture_url || ext.couverture_bgg_url}
                                  alt={ext.nom}
                                  className="w-10 h-14 object-cover rounded shadow-sm"
                                />
                              ) : (
                                <div className="w-10 h-14 flex items-center justify-center bg-gray-100 rounded">
                                  <Dices size={18} className="text-gray-400" />
                                </div>
                              )}
  
                              <span className="text-sm font-medium text-gray-700">
                                {ext.nom || "Extension sans nom"}
                              </span>
                            </div>
                          ))}

                        </div>
                      )}

                    </div>
                  )}

                </div>

                {/* ==================================================
                    CONTENU
                ================================================== */}

                <div className="p-5">

                  {/* Nom */}

                  <div className="text-center">

                    <h3 className="text-xl font-black text-gray-900 leading-tight">
                      {j.nom}
                    </h3>

                    {j.type && (
                      <span className="inline-flex mt-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold">
                        {j.type}
                      </span>
                    )}

                  </div>

                  {/* Joueurs */}

                  <div className="mt-4 flex items-center gap-3 bg-purple-50 rounded-xl px-3 py-2.5">

                    <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
                      <Users size={18} />
                    </div>

                    <div className="min-w-0">

                      <p className="text-xs font-bold uppercase tracking-wide text-purple-500">
                        Joueurs
                      </p>

                      <p className="text-sm font-black text-gray-800">
                        {j.min_joueurs} à{" "}
                        {j.max_joueurs}
                      </p>

                    </div>

                  </div>

                  {/* Durée + type */}

                  <div className="grid grid-cols-2 gap-2 mt-2">

                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">

                      <Clock3
                        size={17}
                        className="text-indigo-600 flex-shrink-0"
                      />

                      <div>

                        <p className="text-[10px] uppercase font-bold text-gray-400">
                          Durée
                        </p>

                        <p className="text-sm font-black text-gray-800">
                          {j.duree
                            ? `${j.duree} min`
                            : "—"}
                        </p>

                      </div>

                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">

                      <UserRound
                        size={17}
                        className="text-purple-600 flex-shrink-0"
                      />

                      <div className="min-w-0">

                        <p className="text-[10px] uppercase font-bold text-gray-400">
                          Propriétaire
                        </p>

                        <p className="text-sm font-black text-gray-800 truncate">
                          {proprietaireNom}
                        </p>

                      </div>

                    </div>

                  </div>

                  {/* ==================================================
                      ACTIONS
                  ================================================== */}

                  {user && (
                    <div className="mt-4 space-y-2 pt-1">

                      {(j.utilisateur_id ===
                        user.id ||
                        userRole ===
                          "admin" ||
                        userRole ===
                          "ludoplus") && (

                        <button
                          onClick={() =>
                            setEditingJeu(j)
                          }
                          className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 text-white px-3 py-2.5 rounded-xl font-bold hover:bg-amber-600 hover:-translate-y-0.5 transition"
                        >
                          <Pencil size={16} />
                          Modifier
                        </button>

                      )}

                      {(userRole ===
                        "admin" ||
                        userRole ===
                          "ludoplus" ||
                        userRole ===
                          "ludo" ||
                        userRole ===
                          "membre") && (

                        <button
                          onClick={() =>
                            setSelectedJeu(j)
                          }
                          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-2.5 rounded-xl font-black shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                          <Plus size={17} />
                          Créer une partie
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

        /* ========================================================
           AUCUN RÉSULTAT
        ======================================================== */

        <div className="max-w-2xl mx-auto mt-10 mb-12">

          <div className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-10 text-center">

            <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">

              <Dices size={32} />

            </div>

            <h3 className="mt-5 text-xl font-black text-gray-900">

              Aucun jeu trouvé

            </h3>

            <p className="mt-2 text-gray-500">

              {searchText
                ? "Aucun jeu ne correspond à votre recherche."
                : "La ludothèque ne contient actuellement aucun jeu."}

            </p>

            {searchText && (
              <button
                onClick={() =>
                  setSearchText("")
                }
                className="mt-5 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition"
              >
                Effacer la recherche
              </button>
            )}

          </div>

        </div>

      )}

      {/* ========================================================
          MODAL ÉDITION
      ======================================================== */}

      {editingJeu && (
        <EditJeu
          jeu={editingJeu}
          onClose={() =>
            setEditingJeu(null)
          }
          onUpdate={(updatedJeu) => {
            if (!updatedJeu?.id) return;

            setJeux((prev) =>
              prev.map((j) =>
                String(j.id) ===
                String(updatedJeu.id)
                  ? updatedJeu
                  : j
              )
            );
          }}
        />
      )}

      {/* ========================================================
          MODAL AJOUT
      ======================================================== */}

      {addingJeu && (

        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setAddingJeu(false);
            }
          }}
        >

          <div className="relative z-[101] bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden">

            {/* Header */}

            <div
              className={`relative bg-gradient-to-br ${couleurCatalogue} px-6 py-6 text-white`}
            >

              <button
                onClick={() =>
                  setAddingJeu(false)
                }
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              >
                <X size={19} />
              </button>

              <div className="flex items-center gap-3">

                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <Plus size={25} />
                </div>

                <div>

                  <p className="text-purple-200 text-xs uppercase tracking-widest font-bold">
                    La Loi des Cartes
                  </p>

                  <h2 className="text-2xl font-black">
                    Ajouter un jeu
                  </h2>

                </div>

              </div>

            </div>

            {/* Formulaire */}

            <div className="p-6 max-h-[75vh] overflow-y-auto">

              {errorMsg && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Nom */}

              <label className="block mb-1.5 text-sm font-bold text-gray-700">
                Nom du jeu
              </label>

              <input
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ex. Ark Nova"
                value={nom}
                onChange={(e) =>
                  setNom(e.target.value)
                }
              />

              {/* Règles */}

              <label className="block mb-1.5 text-sm font-bold text-gray-700">
                Règles YouTube
              </label>

              <input
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Lien vers la vidéo YouTube"
                value={regleYoutube}
                onChange={(e) =>
                  setRegleYoutube(
                    e.target.value
                  )
                }
              />

              {/* Joueurs */}

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block mb-1.5 text-sm font-bold text-gray-700">
                    Joueurs min
                  </label>

                  <input
                    className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="2"
                    value={minJoueurs}
                    onChange={(e) =>
                      setMinJoueurs(
                        e.target.value
                      )
                    }
                  />

                </div>

                <div>

                  <label className="block mb-1.5 text-sm font-bold text-gray-700">
                    Joueurs max
                  </label>

                  <input
                    className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="4"
                    value={maxJoueurs}
                    onChange={(e) =>
                      setMaxJoueurs(
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>

              {/* Type */}

              <label className="block mt-4 mb-1.5 text-sm font-bold text-gray-700">
                Type de jeu
              </label>

              <input
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ex. Expert, familial..."
                value={type}
                onChange={(e) =>
                  setType(e.target.value)
                }
              />

              {/* Durée */}

              <label className="block mt-4 mb-1.5 text-sm font-bold text-gray-700">
                Durée
              </label>

              <input
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ex. 90"
                value={duree}
                onChange={(e) =>
                  setDuree(e.target.value)
                }
              />

              {/* Propriétaire */}

              <label className="block mt-4 mb-1.5 text-sm font-bold text-gray-700">
                Propriétaire
              </label>

              <select
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={proprietaire}
                onChange={(e) =>
                  setProprietaire(
                    e.target.value
                  )
                }
              >

                {profils.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.nom}
                    {String(p.id) ===
                    String(user.id)
                      ? " (moi)"
                      : ""}
                  </option>
                ))}

              </select>

              {/* BGG */}

              <label className="block mt-4 mb-1.5 text-sm font-bold text-gray-700">
                ID BGG
              </label>

              <input
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Numéro présent dans l'URL BoardGameGeek"
                value={bggId}
                onChange={(e) =>
                  setBggId(e.target.value)
                }
              />

              {/* Extensions BGG */}

              <div className="mt-5">

                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-700">
                    Extensions du jeu
                  </label>

                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    {extensionsSelectionnees.length} sélectionnée
                    {extensionsSelectionnees.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Liste des extensions sélectionnées */}
                {extensionsSelectionnees.length > 0 && (
                  <div className="space-y-2 mb-3">

                    {extensionsSelectionnees.map((ext) => (
                      <div
                        key={ext.bgg_id}
                        className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                      >

                        {/* Couverture */}
                        <div className="w-12 h-14 flex-shrink-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
                          {ext.couverture_url || ext.couverture_bgg_url ? (
                            <img
                              src={ext.couverture_url || ext.couverture_bgg_url}
                              alt={ext.nom}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Library size={22} className="text-gray-300" />
                          )}
                        </div>

                        {/* Informations */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">
                            {ext.nom}
                          </p>

                          <p className="text-xs text-gray-500">
                            BGG : {ext.bgg_id}
                          </p>
                        </div>

                        {/* Supprimer */}
                        <button
                          type="button"
                          onClick={() =>
                            setExtensionsSelectionnees((prev) =>
                              prev.filter(
                                (item) => item.bgg_id !== ext.bgg_id
                              )
                            )
                          }
                          className="w-8 h-8 flex-shrink-0 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 flex items-center justify-center transition"
                          title="Retirer cette extension"
                        >
                          <X size={16} />
                        </button>

                      </div>
                    ))}

                  </div>
                )}

                {/* Ajouter une extension */}
                <div className="flex gap-2">

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Identifiant BGG de l'extension"
                    value={nouvelIdExtension}
                    onChange={(e) => setNouvelIdExtension(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        ajouterExtension();
                      }
                    }}
                    className="flex-1 min-w-0 border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <button
                    type="button"
                    onClick={ajouterExtension}
                    disabled={addingExtension || !nouvelIdExtension.trim()}
                    className="inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {addingExtension ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Plus size={18} />
                    )}

                    <span className="hidden sm:inline">
                      Ajouter
                    </span>
                  </button>

                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Saisis l'identifiant présent dans l'URL BoardGameGeek.
                  Le nom et la couverture seront récupérés automatiquement.
                </p>

              </div>

              {/* Boutons */}

              <div className="flex gap-3 mt-6">

                <button
                  onClick={() =>
                    setAddingJeu(false)
                  }
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition"
                >
                  Annuler
                </button>

                <button
                  onClick={addJeu}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  <Plus size={18} />
                  Ajouter le jeu
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* ========================================================
          MODALE CRÉATION PARTIE
      ======================================================== */}

      {selectedJeu && (
        <CreatePartieModal
          user={user}
          jeu={selectedJeu}
          onClose={() =>
            setSelectedJeu(null)
          }
          onCreated={() => {
            setSelectedJeu(null);
            alert("Partie créée !");
          }}
        />
      )}

    </div>
  );
}