import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import AdminMenu from "./AdminMenu";

import {
  CalendarDays,
  Pencil,
  Power,
  Trash2,
  Save,
  X,
} from "lucide-react";

export default function AdminEvenements({
  profil,
}) {
  const formulaireDateRef = useRef(null);

  const [datesEvenements, setDatesEvenements] =
    useState([]);

  const [dateEvenement, setDateEvenement] =
    useState("");

  const [typeEvenement, setTypeEvenement] =
    useState("soiree");

  const [heureDebut, setHeureDebut] =
    useState("20:00");

  const [heureFin, setHeureFin] =
    useState("23:00");

  const [
    dateEvenementEnEdition,
    setDateEvenementEnEdition,
  ] = useState(null);

  const [chargementDates, setChargementDates] =
    useState(false);

  const [texteEvenement, setTexteEvenement] =
    useState("");

  const [emojiEvenement, setEmojiEvenement] =
    useState("🎲");

  const [
    nomTypePersonnalise,
    setNomTypePersonnalise,
  ] = useState("");

  useEffect(() => {
    if (!profil || profil.role !== "admin") return;

    fetchDatesEvenements();
  }, [profil]);

  const getDefaultsFromDate = (date) => {
    if (!date) {
      return {
        type_evenement: "soiree",
        heure_debut: "20:00",
        heure_fin: "23:00",
      };
    }

    const jour = new Date(
      `${date}T12:00:00`
    ).getDay();

    if (jour === 0 || jour === 6) {
      return {
        type_evenement: "apres_midi",
        heure_debut: "14:00",
        heure_fin: "17:00",
      };
    }

    return {
      type_evenement: "soiree",
      heure_debut: "20:00",
      heure_fin: "23:00",
    };
  };

  const creerTypePersonnalise = (
    emoji,
    nom
  ) => {
    return `custom|${emoji}|${nom}`;
  };

  const estTypePersonnalise = (type) => {
    return (
      typeof type === "string" &&
      type.startsWith("custom|")
    );
  };

  const getEmojiTypePersonnalise = (
    type
  ) => {
    if (!estTypePersonnalise(type)) return "";

    const morceaux = type.split("|");

    return morceaux[1] || "";
  };

  const getNomTypePersonnalise = (
    type
  ) => {
    if (!estTypePersonnalise(type)) return "";

    const morceaux = type.split("|");

    return (
      morceaux.slice(2).join("|") || ""
    );
  };

  const getTypesPersonnalises = () => {
    const types = datesEvenements
      .filter((date) =>
        estTypePersonnalise(
          date.type_evenement
        )
      )
      .map(
        (date) => date.type_evenement
      );

    return [...new Set(types)];
  };

  const handleDateEvenementChange = (
    nouvelleDate
  ) => {
    setDateEvenement(nouvelleDate);

    if (!dateEvenementEnEdition) {
      const defaults =
        getDefaultsFromDate(
          nouvelleDate
        );

      setTypeEvenement(
        defaults.type_evenement
      );

      setHeureDebut(
        defaults.heure_debut
      );

      setHeureFin(
        defaults.heure_fin
      );
    }
  };

  const resetFormDateEvenement = () => {
    setDateEvenement("");
    setTypeEvenement("soiree");
    setHeureDebut("20:00");
    setHeureFin("23:00");
    setTexteEvenement("");
    setEmojiEvenement("🎲");
    setNomTypePersonnalise("");
    setDateEvenementEnEdition(null);
  };

  const fetchDatesEvenements =
    async () => {
      setChargementDates(true);

      const { data, error } =
        await supabase
          .from("dates_evenements")
          .select(
            "id, date_evenement, type_evenement, heure_debut, heure_fin, texte, actif, created_at"
          )
          .order(
            "date_evenement",
            { ascending: true }
          )
          .order(
            "heure_debut",
            { ascending: true }
          );

      if (error) {
        console.error(error);
        setDatesEvenements([]);
      } else {
        setDatesEvenements(data || []);
      }

      setChargementDates(false);
    };

  const ajouterOuModifierDateEvenement =
    async () => {
      if (!dateEvenement) {
        alert(
          "❌ Veuillez choisir une date."
        );
        return;
      }

      if (!heureDebut || !heureFin) {
        alert(
          "❌ Veuillez renseigner l'heure de début et l'heure de fin."
        );
        return;
      }

      if (heureFin <= heureDebut) {
        alert(
          "❌ L'heure de fin doit être après l'heure de début."
        );
        return;
      }

      let typeFinal = typeEvenement;

      if (
        typeEvenement === "personnalise"
      ) {
        if (!emojiEvenement.trim()) {
          alert(
            "❌ Veuillez choisir un emoji."
          );
          return;
        }

        if (
          !nomTypePersonnalise.trim()
        ) {
          alert(
            "❌ Veuillez renseigner le nom du type d'événement."
          );
          return;
        }

        typeFinal =
          creerTypePersonnalise(
            emojiEvenement.trim(),
            nomTypePersonnalise.trim()
          );
      }

      const donnees = {
        date_evenement: dateEvenement,
        type_evenement: typeFinal,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        texte:
          texteEvenement || null,
        actif: true,
      };

      if (dateEvenementEnEdition) {
        const { data, error } =
          await supabase
            .from("dates_evenements")
            .update({
              date_evenement:
                dateEvenement,
              type_evenement:
                typeFinal,
              heure_debut:
                heureDebut,
              heure_fin:
                heureFin,
              texte:
                texteEvenement ||
                null,
            })
            .eq(
              "id",
              dateEvenementEnEdition
            )
            .select()
            .single();

        if (error) {
          alert(
            `❌ Impossible de modifier la date : ${error.message}`
          );
          return;
        }

        setDatesEvenements(
          (prev) =>
            prev
              .map((date) =>
                date.id ===
                dateEvenementEnEdition
                  ? data
                  : date
              )
              .sort((a, b) => {
                const dateA =
                  `${a.date_evenement} ${a.heure_debut || ""}`;

                const dateB =
                  `${b.date_evenement} ${b.heure_debut || ""}`;

                return dateA.localeCompare(
                  dateB
                );
              })
        );

        alert(
          "✅ Date de l'événement modifiée !"
        );

        resetFormDateEvenement();

        return;
      }

      const { data, error } =
        await supabase
          .from("dates_evenements")
          .insert(donnees)
          .select()
          .single();

      if (error) {
        alert(
          `❌ Impossible d'ajouter la date : ${error.message}`
        );
        return;
      }

      setDatesEvenements(
        (prev) =>
          [...prev, data].sort(
            (a, b) => {
              const dateA =
                `${a.date_evenement} ${a.heure_debut || ""}`;

              const dateB =
                `${b.date_evenement} ${b.heure_debut || ""}`;

              return dateA.localeCompare(
                dateB
              );
            }
          )
      );

      alert(
        "✅ Date de l'événement ajoutée !"
      );

      resetFormDateEvenement();
    };

  const modifierDateEvenement = (
    date
  ) => {
    setDateEvenement(
      date.date_evenement
    );

    setTypeEvenement(
      date.type_evenement
    );

    if (
      estTypePersonnalise(
        date.type_evenement
      )
    ) {
      setEmojiEvenement(
        getEmojiTypePersonnalise(
          date.type_evenement
        )
      );

      setNomTypePersonnalise(
        getNomTypePersonnalise(
          date.type_evenement
        )
      );
    } else {
      setEmojiEvenement("🎲");
      setNomTypePersonnalise("");
    }

    setHeureDebut(
      date.heure_debut
        ? date.heure_debut.slice(0, 5)
        : ""
    );

    setHeureFin(
      date.heure_fin
        ? date.heure_fin.slice(0, 5)
        : ""
    );

    setTexteEvenement(
      date.texte || ""
    );

    setDateEvenementEnEdition(
      date.id
    );

    setTimeout(() => {
      formulaireDateRef.current?.scrollIntoView(
        {
          behavior: "smooth",
          block: "center",
        }
      );
    }, 100);
  };

  const toggleDateEvenement =
    async (date) => {
      const nouvelEtat =
        !date.actif;

      const { data, error } =
        await supabase
          .from("dates_evenements")
          .update({
            actif: nouvelEtat,
          })
          .eq("id", date.id)
          .select()
          .single();

      if (error) {
        alert(
          `❌ Impossible de modifier l'état : ${error.message}`
        );
        return;
      }

      setDatesEvenements(
        (prev) =>
          prev.map((d) =>
            d.id === date.id
              ? data
              : d
          )
      );
    };

  const supprimerDateEvenement =
    async (date) => {
      const dateAffichee =
        new Date(
          `${date.date_evenement}T12:00:00`
        ).toLocaleDateString(
          "fr-FR"
        );

      if (
        !window.confirm(
          `Supprimer définitivement l'événement du ${dateAffichee} ?`
        )
      ) {
        return;
      }

      const { error } =
        await supabase
          .from("dates_evenements")
          .delete()
          .eq("id", date.id);

      if (error) {
        alert(
          `❌ Impossible de supprimer la date : ${error.message}`
        );
        return;
      }

      setDatesEvenements(
        (prev) =>
          prev.filter(
            (d) => d.id !== date.id
          )
      );

      if (
        dateEvenementEnEdition ===
        date.id
      ) {
        resetFormDateEvenement();
      }

      alert("✅ Événement supprimé.");
    };

  const formatDateEvenement =
    (date) => {
      if (!date) return "";

      return new Date(
        `${date}T12:00:00`
      ).toLocaleDateString(
        "fr-FR",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );
    };

  const formatHeureEvenement =
    (heure) => {
      if (!heure) return "";
      return heure.slice(0, 5);
    };

  if (!profil || profil.role !== "admin") {
    return (
      <Navigate
        to="/profil"
        replace
      />
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        <AdminMenu profil={profil} />

        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  Prochaines soirées et après-midi jeux
                </h1>

                <p className="text-sm text-slate-500">
                  Ajoute et gère les prochaines rencontres de l'association
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">

            <p className="text-sm text-slate-500 mb-5">
              Le type et les horaires sont automatiquement préremplis selon le jour choisi, mais tu peux tout modifier.
            </p>

            <div
              ref={formulaireDateRef}
              className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 md:p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center">
                  {dateEvenementEnEdition ? (
                    <Pencil className="w-5 h-5 text-violet-600" />
                  ) : (
                    <CalendarDays className="w-5 h-5 text-violet-600" />
                  )}
                </div>

                <h2 className="font-bold text-lg text-slate-900">
                  {dateEvenementEnEdition
                    ? "Modifier l'événement"
                    : "Ajouter une rencontre"}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Date
                  </label>

                  <input
                    type="date"
                    value={dateEvenement}
                    onChange={(e) =>
                      handleDateEvenementChange(
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Type
                  </label>

                  <select
                    value={typeEvenement}
                    onChange={(e) => {
                      const value =
                        e.target.value;

                      setTypeEvenement(value);

                      if (
                        value ===
                        "personnalise"
                      ) {
                        setEmojiEvenement(
                          "🎲"
                        );

                        setNomTypePersonnalise(
                          ""
                        );
                      } else if (
                        estTypePersonnalise(
                          value
                        )
                      ) {
                        setEmojiEvenement(
                          getEmojiTypePersonnalise(
                            value
                          )
                        );

                        setNomTypePersonnalise(
                          getNomTypePersonnalise(
                            value
                          )
                        );
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="soiree">
                      🌙 Soirée
                    </option>

                    <option value="apres_midi">
                      ☀️ Après-midi
                    </option>

                    {getTypesPersonnalises()
                      .length > 0 && (
                      <optgroup label="Types personnalisés">
                        {getTypesPersonnalises().map(
                          (type) => (
                            <option
                              key={type}
                              value={type}
                            >
                              {
                                getEmojiTypePersonnalise(
                                  type
                                )
                              }{" "}
                              {
                                getNomTypePersonnalise(
                                  type
                                )
                              }
                            </option>
                          )
                        )}
                      </optgroup>
                    )}

                    <option value="personnalise">
                      ✨ Créer un nouveau type...
                    </option>
                  </select>
                </div>

                {typeEvenement ===
                  "personnalise" && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white rounded-2xl border border-purple-200">

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Emoji
                      </label>

                      <input
                        type="text"
                        value={
                          emojiEvenement
                        }
                        onChange={(e) =>
                          setEmojiEvenement(
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center text-2xl"
                        maxLength={8}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Nom du type
                      </label>

                      <input
                        type="text"
                        value={
                          nomTypePersonnalise
                        }
                        onChange={(e) =>
                          setNomTypePersonnalise(
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200"
                        placeholder="Ex. Tournoi, Halloween..."
                        maxLength={50}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Heure de début
                  </label>

                  <input
                    type="time"
                    value={heureDebut}
                    onChange={(e) =>
                      setHeureDebut(
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Heure de fin
                  </label>

                  <input
                    type="time"
                    value={heureFin}
                    onChange={(e) =>
                      setHeureFin(
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Texte / précision
                  </label>

                  <input
                    type="text"
                    value={
                      texteEvenement
                    }
                    onChange={(e) =>
                      setTexteEvenement(
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                    placeholder="Ex. Soirée spéciale Halloween 🎃..."
                    maxLength={200}
                  />
                </div>

              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={
                    ajouterOuModifierDateEvenement
                  }
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold shadow-lg"
                >
                  <Save className="w-4 h-4" />

                  {dateEvenementEnEdition
                    ? "Enregistrer les modifications"
                    : "Ajouter la rencontre"}
                </button>

                {dateEvenementEnEdition && (
                  <button
                    onClick={
                      resetFormDateEvenement
                    }
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-600 text-white font-semibold"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center gap-3 mb-4">
                <CalendarDays className="w-5 h-5 text-violet-600" />

                <h2 className="font-bold text-lg text-slate-900">
                  Rencontres enregistrées
                </h2>
              </div>

              {chargementDates ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                  Chargement des dates...
                </div>
              ) : datesEvenements.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                  Aucune rencontre enregistrée.
                </div>
              ) : (
                <div className="space-y-3">
                  {datesEvenements.map(
                    (date) => {
                      const datePasse =
                        date.date_evenement <
                        new Date()
                          .toISOString()
                          .slice(0, 10);

                      return (
                        <div
                          key={date.id}
                          className={`rounded-2xl border p-5 ${
                            date.actif
                              ? "bg-white border-slate-200 shadow-sm"
                              : "bg-slate-100 border-slate-200 opacity-60"
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                            <div>
                              <div className="font-bold text-lg text-slate-900">
                                {date.type_evenement ===
                                  "soiree" &&
                                  "🌙 Soirée"}

                                {date.type_evenement ===
                                  "apres_midi" &&
                                  "☀️ Après-midi"}

                                {estTypePersonnalise(
                                  date.type_evenement
                                ) &&
                                  `${getEmojiTypePersonnalise(
                                    date.type_evenement
                                  )} ${getNomTypePersonnalise(
                                    date.type_evenement
                                  )}`}
                              </div>

                              <div className="mt-2 text-sm text-slate-600">
                                📅{" "}
                                {formatDateEvenement(
                                  date.date_evenement
                                )}
                              </div>

                              <div className="text-sm text-slate-600 mt-1">
                                🕐{" "}
                                {formatHeureEvenement(
                                  date.heure_debut
                                )}{" "}
                                –{" "}
                                {formatHeureEvenement(
                                  date.heure_fin
                                )}
                              </div>

                              {date.texte && (
                                <div className="text-sm font-semibold text-violet-700 mt-2">
                                  ✨ {date.texte}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2 mt-3">
                                {datePasse && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-600">
                                    Date passée
                                  </span>
                                )}

                                {!date.actif && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                    Désactivée
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">

                              <button
                                onClick={() =>
                                  modifierDateEvenement(
                                    date
                                  )
                                }
                                type="button"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm"
                              >
                                <Pencil className="w-4 h-4" />
                                Modifier
                              </button>

                              <button
                                onClick={() =>
                                  toggleDateEvenement(
                                    date
                                  )
                                }
                                type="button"
                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm ${
                                  date.actif
                                    ? "bg-orange-500"
                                    : "bg-emerald-600"
                                }`}
                              >
                                <Power className="w-4 h-4" />

                                {date.actif
                                  ? "Désactiver"
                                  : "Activer"}
                              </button>

                              <button
                                onClick={() =>
                                  supprimerDateEvenement(
                                    date
                                  )
                                }
                                type="button"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                              </button>

                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}