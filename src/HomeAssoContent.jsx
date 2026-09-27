import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import CountUp from "react-countup";
import { Phone, Mail } from "lucide-react";
import FacebookWidget from "./FacebookWidget";
import DiaporamaSwiper from "./DiaporamaSwiper";

export default function HomeAssoContent({
  stats,
  countSeanceTotal,
  countAdherentTotal,
  countFollowersFB,
  messagePresident,
  planningImageUrl,
  setZoomOpen,
}) {
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

  return (
    <>
      {/* ============================================================
          PROCHAINES RENCONTRES
          ============================================================ */}

      {!chargementDates && datesEvenements.length > 0 && (
        <section className="mt-12 mb-12">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">

            {/* TITRE */}
            <div className="bg-purple-600 text-white px-6 py-5">
              <h2 className="text-2xl md:text-3xl font-bold text-center">
                📅 Prochaines rencontres
              </h2>

              <p className="text-center text-purple-100 mt-1">
                Retrouvez nos prochaines rencontres
              </p>
            </div>

            {/* LISTE DES EVENEMENTS */}
            <div className="p-6 md:p-8">
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
                      className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition bg-white"
                    >
                      <div className="flex">

                        {/* DATE */}
                        <div
                          className={`w-28 flex-shrink-0 flex flex-col items-center justify-center text-white p-4 ${
                            estSoiree
                              ? "bg-black"
                              : estApresMidi
                              ? "bg-orange-500"
                              : "bg-purple-600"
                          }`}
                        >
                          <span className="text-sm font-semibold uppercase">
                            {date.jour}
                          </span>

                          <span className="text-4xl font-bold leading-none mt-1">
                            {date.numero}
                          </span>

                          <span className="text-sm font-medium capitalize mt-1">
                            {date.mois}
                          </span>
                        </div>

                        {/* INFORMATIONS */}
                        <div className="flex-1 p-4">

                          <h3 className="font-bold text-lg text-gray-800">
                            {getLibelleTypeEvenement(
                              evenement.type_evenement
                            )}
                          </h3>

                          <p className="text-gray-600 mt-2">
                            🕐{" "}
                            <strong>
                              {formaterHeure(evenement.heure_debut)}
                            </strong>
                            {" – "}
                            <strong>
                              {formaterHeure(evenement.heure_fin)}
                            </strong>
                          </p>

                          {evenement.texte && (
                            <p className="text-gray-600 mt-3 text-sm leading-relaxed">
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
          </div>
        </section>
      )}
      {!chargementDates && datesEvenements.length > 0 && (
        <section className="mt-12 mb-12">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-900">

            {/* Éléments décoratifs */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />

            {/* EN-TÊTE */}
            <div className="relative px-6 pt-8 pb-6 md:px-10 md:pt-10">

              <div className="flex justify-center mb-5">
                <div className="bg-white rounded-2xl px-5 py-3 shadow-xl">
                  <img
                    src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
                    alt="La Loi des Cartes"
                    className="h-20 md:h-24 w-auto object-contain"
                  />
                </div>
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center tracking-tight">
                📅 Prochaines rencontres
              </h2>

              <p className="text-center text-purple-200 mt-2 text-base md:text-lg">
                Retrouvez-nous autour d'une table pour jouer !
              </p>
            </div>

            {/* ÉVÉNEMENTS */}
            <div className="relative px-5 pb-6 md:px-10 md:pb-8">
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
                      className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex min-h-[150px]">

                        {/* DATE */}
                        <div
                          className={`w-28 md:w-32 flex-shrink-0 flex flex-col items-center justify-center text-white p-4 ${
                            estSoiree
                              ? "bg-gradient-to-b from-gray-950 to-black"
                              : estApresMidi
                              ? "bg-gradient-to-b from-orange-400 to-orange-600"
                              : "bg-gradient-to-b from-purple-500 to-indigo-600"
                          }`}
                        >
                          <span className="text-xs md:text-sm font-bold uppercase tracking-wide opacity-90">
                            {date.jour}
                          </span>

                          <span className="text-5xl md:text-6xl font-black leading-none mt-1">
                            {date.numero}
                          </span>

                          <span className="text-sm font-semibold capitalize mt-1">
                            {date.mois}
                          </span>
                        </div>

                        {/* INFORMATIONS */}
                        <div className="flex-1 p-5 flex flex-col justify-center">

                          <h3 className="font-extrabold text-lg md:text-xl text-gray-900 leading-tight">
                            {getLibelleTypeEvenement(
                              evenement.type_evenement
                            )}
                          </h3>

                          <div className="flex items-center gap-2 text-gray-600 mt-3">
                            <span className="text-lg">🕐</span>
                            <span className="font-semibold">
                              {formaterHeure(evenement.heure_debut)}
                              {" – "}
                              {formaterHeure(evenement.heure_fin)}
                            </span>
                          </div>

                          {evenement.texte && (
                            <p className="text-gray-600 mt-3 text-sm leading-relaxed">
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

            {/* PIED DE L'AFFICHE */}
            <div className="relative border-t border-white/10 bg-black/20 px-6 py-5 md:px-10">
              <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-white text-center">
                <span className="text-xl">📍</span>

                <span className="font-semibold text-sm md:text-base">
                  2 Rue Albert Leroy, 62170 Neuville-sous-Montreuil
                </span>
              </div>

              <p className="text-center text-purple-200 text-xs md:text-sm mt-2">
                La Loi des Cartes • Association de jeux de société
              </p>
            </div>

          </div>
        </section>
      )}
      {!chargementDates && datesEvenements.length > 0 && (
        <section className="mt-12 mb-12">
          <div className="relative max-w-6xl mx-auto overflow-hidden rounded-[2rem] shadow-2xl bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950">

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

            <div className="relative px-5 pt-8 pb-6 md:px-10 md:pt-10">

              <div className="flex justify-center">
                <div className="bg-white rounded-2xl px-6 py-3 shadow-2xl">
                  <img
                    src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
                    alt="La Loi des Cartes"
                    className="h-20 md:h-24 w-auto object-contain"
                  />
                </div>
              </div>

              <div className="text-center mt-6">

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-purple-200 text-xs md:text-sm font-bold uppercase tracking-[0.18em]">
                  🎲 La Loi des Cartes
                </div>

                <h2 className="mt-4 text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                  PROCHAINES
                  <span className="block text-purple-300">
                    RENCONTRES
                  </span>
                </h2>

                <p className="mt-4 text-purple-100 text-base md:text-lg">
                  Retrouvez-nous autour d'une table pour jouer,
                  partager et découvrir de nouveaux jeux !
                </p>

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

                        {/* ================= */}
                        {/* DATE */}
                        {/* ================= */}

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

                        {/* ================= */}
                        {/* INFOS */}
                        {/* ================= */}

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
            {/* FOOTER / ADRESSE */}
            {/* ========================= */}

            <div className="relative border-t border-white/10 bg-black/25">

              <div className="px-5 py-6 md:px-10">

                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-5 text-center">

                  <div className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 border border-white/10 text-2xl">
                    📍
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-purple-300 font-bold">
                      Retrouvez-nous
                    </p>

                    <p className="mt-1 text-white font-black text-base md:text-lg">
                      2 Rue Albert Leroy, 62170 Neuville-sous-Montreuil
                    </p>
                  </div>

                </div>

                <div className="mt-5 pt-4 border-t border-white/10 text-center">
                  <p className="text-purple-200 text-xs md:text-sm">
                    🎲 Jeux de société • Rencontres • Convivialité
                  </p>
                </div>

              </div>

            </div>

          </div>
        </section>
      )}
      {!chargementDates && datesEvenements.length > 0 && (
        <section className="mt-12 mb-12">
          <div className="relative max-w-6xl mx-auto overflow-hidden rounded-[2rem] shadow-2xl bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950">

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
        </section>
      )}
      {false && (
       <>
          {/* STATS */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Création de l'asso", value: "2021", color: "text-black-600" },
              { label: "Jeux", value: stats.jeux, color: "text-yellow-600" },
              ...(countSeanceTotal > 0
                ? [{ label: "Après-midi et soirées jeux", value: countSeanceTotal, color: "text-purple-600" }]
                : []),
              ...(countAdherentTotal > 0
                ? [{ label: "Adhérents de l'asso de 7 à 73 ans", value: countAdherentTotal, color: "text-pink-600" }]
                : []),
              //{ label: "Après-midi et soirées jeux", value: stats.rencontres, color: "text-teal-600" },
              { label: "Parties organisées via l'App", value: stats.parties, color: "text-green-600" },
              { label: "Heures de jeu organisées via l'App", value: stats.heures, color: "text-orange-600" },
              { label: "Adhérents sur l'App", value: stats.membres, color: "text-rose-600" },
              ...(countFollowersFB > 0
                ? [{ label: "Followers Facebook", value: countFollowersFB, color: "text-blue-600" }]
                : [])
            ].map((stat) => (
              <div key={stat.label} className="p-6 bg-white rounded shadow hover:shadow-lg transition text-center">
                <h2 className={`text-3xl font-bold ${stat.color}`}>
                  <CountUp end={stat.value} duration={1.5} separator="" />
                </h2>
                <p className="text-gray-600 mt-1">{stat.label}</p>
              </div>
            ))}
          </section>

          {/* MOT DU PRESIDENT + PLANNING + FACEBOOK */}
          {(messagePresident || planningImageUrl ) && (
            <section className="mb-12 p-6 bg-blue-50 rounded shadow">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                
                {/* COLONNE GAUCHE — Président */}
                {messagePresident && (
                  <div className="flex flex-col">
                    <p className="text-gray-700 text-center">{messagePresident}</p>

                    {/* Boutons d'action */}
                    <div className="mt-4 flex flex-wrap gap-3 justify-center">
                      <a
                        href="https://www.facebook.com/LaLoidesCartes"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition text-center"
                      >
                        Nos actualités sur Facebook
                      </a>

                      <a
                        href="https://www.helloasso.com/associations/la-loi-des-cartes/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition text-center"
                      >
                        Adhérer en ligne sur HelloAsso
                      </a>
                    </div>
                    <div className="text-center mt-6">
                      <img
                      src="https://laloidescartes.vercel.app/partenairelaloidescartes.jpg"
                      alt="partenaires"
                      className="rounded-xl shadow-md max-h-80 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* COLONNE CENTRALE — Planning */}
                {planningImageUrl && (
                  <div className="flex justify-center">
                    <img
                      src={planningImageUrl}
                      alt="Planning des prochaines rencontres"
                      onClick={() => setZoomOpen(true)}
                      className="max-h-80 object-contain rounded cursor-pointer hover:scale-105 transition-transform"
                    />
                  </div>
                )}

                {/* COLONNE DROITE — Facebook */}
                <div className="w-full flex justify-center">
                  <FacebookWidget />
                </div>

              </div>
            </section>
          )}

          {/* --- Section TARIFS --- */}
          <section className="mt-12 bg-white rounded-xl shadow-md p-6 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
              TARIFS & ADHÉSION
            </h2>
            <p className="text-center text-gray-600 mb-6">
              🎟️ Venez découvrir gratuitement, puis <strong>2€ / séance</strong> pour les non-adhérents.
            </p>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Texte */}
              <div className="space-y-4 text-gray-700">
                <h3 className="text-xl font-semibold">Adhésion à l’année</h3>


                <ul className="space-y-2">
                  <li>🎲 <strong>Individuelle</strong> : 20€</li>
                  <li>🎲 <strong>Duo</strong> : 35€</li>
                  <li>🎲 <strong>Famille</strong> (min. 4) : 60€</li>
                </ul>

                <p className="mt-4">
                  💸 <strong>10% de remise</strong> sur les jeux de société dans les boutiques partenaires.
                </p>

                <div className="mt-4">
                  <a
                    href="https://www.lantre.eu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 hover:opacity-80 transition"
                  >
                    <img
                      src="https://www.lantre.eu/wp-content/uploads/2017/06/logo-lantre-07-1.png"
                      alt="L’Antre du Jouet"
                      className="h-12 object-contain"
                    />
                    <span className="text-sm text-gray-600">Boutique partenaire</span>
                  </a>
                </div>

                <p className="mt-6">
                  ✅ <strong>Accès illimité</strong> aux séances du club
                </p>
              </div>

              {/* Illustration */}
              <div className="flex justify-center">
                <img
                  src="https://laloidescartes.my.canva.site/_assets/media/5f69b9aa7a56910fe6138d919c8214ee.jpg"
                  alt="Illustration jeux de société"
                  className="rounded-xl shadow-md max-h-80 object-contain"
                />
              </div>
            </div>
          </section>

          {/* DiaporamaSwiper */}
          <section className="mt-12 bg-white rounded-xl shadow-md">
            <DiaporamaSwiper />
          </section>

          {/* --- Section ADRESSE & CARTE --- */}
          <section className="mt-12 bg-slate-800 text-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 md:p-10">
              <h2 className="text-2xl font-bold text-center mb-8">Nous trouver</h2>

              <div className="grid md:grid-cols-2 gap-10 items-start">
                <div className="space-y-6">
                  <div>
                    <p className="text-lg font-semibold">📍 Adresse</p>
                    <p className="text-gray-300 mt-1">
                      2 Rue Albert Leroy<br />
                      62170 Neuville-sous-Montreuil
                    </p>
                  </div>

                  <img
                    src="https://laloidescartes.vercel.app/lieulaloidescartes.png"
                    alt="Lieu de l'association"
                    className="rounded-lg shadow-md max-h-64 object-contain"
                  />
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">

                    <div className="flex items-center gap-3">
                      <Phone size={20} className="text-rose-400" />
                      <span className="text-lg">06 44 17 10 82</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail size={20} className="text-rose-400" />
                      <a
                        href="mailto:laloidescartes@gmail.com"
                        className="text-lg hover:underline"
                      >
                        laloidescartes@gmail.com
                      </a>
                    </div>

                    <div className="w-full h-[300px] rounded-lg overflow-hidden">
                      <iframe
                        title="Carte Google Maps"
                        src="https://www.google.com/maps?q=2%20Rue%20Albert%20Leroy%2062170%20Neuville-sous-Montreuil&output=embed"
                        className="w-full h-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}