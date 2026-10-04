// src/AdminReseaux.jsx
import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { toPng } from "html-to-image";

import AdminMenu from "./AdminMenu";
import {
  CalendarDays,
  Clock3,
  Download,
  Dices,
  Loader2,
  MapPin,
  RefreshCw,
  Share2,
  Users,
} from "lucide-react";

const LOGO_URL =
  "https://laloidescartes.vercel.app/logo_loidc_Complet_250.png";

const ADRESSE = "Maison des associations";
const ADRESSE_COMPLETE =
  "2 Rue Albert Leroy, 62170 Neuville-sous-Montreuil";
const ADRESSE_APP = "laloidescartes.vercel.app";
const TELEPHONE = "06 44 17 10 82";
const EMAIL = "laloidescartes@gmail.com";

export default function AdminReseaux({ profil }) {
  const [prochaineDate, setProchaineDate] = useState(null);
  const [parties, setParties] = useState([]);
  const [jeuxAleatoires, setJeuxAleatoires] = useState([]);

  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState("");

  const [partageEnCours, setPartageEnCours] = useState(null);

  const instagramRef = useRef(null);
  const facebookRef = useRef(null);

  // ---------------------------------------------------------
  // OUTILS
  // ---------------------------------------------------------

  const obtenirDateAujourdhui = () => {
    const maintenant = new Date();

    return `${maintenant.getFullYear()}-${String(
      maintenant.getMonth() + 1
    ).padStart(2, "0")}-${String(maintenant.getDate()).padStart(2, "0")}`;
  };

  const formaterDate = (dateString) => {
    if (!dateString) return null;

    const date = new Date(`${dateString}T12:00:00`);

    return {
      jour: date.toLocaleDateString("fr-FR", {
        weekday: "long",
      }),
      numero: date.toLocaleDateString("fr-FR", {
        day: "numeric",
      }),
      mois: date.toLocaleDateString("fr-FR", {
        month: "long",
      }),
      complet: date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  };

  const formaterHeure = (heure) => {
    if (!heure) return "";

    return heure.slice(0, 5);
  };

  const estTypePersonnalise = (type) => {
    return typeof type === "string" && type.startsWith("custom|");
  };

  const getEmojiTypePersonnalise = (type) => {
    if (!estTypePersonnalise(type)) return "";

    const morceaux = type.split("|");

    return morceaux[1] || "";
  };

  const getNomTypePersonnalise = (type) => {
    if (!estTypePersonnalise(type)) return "";

    const morceaux = type.split("|");

    return morceaux.slice(2).join("|") || "";
  };

  const getLibelleTypeEvenement = (type) => {
    if (type === "soiree") return "🌙 Soirée jeux";

    if (type === "apres_midi") return "☀️ Après-midi jeux";

    if (estTypePersonnalise(type)) {
      const emoji = getEmojiTypePersonnalise(type);
      const nom = getNomTypePersonnalise(type);

      return `${emoji} ${nom}`.trim();
    }

    return "🎲 Rencontre jeux";
  };

  const melangerTableau = (tableau) => {
    const resultat = [...tableau];

    for (let i = resultat.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [resultat[i], resultat[j]] = [resultat[j], resultat[i]];
    }

    return resultat;
  };

  // ---------------------------------------------------------
  // CHARGEMENT DES DONNÉES
  // ---------------------------------------------------------

  const chargerDonnees = async (nouvelleSelectionAleatoire = true) => {
    try {
      setErreur("");

      if (nouvelleSelectionAleatoire) {
        setActualisation(true);
      } else {
        setChargement(true);
      }

      const aujourdHui = obtenirDateAujourdhui();

      // -----------------------------------------------------
      // 1. PROCHAINE DATE
      // -----------------------------------------------------

      const { data: dates, error: erreurDates } = await supabase
        .from("dates_evenements")
        .select(
          "id, date_evenement, type_evenement, heure_debut, heure_fin, texte"
        )
        .eq("actif", true)
        .gte("date_evenement", aujourdHui)
        .order("date_evenement", { ascending: true })
        .order("heure_debut", { ascending: true });

      if (erreurDates) {
        throw erreurDates;
      }

      if (!dates || dates.length === 0) {
        setProchaineDate(null);
        setParties([]);
        setJeuxAleatoires([]);
        return;
      }

      const dateSuivante = dates[0].date_evenement;

      const evenementsDuJour = dates.filter(
        (evenement) => evenement.date_evenement === dateSuivante
      );

      setProchaineDate(evenementsDuJour);

      // -----------------------------------------------------
      // 2. PARTIES DE CETTE DATE
      // -----------------------------------------------------

      const { data: partiesData, error: erreurParties } = await supabase
        .from("parties")
        .select("*, jeux(*)")
        .eq("date_partie", dateSuivante)
        .order("heure_partie", { ascending: true });

      if (erreurParties) {
        throw erreurParties;
      }

      const partiesChargees = partiesData || [];

      setParties(partiesChargees);

      // -----------------------------------------------------
      // 3. JEUX DISPONIBLES POUR LES COUVERTURES ALÉATOIRES
      // -----------------------------------------------------

      const { data: jeuxData, error: erreurJeux } = await supabase
        .from("jeux")
        .select("id, nom, couverture_url")
        .not("couverture_url", "is", null);

      if (erreurJeux) {
        throw erreurJeux;
      }

      const jeuxUtilises = new Set(
        partiesChargees
          .map((partie) => partie.jeu_id)
          .filter((id) => id !== null && id !== undefined)
      );

      const jeuxDisponibles = (jeuxData || []).filter(
        (jeu) =>
          jeu.couverture_url &&
          !jeuxUtilises.has(jeu.id)
      );

      const jeuxMelanges = melangerTableau(jeuxDisponibles);

      setJeuxAleatoires(jeuxMelanges.slice(0, 12));
    } catch (error) {
      console.error("Erreur AdminReseaux :", error);

      setErreur(
        error?.message ||
          "Impossible de charger les informations pour les réseaux sociaux."
      );
    } finally {
      setChargement(false);
      setActualisation(false);
    }
  };

  useEffect(() => {
    chargerDonnees(false);
  }, []);

  // ---------------------------------------------------------
  // IMAGES
  // ---------------------------------------------------------

  const attendreImages = async (element) => {
    if (!element) return;

    const images = Array.from(element.querySelectorAll("img"));

    await Promise.all(
      images.map((image) => {
        if (image.complete && image.naturalWidth > 0) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const terminer = () => resolve();

          image.addEventListener("load", terminer, {
            once: true,
          });

          image.addEventListener("error", terminer, {
            once: true,
          });
        });
      })
    );
  };

  const dataUrlVersBlob = (dataUrl) => {
    const partiesData = dataUrl.split(",");

    const mime =
      partiesData[0].match(/:(.*?);/)?.[1] ||
      "image/png";

    const binaire = atob(partiesData[1]);

    const tableau = new Uint8Array(binaire.length);

    for (let i = 0; i < binaire.length; i++) {
      tableau[i] = binaire.charCodeAt(i);
    }

    return new Blob([tableau], {
      type: mime,
    });
  };

  // ---------------------------------------------------------
  // PARTAGE / TÉLÉCHARGEMENT
  // ---------------------------------------------------------

  const partagerImage = async (format) => {
    const element =
      format === "instagram"
        ? instagramRef.current
        : facebookRef.current;

    if (!element) return;

    const largeur =
      format === "instagram" ? 1080 : 1200;

    const hauteur =
      format === "instagram" ? 1350 : 630;

    const nomFichier =
      format === "instagram"
        ? "agenda-la-loi-des-cartes-instagram.png"
        : "agenda-la-loi-des-cartes-facebook.png";

    setPartageEnCours(format);

    const ancienStyle = {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      zIndex: element.style.zIndex,
      opacity: element.style.opacity,
      pointerEvents: element.style.pointerEvents,
      transform: element.style.transform,
    };

    try {
      element.style.position = "fixed";
      element.style.left = "0";
      element.style.top = "0";
      element.style.zIndex = "999999";
      element.style.opacity = "1";
      element.style.pointerEvents = "none";
      element.style.transform = "none";

      await new Promise((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(resolve)
        )
      );

      await attendreImages(element);

      const dataUrl = await toPng(element, {
        width: largeur,
        height: hauteur,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: "#111827",
      });

      const blob = dataUrlVersBlob(dataUrl);

      const fichier = new File(
        [blob],
        nomFichier,
        {
          type: "image/png",
        }
      );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [fichier],
        })
      ) {
        await navigator.share({
          title: "La Loi des Cartes",
          text: "🎲 La prochaine rencontre de La Loi des Cartes !",
          files: [fichier],
        });

        return;
      }

      const url = URL.createObjectURL(blob);

      const lien = document.createElement("a");

      lien.href = url;
      lien.download = nomFichier;

      document.body.appendChild(lien);

      lien.click();

      lien.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error(
          `Erreur partage ${format} :`,
          error
        );

        setErreur(
          `Impossible de générer l'image ${format}.`
        );
      }
    } finally {
      element.style.position = ancienStyle.position;
      element.style.left = ancienStyle.left;
      element.style.top = ancienStyle.top;
      element.style.zIndex = ancienStyle.zIndex;
      element.style.opacity = ancienStyle.opacity;
      element.style.pointerEvents =
        ancienStyle.pointerEvents;
      element.style.transform =
        ancienStyle.transform;

      setPartageEnCours(null);
    }
  };

  // ---------------------------------------------------------
  // DONNÉES D'AFFICHAGE
  // ---------------------------------------------------------

  const evenementPrincipal =
    prochaineDate?.[0] || null;

  const dateFormatee = formaterDate(
    evenementPrincipal?.date_evenement
  );

  const libelleEvenement =
    getLibelleTypeEvenement(
      evenementPrincipal?.type_evenement
    );

  const nombreParties = parties.length;

  // ---------------------------------------------------------
  // COULEURS
  // ---------------------------------------------------------

  const couleursAgenda = [
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

  const indexCouleur =
    evenementPrincipal?.date_evenement
      ? new Date(
          `${evenementPrincipal.date_evenement}T12:00:00`
        ).getDate()
      : new Date().getDate();

  const couleur =
    couleursAgenda[
      (indexCouleur - 1) % couleursAgenda.length
    ];

  // ---------------------------------------------------------
  // CHARGEMENT
  // ---------------------------------------------------------
  if (!profil || profil.role !== "admin") {
    return (
      <Navigate
        to="/profil"
        replace
      />
    );
  }
  if (chargement) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <Loader2
            size={36}
            className="animate-spin"
          />

          <p className="font-medium">
            Préparation de la publication…
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // AUCUNE DATE
  // ---------------------------------------------------------

  if (!prochaineDate || prochaineDate.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 text-center">
          <CalendarDays
            size={48}
            className="mx-auto mb-4 text-gray-400"
          />

          <h1 className="text-2xl font-black text-gray-800 mb-2">
            Publications réseaux sociaux
          </h1>

          <p className="text-gray-500">
            Aucune prochaine date active n'a été trouvée.
          </p>

          <button
            type="button"
            onClick={() => chargerDonnees(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition"
          >
            <RefreshCw size={18} />
            Actualiser
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDU
  // =========================================================

  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        <AdminMenu profil={profil} />

        <div className="max-w-7xl mx-auto">
          {/* --------------------------------------------------- */}
          {/* EN-TÊTE ADMIN */}
          {/* --------------------------------------------------- */}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-gray-900">
                Publications réseaux sociaux
              </h1>

              <p className="text-gray-500 mt-1">
                Génère automatiquement les visuels de la
                prochaine rencontre.
              </p>
            </div>

            <button
              type="button"
              onClick={() => chargerDonnees(true)}
              disabled={actualisation}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 disabled:opacity-50 transition"
            >
              <RefreshCw
                size={17}
                className={
                  actualisation
                    ? "animate-spin"
                    : ""
                }
              />

              {actualisation
                ? "Nouvelle sélection…"
                : "Nouveaux jeux"}
            </button>
          </div>

          {/* --------------------------------------------------- */}
          {/* ERREUR */}
          {/* --------------------------------------------------- */}

          {erreur && (
            <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 p-4">
              <p className="font-bold">
                Une erreur est survenue
              </p>

              <p className="text-sm mt-1">
                {erreur}
              </p>
            </div>
          )}

          {/* --------------------------------------------------- */}
          {/* RÉSUMÉ DE LA PROCHAINE DATE */}
          {/* --------------------------------------------------- */}

          <div
            className={`rounded-3xl bg-gradient-to-br ${couleur} text-white shadow-xl overflow-hidden mb-8`}
          >
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* DATE */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 text-center min-w-[150px] border border-white/10">
                  <div className="text-sm uppercase tracking-wider font-bold opacity-80">
                    {dateFormatee?.jour}
                  </div>

                  <div className="text-6xl font-black leading-none my-1">
                    {dateFormatee?.numero}
                  </div>

                  <div className="capitalize font-bold">
                    {dateFormatee?.mois}
                  </div>
                </div>

                {/* INFOS */}
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-sm font-bold mb-3">
                    <Dices size={16} />

                    {libelleEvenement}
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black capitalize">
                    Prochaine rencontre
                  </h2>

                  {evenementPrincipal?.heure_debut && (
                    <div className="flex items-center gap-2 mt-3 text-white/90">
                      <Clock3 size={18} />

                      <span>
                        {formaterHeure(
                          evenementPrincipal.heure_debut
                        )}

                        {evenementPrincipal.heure_fin
                          ? ` – ${formaterHeure(
                              evenementPrincipal.heure_fin
                            )}`
                          : ""}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2 text-white/90">
                    <MapPin size={18} />

                    <span>
                      {ADRESSE} — {ADRESSE_COMPLETE}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-white/90">
                    <Users size={18} />

                    <span>
                      {nombreParties === 0
                        ? "Aucune partie programmée pour le moment"
                        : `${nombreParties} ${
                            nombreParties > 1
                              ? "parties"
                              : "partie"
                          } programmée${
                            nombreParties > 1
                              ? "s"
                              : ""
                          }`}
                    </span>
                  </div>

                  {evenementPrincipal?.texte && (
                    <p className="mt-4 text-white/80 text-sm max-w-2xl">
                      {evenementPrincipal.texte}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------- */}
          {/* PARTIES DU JOUR */}
          {/* --------------------------------------------------- */}

          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Parties programmées
                </h2>

                <p className="text-sm text-gray-500">
                  Les parties actuellement prévues pour cette
                  date.
                </p>
              </div>
            </div>

            {parties.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-500">
                Aucune partie n'est encore programmée pour cette
                date.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {parties.map((partie) => (
                  <div
                    key={partie.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    <div className="flex gap-4 p-4">
                      {partie.jeux?.couverture_url ? (
                        <img
                          src={partie.jeux.couverture_url}
                          alt={
                            partie.jeux.nom ||
                            "Jeu"
                          }
                          crossOrigin="anonymous"
                          className="w-24 h-24 object-cover rounded-xl shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Dices
                            size={32}
                            className="text-gray-400"
                          />
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="font-black text-gray-900 truncate">
                          {partie.jeux?.nom ||
                            partie.nom ||
                            "Partie"}
                        </h3>

                        {partie.heure_partie && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-2">
                            <Clock3 size={14} />

                            {formaterHeure(
                              partie.heure_partie
                            )}
                          </div>
                        )}

                        {partie.lieu && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                            <MapPin size={14} />

                            <span className="truncate">
                              {partie.lieu}
                            </span>
                          </div>
                        )}

                        {partie.max_joueurs && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                            <Users size={14} />

                            {partie.max_joueurs} joueurs max
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* --------------------------------------------------- */}
          {/* JEUX ALÉATOIRES */}
          {/* --------------------------------------------------- */}

          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  🎲 Jeux à découvrir
                </h2>

                <p className="text-sm text-gray-500">
                  Sélection aléatoire parmi les jeux disponibles
                  dans la ludothèque.
                </p>
              </div>

              <span className="text-sm font-bold text-gray-400">
                {jeuxAleatoires.length} couvertures
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {jeuxAleatoires.map((jeu) => (
                <div
                  key={jeu.id}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm"
                  title={jeu.nom}
                >
                  <img
                    src={jeu.couverture_url}
                    alt={jeu.nom}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                    <p className="text-white text-xs font-bold line-clamp-2">
                      {jeu.nom}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* =================================================== */}
          {/* APERÇUS */}
          {/* =================================================== */}

          <section>
            <div className="mb-5">
              <h2 className="text-2xl font-black text-gray-900">
                Aperçus des publications
              </h2>

              <p className="text-gray-500">
                Les visuels ci-dessous sont exactement ceux qui
                seront générés.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              {/* ================================================= */}
              {/* INSTAGRAM */}
              {/* ================================================= */}

              <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-gray-900">
                      Instagram
                    </h3>

                    <p className="text-xs text-gray-500">
                      1080 × 1350 px
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      partagerImage("instagram")
                    }
                    disabled={
                      partageEnCours === "instagram"
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition"
                  >
                    {partageEnCours ===
                    "instagram" ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : navigator.share ? (
                      <Share2 size={16} />
                    ) : (
                      <Download size={16} />
                    )}

                    {partageEnCours === "instagram"
                      ? "Génération…"
                      : "Partager"}
                  </button>
                </div>

                <div className="bg-gray-100 p-4 overflow-auto">
                  <div
                    className="mx-auto"
                    style={{
                      width: "378px",
                      height: "472.5px",
                    }}
                  >
                    <div
                      ref={instagramRef}
                      style={{
                        width: "1080px",
                        height: "1350px",
                        transform: "scale(0.35)",
                        transformOrigin: "top left",
                      }}
                      className={`relative bg-gradient-to-br ${couleur} text-white overflow-hidden`}
                    >
                      {/* HEADER */}
                      <div className="px-[70px] pt-[55px]">
                        <div className="flex items-start justify-between gap-[35px]">
                          {/* GAUCHE : LOGO + TITRE */}
                          <div className="min-w-0 flex-1">
                            <div className="bg-white rounded-[35px] p-[22px] inline-flex">
                              <img
                                src={LOGO_URL}
                                alt="La Loi des Cartes"
                                crossOrigin="anonymous"
                                className="w-[180px] h-auto object-contain"
                              />
                            </div>

                            <div className="mt-[25px]">
                              <div className="text-[30px] uppercase tracking-[6px] font-bold text-white/70">
                                La Loi des Cartes
                              </div>

                              <div className="text-[70px] leading-[0.95] font-black uppercase mt-[8px]">
                                Prochaine
                                <br />
                                rencontre
                              </div>
                            </div>
                          </div>

                          {/* DROITE : DATE */}
                          <div className="bg-white text-gray-900 rounded-[35px] p-[30px] w-[330px] flex-shrink-0 mt-[15px]">
                            <div className="text-center">
                              <div className="text-[25px] uppercase font-bold text-gray-500">
                                {dateFormatee?.jour}
                              </div>

                              <div className="text-[105px] leading-none font-black">
                                {dateFormatee?.numero}
                              </div>

                              <div className="text-[31px] capitalize font-black">
                                {dateFormatee?.mois}
                              </div>
                            </div>

                            <div className="border-t-4 border-gray-200 mt-[20px] pt-[18px]">
                              <div className="text-[25px] font-black leading-tight">
                                {libelleEvenement}
                              </div>

                              {evenementPrincipal?.heure_debut && (
                                <div className="text-[21px] font-bold text-gray-600 mt-[10px]">
                                  🕐{" "}
                                  {formaterHeure(
                                    evenementPrincipal.heure_debut
                                  )}

                                  {evenementPrincipal.heure_fin
                                    ? ` – ${formaterHeure(
                                        evenementPrincipal.heure_fin
                                      )}`
                                    : ""}
                                </div>
                              )}

                              <div className="text-[18px] text-gray-500 mt-[8px] leading-tight">
                                📍 {ADRESSE}
                                <br />
                                <span className="text-[16px]">
                                  {ADRESSE_COMPLETE}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PARTIES */}
                      <div className="mx-[70px] mt-[28px]">
                        <div className="text-[30px] uppercase tracking-[4px] font-black mb-[15px]">
                          Au programme
                        </div>

                        {parties.length === 0 ? (
                          <div className="bg-white/10 rounded-[25px] px-[25px] py-[25px] text-[25px]">
                            Les tables se remplissent bientôt…
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-[18px]">
                            {parties
                              .slice(0, 4)
                              .map((partie) => (
                                <div
                                  key={partie.id}
                                  className="bg-white/10 rounded-[25px] p-[16px] flex gap-[16px] h-[140px]"
                                >
                                  {partie.jeux
                                    ?.couverture_url ? (
                                    <img
                                      src={
                                        partie.jeux
                                          .couverture_url
                                      }
                                      alt=""
                                      crossOrigin="anonymous"
                                      className="w-[108px] h-[108px] object-cover rounded-[16px] flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-[108px] h-[108px] rounded-[16px] bg-white/10 flex items-center justify-center flex-shrink-0">
                                      <Dices
                                        size={45}
                                      />
                                    </div>
                                  )}

                                  <div className="min-w-0 pt-[4px]">
                                    <div className="text-[25px] font-black leading-tight line-clamp-2">
                                      {partie.jeux?.nom ||
                                        partie.nom ||
                                        "Partie"}
                                    </div>

                                    {partie.heure_partie && (
                                      <div className="text-[22px] mt-[10px] text-white/80">
                                        🕐{" "}
                                        {formaterHeure(
                                          partie.heure_partie
                                        )}
                                      </div>
                                    )}

                                    {partie.max_joueurs && (
                                      <div className="text-[20px] mt-[5px] text-white/70">
                                        👥{" "}
                                        {
                                          partie.max_joueurs
                                        }{" "}
                                        places
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        {parties.length > 4 && (
                          <div className="text-[22px] font-bold text-white/70 mt-[10px]">
                            + {parties.length - 4} autres
                            parties programmées
                          </div>
                        )}
                      </div>

                      {/* COUVERTURES */}
                      <div className="mx-[70px] mt-[16px] pb-[70px]">
                        <div className="text-[24px] uppercase tracking-[3px] font-black mb-[8px]">
                          Et plein d'autres jeux à découvrir 🎲
                        </div>

                        <div className="grid grid-cols-6 gap-[8px]">
                          {jeuxAleatoires.slice(0, 12).map((jeu) => (
                            <img
                              key={jeu.id}
                              src={jeu.couverture_url}
                              alt=""
                              crossOrigin="anonymous"
                              className="w-[115px] h-[115px] object-cover rounded-[13px]"
                            />
                          ))}
                        </div>
                      </div>

                      {/* FOOTER */}
                      <div className="absolute left-0 right-0 bottom-0 px-[70px] pb-[22px] bg-gradient-to-t from-black/20 via-transparent to-transparent">
                        <div className="border-t border-white/20 pt-[14px] flex items-center justify-between text-[17px] text-white/75">
                          <div>
                            🌐 {ADRESSE_APP}
                          </div>

                          <div>
                            {EMAIL}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================================================= */}
              {/* FACEBOOK */}
              {/* ================================================= */}

              <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-gray-900">
                      Facebook
                    </h3>

                    <p className="text-xs text-gray-500">
                      1200 × 630 px
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      partagerImage("facebook")
                    }
                    disabled={
                      partageEnCours === "facebook"
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition"
                  >
                    {partageEnCours === "facebook" ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : navigator.share ? (
                      <Share2 size={16} />
                    ) : (
                      <Download size={16} />
                    )}

                    {partageEnCours === "facebook"
                      ? "Génération…"
                      : "Partager"}
                  </button>
                </div>

                <div className="bg-gray-100 p-4 overflow-auto">
                  <div
                    className="mx-auto"
                    style={{
                      width: "660px",
                      height: "346.5px",
                    }}
                  >
                    <div
                      ref={facebookRef}
                      style={{
                        width: "1200px",
                        height: "630px",
                        transform: "scale(0.55)",
                        transformOrigin: "top left",
                      }}
                      className={`relative bg-gradient-to-br ${couleur} text-white overflow-hidden`}
                    >
                      {/* GAUCHE */}
                      <div className="absolute left-[55px] top-[42px] w-[390px]">
                        <div className="bg-white rounded-[28px] p-[18px] inline-flex">
                          <img
                            src={LOGO_URL}
                            alt="La Loi des Cartes"
                            crossOrigin="anonymous"
                            className="w-[155px]"
                          />
                        </div>

                        <div className="text-[21px] uppercase tracking-[4px] font-bold text-white/70 mt-[20px]">
                          La prochaine rencontre
                        </div>

                        <div className="text-[58px] leading-none font-black uppercase mt-[5px]">
                          {dateFormatee?.jour}
                        </div>

                        <div className="flex items-end gap-[12px] mt-[5px]">
                          <div className="text-[88px] leading-none font-black">
                            {dateFormatee?.numero}
                          </div>

                          <div className="text-[30px] capitalize font-black pb-[10px]">
                            {dateFormatee?.mois}
                          </div>
                        </div>

                        <div className="text-[23px] font-bold mt-[7px]">
                          {libelleEvenement}
                        </div>

                        {evenementPrincipal?.heure_debut && (
                          <div className="text-[19px] mt-[4px] text-white/80">
                            🕐{" "}
                            {formaterHeure(
                              evenementPrincipal.heure_debut
                            )}

                            {evenementPrincipal.heure_fin
                              ? ` – ${formaterHeure(
                                  evenementPrincipal.heure_fin
                                )}`
                              : ""}
                          </div>
                        )}

                        <div className="text-[17px] mt-[2px] text-white/80 leading-tight">
                          📍 {ADRESSE}
                          <br />
                          <span className="text-[15px]">
                            {ADRESSE_COMPLETE}
                          </span>
                        </div>
                      </div>

                      {/* DROITE : PARTIES */}
                      <div className="absolute right-[45px] top-[50px] w-[700px] pr-[5px]">
                        <div className="text-[25px] uppercase tracking-[3px] font-black mb-[15px]">
                          🎲 Les parties prévues
                        </div>

                        {parties.length === 0 ? (
                          <div className="bg-white/10 rounded-[25px] p-[25px] text-[23px]">
                            Les tables se remplissent bientôt…
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-[14px]">
                            {parties
                              .slice(0, 4)
                              .map((partie) => (
                                <div
                                  key={partie.id}
                                  className="bg-white/10 rounded-[22px] p-[14px] flex gap-[14px] h-[145px]"
                                >
                                  {partie.jeux
                                    ?.couverture_url ? (
                                    <img
                                      src={
                                        partie.jeux
                                          .couverture_url
                                      }
                                      alt=""
                                      crossOrigin="anonymous"
                                      className="w-[115px] h-[115px] object-cover rounded-[16px] flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-[115px] h-[115px] rounded-[16px] bg-white/10 flex items-center justify-center flex-shrink-0">
                                      <Dices size={40} />
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <div className="text-[24px] font-black leading-tight line-clamp-2">
                                      {partie.jeux?.nom ||
                                        partie.nom ||
                                        "Partie"}
                                    </div>

                                    {partie.heure_partie && (
                                      <div className="text-[19px] mt-[9px] text-white/80">
                                        🕐{" "}
                                        {formaterHeure(
                                          partie.heure_partie
                                        )}
                                      </div>
                                    )}

                                    {partie.max_joueurs && (
                                      <div className="text-[18px] mt-[4px] text-white/70">
                                        👥{" "}
                                        {
                                          partie.max_joueurs
                                        }{" "}
                                        places
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        {parties.length > 4 && (
                          <div className="text-[19px] font-bold text-white/70 mt-[8px]">
                            + {parties.length - 4} autres
                            parties
                          </div>
                        )}
                        {/* JEUX */}
                        <div className="text-[22px] uppercase tracking-[3px] font-black mt-[12px] mb-[7px]">
                          Et plein d'autres jeux à découvrir 🎲
                        </div>

                        <div className="flex gap-[8px] flex-nowrap">
                          {jeuxAleatoires
                            .slice(0, 8)
                            .map((jeu) => (
                              <img
                                key={jeu.id}
                                src={jeu.couverture_url}
                                alt=""
                                crossOrigin="anonymous"
                                className="w-[64px] h-[64px] object-cover rounded-[10px] flex-shrink-0"
                              />
                            ))}
                        </div>
                      </div>

                      {/* FOOTER */}
                      <div className="absolute left-[55px] right-[55px] bottom-[22px] border-t border-white/20 pt-[12px] flex items-center justify-between text-[16px] text-white/70">
                        <div>
                          🌐 {ADRESSE_APP}
                        </div>

                        <div>
                          {EMAIL}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}