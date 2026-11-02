import React, { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import EditPartie from "./EditPartie";
import {
  Search,
  Plus,
  Archive,
  CalendarDays,
  Clock3,
  MapPin,
  Users,
  Share2,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Trophy,
  Star,
  Heart,
  Scale,
  X,
  Dices,
  Play,
  ExternalLink,
} from "lucide-react";
import { toPng } from "html-to-image";

export default function Parties({ user, authUser }) {
  const [searchParams] = useSearchParams();
  const partieIdFromUrl = searchParams.get("partie");
  const currentUser = user || authUser;

  const [parties, setParties] = useState([]);
  const [jeux, setJeux] = useState([]);
  const [newPartie, setNewPartie] = useState({
    jeu_id: "",
    date_partie: "",
    heure_partie: "",
    utilisateur_id: currentUser?.id || "",
    description: "",
    lieu: "",
  });
  const [editingPartie, setEditingPartie] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [search, setSearch] = useState("");
  const [highlightedPartie, setHighlightedPartie] = useState(null);
  // Référence de l'image générée pour le partage
  const partagePartieRef = useRef(null);
  const [partieAPartager, setPartieAPartager] = useState(null);
  const [extensionsOuvertes, setExtensionsOuvertes] = useState(null);
  const [scoresOuverts, setScoresOuverts] = useState(null);

  // ============================================================
  // COULEUR GÉNÉRALE
  // Même logique que l'agenda
  // ============================================================

  const couleursParties = [
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

  const couleurParties =
    couleursParties[(jourDuMois - 1) % couleursParties.length];

  // ============================================================
  // FETCH ROLE
  // ============================================================

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("profils")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (!error) {
        setUserRole(data?.role || "");
      }
    };

    fetchRole();
  }, [currentUser]);

  // ============================================================
  // FETCH JEUX & PARTIES
  // ============================================================

  useEffect(() => {
    fetchJeux();
    fetchParties();
  }, [partieIdFromUrl]);

  const fetchJeux = async () => {
    const { data } = await supabase.from("jeux").select("*");
    setJeux(data || []);
  };

  const fetchParties = async () => {
    try {
      // 1️⃣ Toutes les parties avec leur jeu
      const { data: partiesData, error: partiesError } = await supabase
        .from("parties")
        .select("*, jeux(*)")
        .order("date_partie", { ascending: true })
        .order("heure_partie", { ascending: true });

      if (partiesError || !partiesData?.length) {
        setParties([]);
        return;
      }

      const now = new Date();

      // Parties à venir uniquement
      const upcomingParties = partiesData.filter(
        (p) =>
          new Date(`${p.date_partie}T${p.heure_partie}`) >= now
      );

      const partieIds = upcomingParties.map((p) => p.id);

      if (partieIds.length === 0) {
        setParties([]);
        return;
      }

      // 2️⃣ Inscriptions
      const { data: allInscriptions } = await supabase
        .from("inscriptions")
        .select("partie_id, utilisateur_id, rank, score")
        .in("partie_id", partieIds);

      // 3️⃣ Profils
      const { data: profilsData } = await supabase
        .from("profils")
        .select("id, nom");

      // 4️⃣ Récupération des extensions
      const jeuIds = [
        ...new Set(
          upcomingParties
            .map((p) => p.jeux?.id)
            .filter(Boolean)
        ),
      ];

      let extensionsData = [];

      if (jeuIds.length > 0) {
        const { data, error: extensionsError } = await supabase
          .from("extensions_jeux")
          .select("*")
          .in("jeu_id", jeuIds);

        if (extensionsError) {
          console.error(
            "Erreur récupération extensions :",
            extensionsError
          );
        } else {
          extensionsData = data || [];
        }
      }

      // 5️⃣ Assemblage des parties, inscrits et extensions
      const partiesFull = upcomingParties.map((p) => {
        const inscrits = (allInscriptions || [])
          .filter((i) => i.partie_id === p.id)
          .map((i) => ({
            ...i,
            profil: profilsData?.find(
              (u) => u.id === i.utilisateur_id
            ),
          }));

        const extensions = extensionsData.filter(
          (ext) => String(ext.jeu_id) === String(p.jeux?.id)
        );

        return {
          ...p,
          inscrits,
          jeux: p.jeux
            ? {
                ...p.jeux,
                extensions,
              }
            : p.jeux,
        };
      });

      setParties(partiesFull);

      // Partie ciblée par URL
      if (partieIdFromUrl) {
        const partieCible = partiesFull.find(
          (p) => String(p.id) === String(partieIdFromUrl)
        );

        if (partieCible) {
          setHighlightedPartie(partieCible.id);

          setTimeout(() => {
            document
              .getElementById(`partie-${partieCible.id}`)
              ?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
          }, 300);
        }
      }
    } catch (err) {
      console.error("Erreur fetchParties :", err);
    }
  };

  // ============================================================
  // INSCRIPTION / DESINSCRIPTION
  // ============================================================

  const toggleInscription = async (partie) => {
    const isInscrit = partie.inscrits?.some(
      (i) => i.utilisateur_id === currentUser.id
    );

    if (isInscrit) {
      await supabase
        .from("inscriptions")
        .delete()
        .eq("partie_id", partie.id)
        .eq("utilisateur_id", currentUser.id);
    } else {
      if (
        (partie.inscrits?.length || 0) >=
        (partie.jeux?.max_joueurs || 0)
      ) {
        return alert("La partie est complète !");
      }

      await supabase
        .from("inscriptions")
        .insert([
          {
            partie_id: partie.id,
            utilisateur_id: currentUser.id,
          },
        ]);
    }

    fetchParties();
  };

  // ============================================================
  // CRÉATION PARTIE
  // ============================================================

  const addPartie = async () => {
    setErrorMsg("");

    if (
      !newPartie.jeu_id ||
      !newPartie.date_partie ||
      !newPartie.heure_partie
    ) {
      setErrorMsg("Jeu, date et heure sont obligatoires");
      return;
    }

    const jeu = jeux.find(
      (j) => String(j.id) === String(newPartie.jeu_id)
    );

    if (!jeu) {
      setErrorMsg("Jeu introuvable");
      return;
    }

    const nomDefault = `${jeu.nom} ${formatDate(
      newPartie.date_partie
    )} ${formatHeure(newPartie.heure_partie)}`;

    const { error } = await supabase.from("parties").insert([
      {
        ...newPartie,
        nom: nomDefault,
        utilisateur_id: currentUser.id,
        max_joueurs: jeu.max_joueurs,
      },
    ]);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setShowModal(false);

      setNewPartie({
        jeu_id: "",
        date_partie: "",
        heure_partie: "",
        utilisateur_id: currentUser?.id || "",
        description: "",
        lieu: "",
      });

      fetchParties();
    }
  };

  // ============================================================
  // FORMATAGE
  // ============================================================

  const formatDate = (date) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(
      "fr-FR",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      }
    );

  const formatHeure = (t) => (t ? t.slice(0, 5) : "");

  // ============================================================
  // RECHERCHE
  // ============================================================

  const filterParties = (list) => {
    const s = search.toLowerCase();

    return list.filter(
      (p) =>
        p.jeux?.nom?.toLowerCase().includes(s) ||
        p.nom?.toLowerCase().includes(s) ||
        p.lieu?.toLowerCase().includes(s) ||
        p.organisateur?.nom?.toLowerCase().includes(s) ||
        formatDate(p.date_partie).toLowerCase().includes(s) ||
        search.includes(p.date_partie)
    );
  };

  // ============================================================
  // PARTAGE WHATSAPP
  // ============================================================

  const shareOnWhatsApp = async (partie) => {
    const maxJoueurs = partie.jeux?.max_joueurs || 0;
    const nombreInscrits = partie.inscrits?.length || 0;

    const placesRestantes = Math.max(
      maxJoueurs - nombreInscrits,
      0
    );

    const lienPartie = `${window.location.origin}/parties?partie=${partie.id}`;

    // ============================================================
    // TEXTE WHATSAPP — INCHANGÉ
    // ============================================================

    let message = `🎲 *Nouvelle partie — La Loi des Cartes* 🎲\n🎯 *${
      partie.jeux?.nom || "Jeu"
    }*\n📅 ${formatDate(partie.date_partie)}\n🕐 ${formatHeure(
      partie.heure_partie
    )}`;

    if (partie.lieu) {
      message += `\n📍 ${partie.lieu}`;
    }

    if (maxJoueurs > 0) {
      message += `\n👥 ${nombreInscrits}/${maxJoueurs} joueurs`;

      if (placesRestantes > 0) {
        message += `\n🟢 ${placesRestantes} place${
          placesRestantes > 1 ? "s" : ""
        } restante${placesRestantes > 1 ? "s" : ""}`;
      } else {
        message += `\n🔴 Partie complète`;
      }
    }

    if (partie.description) {
      message += `\n\n📝 ${partie.description}`;
    }

    message += `\n\n👉 *S'inscrire / voir la partie :*\n${lienPartie}`;

    // ============================================================
    // PRÉPARATION DE LA CARTE
    // ============================================================

    setPartieAPartager(partie);

    // Laisse React afficher la carte
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

    const element = partagePartieRef.current;

    if (!element) {
      console.error("Élément de partage introuvable");

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
        message
      )}`;

      window.open(whatsappUrl, "_blank");
      return;
    }

    try {
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });

      const dataUrl = await toPng(element, {
        width: 420,
        height: element.scrollHeight,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      // ============================================================
      // DATA URL → BLOB → FICHIER
      // Sans fetch() pour éviter le blocage CSP
      // ============================================================

      const base64 = dataUrl.split(",")[1];

      const byteCharacters = atob(base64);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(
          offset,
          offset + 1024
        );

        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        byteArrays.push(new Uint8Array(byteNumbers));
      }

      const blob = new Blob(byteArrays, {
        type: "image/png",
      });

      const fichier = new File(
        [blob],
        `partie-${partie.jeux?.nom || "jeu"}.png`,
        {
          type: "image/png",
        }
      );

      // ============================================================
      // PARTAGE NATIF
      // ============================================================

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [fichier],
        })
      ) {
        await navigator.share({
          title: `Partie ${partie.jeux?.nom || ""}`,
          text: message,
          files: [fichier],
        });

        return;
      }

      // ============================================================
      // FALLBACK WHATSAPP
      // ============================================================

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
        message
      )}`;

      window.open(whatsappUrl, "_blank");

    } catch (error) {
      console.error(
        "Erreur lors de la création de l'image de partage :",
        error
      );

      // ============================================================
      // FALLBACK WHATSAPP TEXTE
      // ============================================================

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
        message
      )}`;

      window.open(whatsappUrl, "_blank");

    } finally {
      setPartieAPartager(null);
    }
  };

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <>
      {/* ============================================================
          CARTE UTILISÉE POUR LE PARTAGE
          ============================================================ */}

      {partieAPartager && (
        <div
          ref={partagePartieRef}
          style={{
            position: "fixed",
            left: "0",
            top: "0",
            width: "420px",
            minWidth: "420px",
            maxWidth: "420px",
            overflow: "visible",
            borderRadius: "24px",
            background: "#ffffff",
            zIndex: "-1",
            pointerEvents: "none",
          }}
        >
          {/* ========================================================
              EN-TÊTE
              ======================================================== */}

          <div
            className={`bg-gradient-to-br ${couleurParties} px-5 py-5 text-white`}
          >
            <div className="flex items-center gap-3">

              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                <Dices size={27} />
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-purple-200">
                  La Loi des Cartes
                </div>

                <div className="text-xl font-black">
                  NOUVELLE PARTIE
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================
              CONTENU
              ======================================================== */}

          <div className="p-4">

            {/* Jeu + couverture */}

            {partieAPartager.jeux?.couverture_url && (
              <div className="flex justify-center mb-2">
                <img
                  src={partieAPartager.jeux.couverture_url}
                  alt={partieAPartager.jeux?.nom || "Jeu"}
                  crossOrigin="anonymous"
                  className="w-28 h-28 object-contain rounded-2xl shadow-md"
                />
              </div>
            )}

            <h2 className="text-xl font-black text-gray-900 text-center leading-tight">
              {partieAPartager.jeux?.nom || "Jeu"}
            </h2>

            {/* Date + heure */}

            <div className="grid grid-cols-2 gap-2 mt-3">

              <div className="bg-purple-50 rounded-xl px-3 py-2">
                <div className="text-[9px] uppercase font-bold text-purple-500">
                  📅 Date
                </div>

                <div className="text-xs font-black text-gray-800 capitalize">
                  {formatDate(partieAPartager.date_partie)}
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl px-3 py-2">
                <div className="text-[9px] uppercase font-bold text-indigo-500">
                  🕐 Heure
                </div>

                <div className="text-xs font-black text-gray-800">
                  {formatHeure(partieAPartager.heure_partie)}
                </div>
              </div>

            </div>

            {/* Durée + places */}

            <div className="grid grid-cols-2 gap-2 mt-2">

              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <div className="text-[9px] uppercase font-bold text-gray-400">
                  ⏱️ Durée
                </div>

                <div className="text-xs font-black text-gray-800">
                  {partieAPartager.jeux?.duree
                    ? `${partieAPartager.jeux.duree} min`
                    : "—"}
                </div>
              </div>

              {partieAPartager.jeux?.max_joueurs > 0 ? (
                <div className="bg-emerald-50 rounded-xl px-3 py-2">
                  <div className="text-[9px] uppercase font-bold text-emerald-600">
                    👥 Places
                  </div>

                  <div className="text-xs font-black text-gray-800">
                    {partieAPartager.inscrits?.length || 0}/
                    {partieAPartager.jeux.max_joueurs}
                  </div>
                </div>
              ) : (
                <div />
              )}

            </div>

            {/* Lieu */}

            {partieAPartager.lieu && (
              <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <MapPin
                  size={15}
                  className="text-purple-600 flex-shrink-0"
                />

                <span className="text-xs font-bold text-gray-700">
                  {partieAPartager.lieu}
                </span>
              </div>
            )}

            {/* Description */}

            {partieAPartager.description && (
              <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2">
                <div className="text-[9px] uppercase font-bold text-gray-400">
                  📝 Description
                </div>

                <div className="text-xs font-semibold text-gray-700 mt-0.5 leading-snug">
                  {partieAPartager.description}
                </div>
              </div>
            )}

            {/* Statut places */}

            {partieAPartager.jeux?.max_joueurs > 0 && (
              <div
                className={`mt-2 text-[11px] font-bold text-center rounded-lg py-1.5 ${
                  (partieAPartager.inscrits?.length || 0) >=
                  partieAPartager.jeux.max_joueurs
                    ? "bg-red-50 text-red-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {(partieAPartager.inscrits?.length || 0) >=
                partieAPartager.jeux.max_joueurs
                  ? "🔴 Partie complète"
                  : `🟢 ${
                      partieAPartager.jeux.max_joueurs -
                      (partieAPartager.inscrits?.length || 0)
                    } place${
                      partieAPartager.jeux.max_joueurs -
                        (partieAPartager.inscrits?.length || 0) >
                      1
                        ? "s"
                        : ""
                    } restante${
                      partieAPartager.jeux.max_joueurs -
                        (partieAPartager.inscrits?.length || 0) >
                      1
                        ? "s"
                        : ""
                    }`}
              </div>
            )}

            {/* Signature */}

            <div className="mt-3 pt-2 border-t border-gray-100 text-center">
              <div className="text-xs font-black text-indigo-900">
                🎲 La Loi des Cartes
              </div>

              <div className="text-[9px] text-gray-400 font-semibold">
                laloidescartes.vercel.app
              </div>
            </div>

          </div>
        </div>
      )}
      <div className="min-h-screen px-4 py-6 md:px-6">

        {/* ========================================================
            EN-TÊTE
            ======================================================== */}

        <section
          className={`relative max-w-[1600px] mx-auto overflow-hidden rounded-[2rem] shadow-2xl bg-gradient-to-br ${couleurParties}`}
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
                  PARTIES
                  <span className="block text-purple-300">
                    À VENIR
                  </span>
                </h1>

                <p className="mt-3 text-purple-100 text-base md:text-lg">
                  Retrouvez les prochaines parties du club,
                  inscrivez-vous et venez jouer !
                </p>

              </div>

              {/* Boutons */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3">

                <button
                  onClick={() => {
                    setErrorMsg("");
                    setShowModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-900 font-black shadow-xl hover:-translate-y-0.5 hover:shadow-2xl transition-all"
                >
                  <Plus size={20} />
                  Créer une partie
                </button>

                <Link
                  to="/archives"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition"
                >
                  <Archive size={19} />
                  Voir les archives
                </Link>

              </div>

            </div>

          </div>
        </section>

        {/* ========================================================
            RECHERCHE
            ======================================================== */}

        <div className="max-w-[1600px] mx-auto mt-6">

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-3">

            <div className="relative">

              <Search
                size={21}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Rechercher une partie, un jeu, un lieu, une date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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

          </div>

        </div>

        {/* ========================================================
            MODAL CREATION
            ======================================================== */}

        {showModal && (
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setShowModal(false);
              }
            }}
          >

            <div className="relative z-[101] bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden">

              {/* Header modal */}
              <div
                className={`relative bg-gradient-to-br ${couleurParties} px-6 py-6 text-white`}
              >

                <button
                  onClick={() => setShowModal(false)}
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
                      Nouvelle partie
                    </h2>
                  </div>

                </div>

              </div>

              {/* Formulaire */}
              <div className="p-6">

                {errorMsg && (
                  <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700">
                    <AlertCircle
                      size={20}
                      className="flex-shrink-0 mt-0.5"
                    />
                    <p className="text-sm font-medium">
                      {errorMsg}
                    </p>
                  </div>
                )}

                {/* Jeu */}
                <label className="block mb-1.5 text-sm font-bold text-gray-700">
                  Jeu
                </label>

                <select
                  value={newPartie.jeu_id}
                  onChange={(e) =>
                    setNewPartie((prev) => ({
                      ...prev,
                      jeu_id: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Choisir un jeu</option>

                  {jeux.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nom}
                    </option>
                  ))}

                </select>

                <div className="grid grid-cols-2 gap-3">

                  {/* Date */}
                  <div>

                    <label className="block mb-1.5 text-sm font-bold text-gray-700">
                      Date
                    </label>

                    <input
                      type="date"
                      value={newPartie.date_partie}
                      onChange={(e) =>
                        setNewPartie((p) => ({
                          ...p,
                          date_partie: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />

                  </div>

                  {/* Heure */}
                  <div>

                    <label className="block mb-1.5 text-sm font-bold text-gray-700">
                      Heure
                    </label>

                    <input
                      type="time"
                      value={newPartie.heure_partie}
                      onChange={(e) =>
                        setNewPartie((p) => ({
                          ...p,
                          heure_partie: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />

                  </div>

                </div>

                {/* Description */}
                <label className="block mt-4 mb-1.5 text-sm font-bold text-gray-700">
                  Description
                </label>

                <input
                  type="text"
                  placeholder="Ex. Partie découverte..."
                  value={newPartie.description}
                  onChange={(e) =>
                    setNewPartie((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                {/* Lieu */}
                <label className="block mt-4 mb-1.5 text-sm font-bold text-gray-700">
                  Lieu
                </label>

                <input
                  type="text"
                  placeholder="Ex. Maison des associations"
                  value={newPartie.lieu}
                  onChange={(e) =>
                    setNewPartie((p) => ({
                      ...p,
                      lieu: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                {/* Boutons */}
                <div className="flex gap-3 mt-6">

                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition"
                  >
                    Annuler
                  </button>

                  <button
                    onClick={addPartie}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    Créer la partie
                  </button>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ========================================================
            TITRE RESULTATS
            ======================================================== */}

        <div className="max-w-[1600px] mx-auto mt-8 mb-4 flex items-center justify-between">

          <div>

            <h2 className="text-xl md:text-2xl font-black text-gray-900">
              Prochaines parties
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {filterParties(parties).length} partie
              {filterParties(parties).length > 1 ? "s" : ""} à venir
            </p>

          </div>

        </div>

        {/* ========================================================
            LISTE DES PARTIES
            ======================================================== */}

        <div className="max-w-[1600px] mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">

          {filterParties(parties).map((p) => {

            const isInscrit = p.inscrits?.some(
              (i) => i.utilisateur_id === currentUser.id
            );

            const maxJoueurs = p.jeux?.max_joueurs || 0;

            const nombreInscrits = p.inscrits?.length || 0;

            const placesRestantes = Math.max(
              maxJoueurs - nombreInscrits,
              0
            );

            const partieComplete =
              placesRestantes <= 0 && maxJoueurs > 0;

            return (
              <div
                id={`partie-${p.id}`}
                key={p.id}
                className={`group relative bg-white rounded-[1.5rem] shadow-lg border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                  highlightedPartie === p.id
                    ? "border-yellow-500 ring-4 ring-yellow-300"
                    : "border-gray-100"
                }`}
              >

                
              {/* COUVERTURE + BADGES SUPERPOSÉS */}
              <div className="relative isolate z-30 bg-gradient-to-br from-gray-50 to-gray-100 p-4">

                {/* Couverture principale */}
                <div className="relative z-0">
                  {p.jeux?.couverture_url ? (
                    p.jeux.bgg_api ? (
                      <a
                        href={`https://boardgamegeek.com/boardgame/${p.jeux.bgg_api}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={p.jeux.couverture_url}
                          alt={p.jeux.nom}
                          className="w-full h-48 object-contain rounded-xl"
                        />
                      </a>
                    ) : (
                      <img
                        src={p.jeux.couverture_url}
                        alt={p.jeux.nom}
                        className="w-full h-48 object-contain rounded-xl"
                      />
                    )
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                      <Dices size={40} />
                      <span className="text-sm mt-2">Pas de couverture</span>
                    </div>
                  )}
                </div>

                {/* Compteur des extensions avec infobulle */}
                {p.jeux?.extensions?.length > 0 && (
                  <div
                    className="absolute top-3 left-3 z-[70]"
                    onMouseEnter={() => setExtensionsOuvertes(p.id)}
                    onMouseLeave={() => setExtensionsOuvertes(null)}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExtensionsOuvertes(current =>
                          current === p.id ? null : p.id
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-lg hover:bg-purple-700 transition"
                    >
                      <Dices size={14} />
                      +{p.jeux.extensions.length} extensions
                    </button>

                    {extensionsOuvertes === p.id && (
                      <div className="absolute left-0 top-full mt-2 w-64 max-h-64 overflow-y-auto rounded-xl bg-white shadow-2xl border border-gray-200 p-2">
                        {p.jeux.extensions.map((extension, index) => (
                          <div
                            key={extension.id || index}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                          >
                            {extension.couverture_url || extension.couverture_bgg_url ? (
                              <img
                                src={extension.couverture_url || extension.couverture_bgg_url}
                                alt={extension.nom}
                                className="w-10 h-14 object-cover rounded shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-14 flex items-center justify-center bg-gray-100 rounded">
                                <Dices size={18} className="text-gray-400" />
                              </div>
                            )}

                            <span className="text-sm font-medium text-gray-700">
                              {extension.nom || "Extension sans nom"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Statistiques en haut à droite */}
                <div className="absolute top-3 right-3 z-[60] flex flex-col items-end gap-1.5">

                  {Number(p.jeux?.fav) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white shadow-lg">
                      <Heart size={12} fill="currentColor" />
                      {p.jeux.fav}
                    </span>
                  )}

                  {Number(p.jeux?.note) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400 px-2.5 py-1 text-xs font-black text-gray-900 shadow-lg">
                      <Star size={12} fill="currentColor" />
                      {Number(p.jeux.note).toFixed(1)}
                    </span>
                  )}

                  {Number(p.jeux?.poids) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                      <Scale size={12} />
                      {Number(p.jeux.poids).toFixed(2)}
                    </span>
                  )}

                  {/* Meilleur score */}
                  {Number(p.jeux?.best_score) > 0 && (
                    <div className="relative isolate">
                      <button
                        type="button"
                        onMouseEnter={() => setScoresOuverts(p.id)}
                        onMouseLeave={() => setScoresOuverts(null)}
                        onClick={() =>
                          setScoresOuverts(scoresOuverts === p.id ? null : p.id)
                        }
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold shadow"
                      >
                        <Trophy size={13} />
                        {p.jeux.best_score}
                      </button>

                      {scoresOuverts === p.id && (
                        <div
                          onMouseEnter={() => setScoresOuverts(p.id)}
                          onMouseLeave={() => setScoresOuverts(null)}
                          className="absolute right-0 top-full mt-2 w-56 p-3 rounded-xl bg-white shadow-xl border border-gray-200 z-[80]"
                        >
                          <p className="text-sm font-bold text-gray-800 mb-1">
                            Meilleur score
                          </p>
                          <p className="text-sm text-amber-700 font-semibold mb-2">
                            🏆 {p.jeux.best_score} points
                          </p>

                          {(p.jeux?.bestUsers || []).map((user, index) => (
                            <p key={index} className="text-xs text-gray-600">
                              {user.nom}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Badge Règles en bas à gauche */}
                {p.jeux?.regle_youtube && (
                  <a
                    href={p.jeux.regle_youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 left-3 z-[40] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold shadow-lg hover:bg-red-700 transition"
                  >
                    <BookOpen size={14} />
                    Règles
                  </a>
                )}

                
                {/* Couvertures des extensions en bas à droite avec survol */}
                {p.jeux?.extensions?.length > 0 && (
                  <div className="absolute bottom-3 right-3 z-20 flex items-end justify-end">
                    {p.jeux.extensions.slice(0, 5).map((extension, index) => {
                      const image =
                        extension.couverture_url || extension.couverture_bgg_url;

                      return (
                        <div
                          key={extension.id || index}
                          className="group relative -ml-3 rounded-md border-2 border-white shadow-lg overflow-visible bg-white"
                          style={{
                            rotate: `${
                              (index - (Math.min(p.jeux.extensions.length, 5) - 1) / 2) * 7
                            }deg`,
                            zIndex: index + 1,
                          }}
                        >
                          {/* Couverture */}
                          {image ? (
                            <img
                              src={image}
                              alt={extension.nom}
                              className="h-16 w-12 object-cover rounded-sm"
                            />
                          ) : (
                            <div className="h-16 w-12 flex items-center justify-center bg-purple-100 rounded-sm">
                              <Dices size={18} className="text-purple-500" />
                            </div>
                          )}

                          {/* Infobulle au survol */}
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[100] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <div className="w-48 rounded-xl bg-gray-900 text-white text-xs p-3 shadow-2xl text-center">
                              {image && (
                                <img
                                  src={image}
                                  alt={extension.nom}
                                  className="w-16 h-20 object-cover rounded-md mx-auto mb-2 shadow"
                                />
                              )}

                              <p className="font-semibold leading-snug">
                                {extension.nom || "Extension sans nom"}
                              </p>
                            </div>

                            {/* Petite flèche */}
                            <div className="w-3 h-3 bg-gray-900 rotate-45 mx-auto -mt-1.5" />
                          </div>
                        </div>
                      );
                    })}

                    {/* Nombre d'extensions supplémentaires */}
                    {p.jeux.extensions.length > 5 && (
                      <span className="relative z-10 ml-1 px-2 py-1 rounded-full bg-purple-600 text-white text-xs font-bold shadow">
                        +{p.jeux.extensions.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>

                {/* ==================================================
                    CONTENU
                    ================================================== */}

                <div className="p-5">

                  {/* Jeu */}
                  <h3 className="text-xl font-black text-gray-900 text-center leading-tight">
                    {p.jeux?.nom}
                  </h3>

                  {/* Date */}
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

                  {/* Heure + durée */}
                  <div className="grid grid-cols-2 gap-2 mt-2">

                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">

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

                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">

                      <Clock3
                        size={17}
                        className="text-gray-500 flex-shrink-0"
                      />

                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400">
                          Durée
                        </p>

                        <p className="text-sm font-black text-gray-800">
                          {p.jeux?.duree
                            ? `${p.jeux.duree} min`
                            : "—"}
                        </p>
                      </div>

                    </div>

                  </div>

                  {/* Lieu */}
                  {p.lieu && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 px-1">

                      <MapPin
                        size={17}
                        className="text-purple-600 flex-shrink-0"
                      />

                      <span className="font-semibold">
                        {p.lieu}
                      </span>

                    </div>
                  )}

                  {/* Description */}
                  {p.description && (
                    <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5">

                      <p className="text-sm text-gray-600 leading-relaxed">
                        {p.description}
                      </p>

                    </div>
                  )}

                  {/* ==================================================
                      INSCRITS
                      ================================================== */}

                  <div className="mt-4">

                    <div className="flex items-center justify-between mb-2">

                      <div className="flex items-center gap-2">

                        <Users
                          size={17}
                          className="text-indigo-600"
                        />

                        <span className="text-sm font-black text-gray-800">
                          Joueurs
                        </span>

                      </div>

                      {maxJoueurs > 0 && (
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-full ${
                            partieComplete
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {nombreInscrits}/{maxJoueurs}
                        </span>
                      )}

                    </div>

                    <div className="space-y-1.5">

                      {p.inscrits?.length > 0 ? (
                        p.inscrits.map((i, index) => (
                          <div
                            key={
                              i.utilisateur_id ||
                              `inscrit-${p.id}-${index}`
                            }
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100"
                          >

                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black">
                              {(i.profil?.nom || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <span className="font-semibold text-sm text-gray-700 truncate">
                              {i.profil?.nom || "Joueur"}
                            </span>

                            {i.utilisateur_id === currentUser.id && (
                              <CheckCircle2
                                size={15}
                                className="ml-auto text-emerald-500"
                              />
                            )}

                          </div>
                        ))
                      ) : (
                        <div className="text-center py-3 text-sm text-gray-400 bg-gray-50 rounded-xl">
                          Aucun joueur inscrit pour le moment
                        </div>
                      )}

                    </div>

                    {/* Places restantes */}
                    {maxJoueurs > 0 && (
                      <div
                        className={`mt-2 text-xs font-bold text-center rounded-lg py-1.5 ${
                          partieComplete
                            ? "bg-red-50 text-red-600"
                            : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {partieComplete
                          ? "🔴 Partie complète"
                          : `🟢 ${placesRestantes} place${
                              placesRestantes > 1 ? "s" : ""
                            } restante${
                              placesRestantes > 1 ? "s" : ""
                            }`}
                      </div>
                    )}

                  </div>

                  {/* ==================================================
                      ACTIONS
                      ================================================== */}

                  <div className="mt-4 space-y-2">

                    {/* Inscription — NE PAS MODIFIER */}
                    <button
                      onClick={() => toggleInscription(p)}
                      disabled={
                        !isInscrit &&
                        partieComplete
                      }
                      className={`w-full px-4 py-3 rounded-xl text-white font-black shadow-md transition-all flex items-center justify-center gap-2 ${
                        isInscrit
                          ? "bg-red-600 hover:bg-red-700 hover:-translate-y-0.5"
                          : partieComplete
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-emerald-500 to-green-600 hover:-translate-y-0.5 hover:shadow-lg"
                      }`}
                    >
                      {isInscrit ? (
                        <>
                          <X size={18} />
                          Se désinscrire
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          {partieComplete
                            ? "Partie complète"
                            : "S'inscrire"}
                        </>
                      )}
                    </button>

                    {/* ==================================================
                        ACTIONS SECONDAIRES
                        ================================================== */}

                    {(p.utilisateur_id === currentUser.id ||
                      userRole === "admin") ? (

                      /* Créateur / organisateur / admin */
                      <div className="flex gap-2 pt-1">

                        {/* WhatsApp */}
                        <button
                          onClick={() => shareOnWhatsApp(p)}
                          className="flex-1 h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-md transition-all hover:-translate-y-0.5"
                          title="Partager sur WhatsApp"
                          aria-label="Partager sur WhatsApp"
                        >
                          <Share2 size={18} />
                        </button>

                        {/* Modifier */}
                        <button
                          onClick={() =>
                            setEditingPartie(p)
                          }
                          className="flex-1 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md hover:bg-amber-600 transition"
                          title="Modifier"
                          aria-label="Modifier"
                        >
                          <Pencil size={17} />
                        </button>

                        {/* Supprimer */}
                        <button
                          onClick={async () => {
                            if (
                              !window.confirm(
                                "Supprimer cette partie ?"
                              )
                            ) {
                              return;
                            }

                            await supabase
                              .from("parties")
                              .delete()
                              .eq("id", p.id);

                            fetchParties();
                          }}
                          className="flex-1 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition"
                          title="Supprimer"
                          aria-label="Supprimer"
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>

                    ) : (

                      /* Utilisateur normal */
                      <button
                        onClick={() => shareOnWhatsApp(p)}
                        className="w-full px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold flex items-center justify-center gap-2 shadow-md transition-all hover:-translate-y-0.5"
                      >
                        <Share2 size={17} />
                        Partager sur WhatsApp
                      </button>

                    )}

                  </div>

                </div>

              </div>
            );
          })}

        </div>

        {/* ========================================================
            AUCUN RESULTAT
            ======================================================== */}

        {filterParties(parties).length === 0 && (
          <div className="max-w-2xl mx-auto mt-10 mb-12">

            <div className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-10 text-center">

              <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Dices size={32} />
              </div>

              <h3 className="mt-5 text-xl font-black text-gray-900">
                {search
                  ? "Aucune partie trouvée"
                  : "Aucune partie à venir"}
              </h3>

              <p className="mt-2 text-gray-500">
                {search
                  ? "Essayez avec un autre terme de recherche."
                  : "Il n'y a actuellement aucune partie programmée."}
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
            EDITION
            ======================================================== */}

        {editingPartie && (
          <EditPartie
            partie={editingPartie}
            onClose={() => setEditingPartie(null)}
            onUpdate={fetchParties}
          />
        )}
      </div>
    </>
  );
}