import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import CountUp from "react-countup";
import { Phone, Mail } from "lucide-react";
import FacebookWidget from "./FacebookWidget";
import DiaporamaSwiper from "./DiaporamaSwiper";
import { toPng } from "html-to-image";

export default function HomeAssoContent({
  stats,
  countSeanceTotal,
  countAdherentTotal,
  countFollowersFB,
  messagePresident,
  planningImageUrl,
  setZoomOpen,
}) {
  // Références pour les exports réseaux sociaux
  const instagramAgendaRef = useRef(null);
  const facebookAgendaRef = useRef(null);
  // ============================================================
  // DATES DES PROCHAINES RENCONTRES
  // ============================================================

  const [datesEvenements, setDatesEvenements] = useState([]);
  const [chargementDates, setChargementDates] = useState(true);

  useEffect(() => {
    const fetchDatesEvenements = async () => {
      setChargementDates(true);

      // Date du jour en heure locale
      const maintenant = new Date();

      const aujourdHui = `${maintenant.getFullYear()}-${String(
        maintenant.getMonth() + 1
      ).padStart(2, "0")}-${String(
        maintenant.getDate()
      ).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("dates_evenements")
        .select(
          "id, date_evenement, type_evenement, heure_debut, heure_fin, texte"
        )
        .eq("actif", true)
        .gte("date_evenement", aujourdHui)
        .order("date_evenement", { ascending: true })
        .order("heure_debut", { ascending: true });

      if (error) {
        console.error(
          "Erreur lors du chargement des dates d'événements :",
          error
        );
        setDatesEvenements([]);
      } else {
        setDatesEvenements(data || []);
      }

      setChargementDates(false);
    };

    fetchDatesEvenements();
  }, []);

  // ============================================================
  // FORMATAGE DES DATES
  // ============================================================

  const formaterDateEvenement = (dateString) => {
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
    };
  };

  const formaterHeure = (heure) => {
    if (!heure) return "";
    return heure.slice(0, 5);
  };

    // ============================================================
    // TYPE D'ÉVÉNEMENT
    // ============================================================

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
      if (type === "soiree") {
        return "🌙 Soirée jeux";
      }

      if (type === "apres_midi") {
        return "☀️ Après-midi jeux";
      }

      if (estTypePersonnalise(type)) {
        const emoji = getEmojiTypePersonnalise(type);
        const nom = getNomTypePersonnalise(type);

        return `${emoji} ${nom}`.trim();
      }

      return "🎲 Rencontre jeux";
    };

    // ============================================================
    // COULEUR DE L'AGENDA SELON LE JOUR DU MOIS
    // ============================================================

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

    const jourDuMois = new Date().getDate();

    const couleurAgenda =
      couleursAgenda[(jourDuMois - 1) % couleursAgenda.length];
    
    // ============================================================
    // EXPORT AGENDA RÉSEAUX SOCIAUX
    // ============================================================

    const partagerAgenda = async (format) => {
    let element;
    let largeur;
    let hauteur;
    let nomFichier;

    if (format === "instagram") {
      element = instagramAgendaRef.current;
      largeur = 1080;
      hauteur = 1350;
      nomFichier = "agenda-la-loi-des-cartes-instagram";
    } else {
      element = facebookAgendaRef.current;
      largeur = 1200;
      hauteur = 630;
      nomFichier = "agenda-la-loi-des-cartes-facebook";
    }

    if (!element) {
      console.error("Élément d'export introuvable");
      return;
    }

    // Sauvegarde du style actuel
    const ancienStyle = {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      zIndex: element.style.zIndex,
      opacity: element.style.opacity,
      pointerEvents: element.style.pointerEvents,
    };

    try {
      // ============================================================
      // ON PLACE TEMPORAIREMENT L'IMAGE DANS LA ZONE VISIBLE
      // pour forcer le navigateur à réellement la rendre
      // ============================================================

      element.style.position = "fixed";
      element.style.left = "0";
      element.style.top = "0";
      element.style.zIndex = "999999";
      element.style.opacity = "1";
      element.style.pointerEvents = "none";

      // Laisse le navigateur effectuer le rendu avant la capture
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });

      // ============================================================
      // CAPTURE
      // ============================================================

      const dataUrl = await toPng(element, {
        width: largeur,
        height: hauteur,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: "#111827",
      });

      // ============================================================
      // DATA URL → BLOB
      // Sans fetch() pour éviter les problèmes CSP
      // ============================================================

      const [header, base64] = dataUrl.split(",");

      const mimeMatch = header.match(/data:(.*?);base64/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

      const byteCharacters = atob(base64);
      const byteArrays = [];

      for (
        let offset = 0;
        offset < byteCharacters.length;
        offset += 1024
      ) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        byteArrays.push(new Uint8Array(byteNumbers));
      }

      const blob = new Blob(byteArrays, {
        type: mimeType,
      });

      const fichier = new File(
        [blob],
        `${nomFichier}.png`,
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
          title: "Agenda - La Loi des Cartes",
          text:
            format === "instagram"
              ? "Agenda des prochaines parties de 🎲 La Loi des Cartes"
              : "Agenda des prochaines parties de 🎲 La Loi des Cartes",
          files: [fichier],
        });

        return;
      }

      // ============================================================
      // TÉLÉCHARGEMENT SUR PC
      // ============================================================

      const url = URL.createObjectURL(blob);

      const lien = document.createElement("a");
      lien.href = url;
      lien.download = fichier.name;

      document.body.appendChild(lien);
      lien.click();
      document.body.removeChild(lien);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(
        `Erreur lors de la création de l'agenda ${format} :`,
        error
      );
    } finally {
      // ============================================================
      // ON RESTAURE LA POSITION INITIALE
      // ============================================================

      element.style.position = ancienStyle.position;
      element.style.left = ancienStyle.left;
      element.style.top = ancienStyle.top;
      element.style.zIndex = ancienStyle.zIndex;
      element.style.opacity = ancienStyle.opacity;
      element.style.pointerEvents = ancienStyle.pointerEvents;
    }
  };

  return (
    <>
      {/* ==========================================================
          VERSION INSTAGRAM
          1080 × 1080
          ========================================================== */}

      <div
        ref={instagramAgendaRef}
        style={{
          position: "fixed",
          left: "-10000px",
          top: "0",
          width: "1080px",
          height: "1350px",
          overflow: "hidden",
        }}
      >

        {/* FOND */}

        <div
          className={`relative w-full h-full bg-gradient-to-br ${couleurAgenda} text-white`}
        >

          {/* Décors */}

          <div className="absolute inset-0 overflow-hidden">

            <img
              src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
              alt=""
              crossOrigin="anonymous"
              className="absolute -right-32 top-1/3 w-[600px] opacity-[0.035] rotate-[-12deg]"
            />

            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-3xl" />

            <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-3xl" />

            <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-fuchsia-500/10 blur-3xl" />

          </div>


          {/* CONTENU */}

          <div className="relative h-full flex flex-col px-12 py-10">

            {/* LOGO */}

            <div className="flex justify-center">

              <div className="bg-white rounded-3xl px-8 py-4 shadow-2xl">

                <img
                  src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
                  alt="La Loi des Cartes"
                  crossOrigin="anonymous"
                  className="h-24 w-auto object-contain"
                />

              </div>

            </div>


            {/* TITRE */}

            <div className="text-center mt-8">

              <div className="text-purple-200 text-xl font-bold uppercase tracking-[0.25em]">
                🎲 La Loi des Cartes
              </div>

              <div className="text-7xl font-black leading-none mt-3">
                AGENDA
              </div>

              <div className="text-5xl font-black text-purple-300 mt-2">
                DU CLUB
              </div>

            </div>


            {/* ÉVÉNEMENTS */}

            <div
              className={`grid ${
                datesEvenements.length <= 4
                  ? "grid-cols-2"
                  : "grid-cols-2"
              } gap-4 mt-8 flex-1 content-center`}
            >

              {datesEvenements.map((evenement) => {

                const date = formaterDateEvenement(
                  evenement.date_evenement
                );

                const estSoiree =
                  evenement.type_evenement === "soiree";

                const estApresMidi =
                  evenement.type_evenement === "apres_midi";

                return (
                  <div
                    key={evenement.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-2xl text-gray-900"
                  >

                    <div
                      className={`h-2 ${
                        estSoiree
                          ? "bg-black"
                          : estApresMidi
                          ? "bg-orange-500"
                          : "bg-purple-600"
                      }`}
                    />

                    <div className="flex">

                      {/* DATE */}

                      <div
                        className={`w-32 flex-shrink-0 text-white flex flex-col items-center justify-center py-4 ${
                          estSoiree
                            ? "bg-gradient-to-b from-gray-950 to-black"
                            : estApresMidi
                            ? "bg-gradient-to-b from-orange-400 to-orange-600"
                            : "bg-gradient-to-b from-purple-500 to-indigo-700"
                        }`}
                      >

                        <div className="text-xs font-black uppercase">
                          {date.jour}
                        </div>

                        <div className="text-5xl font-black leading-none">
                          {date.numero}
                        </div>

                        <div className="text-sm font-bold capitalize">
                          {date.mois}
                        </div>

                      </div>


                      {/* INFOS */}

                      <div className="flex-1 p-4">

                        <div className="font-black text-lg leading-tight">
                          {getLibelleTypeEvenement(
                            evenement.type_evenement
                          )}
                        </div>

                        <div className="font-bold text-sm mt-2">
                          🕐{" "}
                          {formaterHeure(
                            evenement.heure_debut
                          )}
                          {" – "}
                          {formaterHeure(
                            evenement.heure_fin
                          )}
                        </div>

                        {evenement.texte && (
                          <div className="text-xs text-gray-600 mt-2 leading-tight">
                            {evenement.texte}
                          </div>
                        )}

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>


            {/* FOOTER */}

            <div className="mt-6 pt-5 border-t border-white/20 text-center">

              <div className="text-lg font-black">
                📍 Maison des associations
              </div>

              <div className="text-sm font-semibold mt-1">
                2 Rue Albert Leroy, 62170 Neuville-sous-Montreuil
              </div>

              <div className="flex justify-center gap-8 mt-3 text-sm font-bold">

                <span>
                  📞 06 44 17 10 82
                </span>

                <span>
                  ✉️ laloidescartes@gmail.com
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>



      {/* ==========================================================
          VERSION FACEBOOK
          1200 × 630
          ========================================================== */}

      <div
        ref={facebookAgendaRef}
        style={{
          position: "fixed",
          left: "-10000px",
          top: "0",
          width: "1200px",
          height: "630px",
          overflow: "hidden",
        }}
      >

        <div
          className={`relative w-full h-full bg-gradient-to-br ${couleurAgenda} text-white`}
        >

          {/* DÉCOR */}

          <div className="absolute inset-0 overflow-hidden">

            <img
              src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
              alt=""
              crossOrigin="anonymous"
              className="absolute -right-40 top-20 w-[550px] opacity-[0.035] rotate-[-12deg]"
            />

            <div className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-3xl" />

            <div className="absolute -bottom-48 right-20 w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-3xl" />

          </div>


          {/* CONTENU */}

          <div className="relative h-full flex flex-col px-10 py-8">


            {/* EN-TÊTE */}

            <div className="flex items-center gap-6">

              <div className="bg-white rounded-2xl px-5 py-3 shadow-2xl flex-shrink-0">

                <img
                  src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
                  alt="La Loi des Cartes"
                  crossOrigin="anonymous"
                  className="h-20 w-auto object-contain"
                />

              </div>


              <div>

                <div className="text-purple-200 text-sm font-bold uppercase tracking-[0.2em]">
                  🎲 La Loi des Cartes
                </div>

                <div className="text-5xl font-black leading-none mt-1">
                  AGENDA
                </div>

                <div className="text-3xl font-black text-purple-300">
                  DU CLUB
                </div>

              </div>

            </div>


            {/* ÉVÉNEMENTS */}

            <div className="grid grid-cols-3 gap-4 mt-7 flex-1">

              {datesEvenements.slice(0, 6).map((evenement) => {

                const date = formaterDateEvenement(
                  evenement.date_evenement
                );

                const estSoiree =
                  evenement.type_evenement === "soiree";

                const estApresMidi =
                  evenement.type_evenement === "apres_midi";

                return (
                  <div
                    key={evenement.id}
                    className="bg-white rounded-xl overflow-hidden shadow-xl text-gray-900"
                  >

                    <div
                      className={`h-1.5 ${
                        estSoiree
                          ? "bg-black"
                          : estApresMidi
                          ? "bg-orange-500"
                          : "bg-purple-600"
                      }`}
                    />

                    <div className="flex h-full">

                      <div
                        className={`w-24 flex-shrink-0 text-white flex flex-col items-center justify-center ${
                          estSoiree
                            ? "bg-gradient-to-b from-gray-950 to-black"
                            : estApresMidi
                            ? "bg-gradient-to-b from-orange-400 to-orange-600"
                            : "bg-gradient-to-b from-purple-500 to-indigo-700"
                        }`}
                      >

                        <div className="text-[10px] font-black uppercase">
                          {date.jour}
                        </div>

                        <div className="text-4xl font-black leading-none">
                          {date.numero}
                        </div>

                        <div className="text-xs font-bold capitalize">
                          {date.mois}
                        </div>

                      </div>


                      <div className="flex-1 p-3">

                        <div className="font-black text-sm leading-tight">
                          {getLibelleTypeEvenement(
                            evenement.type_evenement
                          )}
                        </div>

                        <div className="font-bold text-xs mt-2">
                          🕐{" "}
                          {formaterHeure(
                            evenement.heure_debut
                          )}
                          {" – "}
                          {formaterHeure(
                            evenement.heure_fin
                          )}
                        </div>

                        {evenement.texte && (
                          <div className="text-[10px] text-gray-600 mt-2 leading-tight">
                            {evenement.texte}
                          </div>
                        )}

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>


            {/* FOOTER */}

            <div className="mt-5 pt-4 border-t border-white/20 flex items-center justify-between">

              <div>

                <div className="font-black text-base">
                  📍 Maison des associations
                </div>

                <div className="text-xs font-semibold">
                  2 Rue Albert Leroy, 62170 Neuville-sous-Montreuil
                </div>

              </div>


              <div className="flex gap-5 text-xs font-bold">

                <span>
                  📞 06 44 17 10 82
                </span>

                <span>
                  ✉️ laloidescartes@gmail.com
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>
      {/* ============================================================
          PROCHAINES RENCONTRES
          ============================================================ */}
      {!chargementDates && datesEvenements.length > 0 && (
        <section className="mt-12 mb-12">
          <div className={`relative max-w-6xl mx-auto overflow-hidden rounded-[2rem] shadow-2xl bg-gradient-to-br ${couleurAgenda}`}>

            {/* ========================= */}
            {/* FOND GRAPHIQUE */}
            {/* ========================= */}

            <div className="absolute inset-0 overflow-hidden pointer-events-none">

              {/* Logo en filigrane */}
              <img
                src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
                alt=""
                className="absolute -right-20 top-1/3 w-[420px] opacity-[0.035] rotate-[-12deg]"
              />

              {/* Cercles décoratifs */}
              <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl" />

              <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />

              <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl" />

            </div>

            {/* ========================= */}
            {/* EN-TÊTE */}
            {/* ========================= */}

            <div className="relative px-5 pt-7 pb-6 md:px-10 md:pt-8">

              <div className="flex flex-col md:flex-row items-center md:items-center gap-6">

                {/* LOGO À GAUCHE */}
                <div className="flex-shrink-0">
                  <div className="bg-white rounded-2xl px-5 py-3 shadow-2xl">
                    <img
                      src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
                      alt="La Loi des Cartes"
                      className="h-20 md:h-24 w-auto object-contain"
                    />
                  </div>
                </div>

                {/* TITRE */}
                <div className="flex-1 text-center md:text-left">

                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-purple-200 text-xs md:text-sm font-bold uppercase tracking-[0.18em]">
                    🎲 La Loi des Cartes
                  </div>

                  <h2 className="mt-3 text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                    AGENDA
                    <span className="block text-purple-300">
                      DU CLUB
                    </span>
                  </h2>

                  <p className="mt-3 text-purple-100 text-base md:text-lg">
                    Retrouvez-nous autour d'une table pour jouer,
                    partager et découvrir de nouveaux jeux !
                  </p>

                </div>

              </div>

            </div>

            {/* ========================= */}
            {/* ÉVÉNEMENTS */}
            {/* ========================= */}

            <div className="relative px-4 pb-8 md:px-10">

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                {datesEvenements.map((evenement) => {
                  const date = formaterDateEvenement(
                    evenement.date_evenement
                  );

                  const estSoiree =
                    evenement.type_evenement === "soiree";

                  const estApresMidi =
                    evenement.type_evenement === "apres_midi";

                  return (
                    <div
                      key={evenement.id}
                      className="group relative bg-white rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    >

                      {/* Petit bandeau supérieur */}
                      <div
                        className={`h-1.5 ${
                          estSoiree
                            ? "bg-black"
                            : estApresMidi
                            ? "bg-orange-500"
                            : "bg-purple-600"
                        }`}
                      />

                      <div className="flex">

                        {/* DATE */}
                        <div
                          className={`w-28 md:w-32 flex-shrink-0 text-white flex flex-col items-center justify-center px-3 py-5 ${
                            estSoiree
                              ? "bg-gradient-to-b from-gray-950 to-black"
                              : estApresMidi
                              ? "bg-gradient-to-b from-orange-400 to-orange-600"
                              : "bg-gradient-to-b from-purple-500 to-indigo-700"
                          }`}
                        >

                          <span className="text-[11px] md:text-xs font-black uppercase tracking-wider opacity-90">
                            {date.jour}
                          </span>

                          <span className="text-5xl md:text-6xl font-black leading-none mt-1">
                            {date.numero}
                          </span>

                          <span className="text-sm md:text-base font-bold capitalize mt-1">
                            {date.mois}
                          </span>

                        </div>

                        {/* INFORMATIONS */}
                        <div className="flex-1 min-w-0 p-5 flex flex-col justify-center">

                          <h3 className="font-black text-lg md:text-xl text-gray-900 leading-tight">
                            {getLibelleTypeEvenement(
                              evenement.type_evenement
                            )}
                          </h3>

                          <div className="inline-flex items-center gap-2 mt-3 text-gray-700">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100">
                              🕐
                            </span>

                            <span className="font-bold text-sm md:text-base">
                              {formaterHeure(evenement.heure_debut)}
                              {" – "}
                              {formaterHeure(evenement.heure_fin)}
                            </span>
                          </div>

                          {evenement.texte && (
                            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                              {evenement.texte}
                            </p>
                          )}

                        </div>

                      </div>

                    </div>
                  );
                })}

              </div>
            </div>

            {/* ========================= */}
            {/* FOOTER / CONTACT */}
            {/* ========================= */}

            <div className="relative border-t border-white/10 bg-black/25">

              <div className="px-5 py-6 md:px-10">

                {/* ADRESSE */}
                <div className="flex flex-col items-center text-center">

                  <div className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 border border-white/10 text-2xl">
                    📍
                  </div>

                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-purple-300 font-bold">
                    Retrouvez-nous
                  </p>

                  <p className="mt-1 text-white font-black text-base md:text-lg">
                    Maison des associations
                  </p>

                  <p className="text-white font-semibold text-sm md:text-base">
                    2 Rue Albert Leroy, 62170 Neuville-sous-Montreuil
                  </p>

                </div>

                {/* CONTACT */}
                <div className="mt-6 pt-5 border-t border-white/10 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">

                  <a
                    href="tel:0644171082"
                    className="flex items-center gap-2 text-white hover:text-purple-300 transition"
                  >
                    <Phone size={20} />
                    <span className="font-semibold">
                      06 44 17 10 82
                    </span>
                  </a>

                  <a
                    href="mailto:laloidescartes@gmail.com"
                    className="flex items-center gap-2 text-white hover:text-purple-300 transition"
                  >
                    <Mail size={20} />
                    <span className="font-semibold">
                      laloidescartes@gmail.com
                    </span>
                  </a>

                </div>

                <div className="mt-5 text-center">
                  <p className="text-purple-200 text-xs md:text-sm">
                    🎲 Jeux de société • Rencontres • Convivialité
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* ======================================================
              BOUTONS RÉSEAUX SOCIAUX
              ====================================================== */}

          <div className="flex flex-wrap justify-center gap-3 mt-6">

            {/* INSTAGRAM */}

            <button
              onClick={() => partagerAgenda("instagram")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white font-bold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
            >
              📸
              <span>
                Partager l'Agenda format Instagram
              </span>
            </button>


            {/* FACEBOOK */}

            <button
              onClick={() => partagerAgenda("facebook")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
            >
              📘
              <span>
                Partager l'Agenda format Facebook
              </span>
            </button>

          </div>
        </section>
      )}
    </>
  );
}