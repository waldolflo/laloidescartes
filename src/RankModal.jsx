import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  Trophy,
  X,
  UserPlus,
  Users,
  UserRound,
  Gamepad2,
  Plus,
  Trash2,
  Crown,
  Medal,
  Save,
  UserRoundPlus,
  Loader2,
} from "lucide-react";

export default function RankModal({ partie, onClose, fetchParties }) {
  const [inscrits, setInscrits] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allJoueurs, setAllJoueurs] = useState([]);

  const [newParticipant, setNewParticipant] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");

  const [loading, setLoading] = useState(false);

  // ============================================================
  // Charger les inscriptions + utilisateurs + joueurs
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        const { data: inscriptions, error: inscriptionsError } =
          await supabase
            .from("inscriptions")
            .select(`
              id,
              partie_id,
              utilisateur_id,
              joueur_id,
              rank,
              score,
              created_at,
              profils (
                id,
                nom
              ),
              joueurs (
                id,
                nom
              )
            `)
            .eq("partie_id", partie.id)
            .order("id");

        if (inscriptionsError) throw inscriptionsError;

        const initial = (inscriptions || []).map((i) => ({
          ...i,
          score: i.score || 0,
          gagnant: i.rank === 1,
          rank: i.rank || null,
        }));

        setInscrits(initial);

        const { data: users, error: usersError } = await supabase
          .from("profils")
          .select("id, nom")
          .order("nom");

        if (usersError) throw usersError;

        setAllUsers(users || []);

        const { data: joueurs, error: joueursError } = await supabase
          .from("joueurs")
          .select("id, nom, actif")
          .eq("actif", true)
          .order("nom");

        if (joueursError) throw joueursError;

        setAllJoueurs(joueurs || []);
      } catch (err) {
        console.error(err);
        alert("Erreur lors du chargement des joueurs.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [partie.id]);

  // ============================================================
  // Recalcul automatique des rangs
  // ============================================================

  const computeRanks = (players) => {
    const gagnants = players.filter((p) => p.gagnant);
    const nonGagnants = players.filter((p) => !p.gagnant);

    const allZeroAndNoWinner =
      gagnants.length === 0 &&
      nonGagnants.length > 0 &&
      nonGagnants.every((p) => p.score === 0);

    if (allZeroAndNoWinner) {
      return players.map((p) => ({
        ...p,
        rank: null,
      }));
    }

    nonGagnants.sort((a, b) => b.score - a.score);

    gagnants.forEach((p) => {
      p.rank = 1;
    });

    if (nonGagnants.length > 0) {
      let lastScore = null;
      let lastRank = gagnants.length > 0 ? 2 : 1;

      nonGagnants.forEach((p) => {
        if (lastScore === null) {
          p.rank = lastRank;
          lastScore = p.score;
        } else if (p.score === lastScore) {
          p.rank = lastRank;
        } else {
          lastRank++;
          p.rank = lastRank;
          lastScore = p.score;
        }
      });
    }

    return [...gagnants, ...nonGagnants].sort(
      (a, b) => (a.rank || 999) - (b.rank || 999)
    );
  };

  // ============================================================
  // Modifier un score
  // ============================================================

  const handleScoreChange = (inscriptionId, value) => {
    const updated = inscrits.map((i) =>
      i.id === inscriptionId
        ? {
            ...i,
            score: parseFloat(value) || 0,
          }
        : i
    );

    setInscrits(computeRanks(updated));
  };

  // ============================================================
  // Basculer gagnant
  // ============================================================

  const handleWinnerToggle = (inscriptionId) => {
    const updated = inscrits.map((i) =>
      i.id === inscriptionId
        ? {
            ...i,
            gagnant: !i.gagnant,
          }
        : i
    );

    setInscrits(computeRanks(updated));
  };

  // ============================================================
  // Ajouter un utilisateur ou un joueur existant
  // ============================================================

  const addParticipant = async () => {
    if (!newParticipant) {
      alert("Sélectionne un joueur à ajouter !");
      return;
    }

    setLoading(true);

    try {
      const [type, value] = newParticipant.split(":");

      const alreadyExists =
        type === "user"
          ? inscrits.some((i) => i.utilisateur_id === value)
          : inscrits.some(
              (i) => String(i.joueur_id) === String(value)
            );

      if (alreadyExists) {
        alert("Ce joueur est déjà inscrit !");
        return;
      }

      // UTILISATEUR AVEC COMPTE
      if (type === "user") {
        const { data: inscriptionId, error } = await supabase.rpc(
          "ajouter_utilisateur_partie",
          {
            p_partie_id: partie.id,
            p_utilisateur_id: value,
          }
        );

        if (error) throw error;

        const { data: inscription, error: fetchError } =
          await supabase
            .from("inscriptions")
            .select(`
              id,
              partie_id,
              utilisateur_id,
              joueur_id,
              rank,
              score,
              created_at,
              profils (
                id,
                nom
              )
            `)
            .eq("id", inscriptionId)
            .single();

        if (fetchError) throw fetchError;

        setInscrits((prev) => [
          ...prev,
          {
            ...inscription,
            score: 0,
            rank: null,
            gagnant: false,
          },
        ]);
      }

      // JOUEUR SANS COMPTE EXISTANT
      if (type === "player") {
        const { data: inscriptionId, error } = await supabase.rpc(
          "ajouter_joueur_existant_partie",
          {
            p_partie_id: partie.id,
            p_joueur_id: Number(value),
          }
        );

        if (error) throw error;

        const { data: inscription, error: fetchError } =
          await supabase
            .from("inscriptions")
            .select(`
              id,
              partie_id,
              utilisateur_id,
              joueur_id,
              rank,
              score,
              created_at,
              joueurs (
                id,
                nom
              )
            `)
            .eq("id", inscriptionId)
            .single();

        if (fetchError) throw fetchError;

        setInscrits((prev) => [
          ...prev,
          {
            ...inscription,
            score: 0,
            rank: null,
            gagnant: false,
          },
        ]);
      }

      setNewParticipant("");
    } catch (err) {
      console.error("Erreur ajout participant :", err);

      alert(
        `Erreur lors de l'ajout du joueur : ${
          err?.message || "erreur inconnue"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Créer un nouveau joueur sans compte
  // ============================================================

  const createNewPlayer = async () => {
    const nom = newPlayerName.trim();

    if (!nom) {
      alert("Indique le nom du joueur.");
      return;
    }

    setLoading(true);

    try {
      const { data: inscriptionId, error } = await supabase.rpc(
        "ajouter_joueur_partie",
        {
          p_partie_id: partie.id,
          p_nom: nom,
        }
      );

      if (error) throw error;

      const { data: inscription, error: fetchError } =
        await supabase
          .from("inscriptions")
          .select(`
            id,
            partie_id,
            utilisateur_id,
            joueur_id,
            rank,
            score,
            created_at,
            joueurs (
              id,
              nom
            )
          `)
          .eq("id", inscriptionId)
          .single();

      if (fetchError) throw fetchError;

      if (inscription.joueurs) {
        setAllJoueurs((prev) =>
          [...prev, inscription.joueurs].sort((a, b) =>
            a.nom.localeCompare(b.nom, "fr")
          )
        );
      }

      setInscrits((prev) => [
        ...prev,
        {
          ...inscription,
          score: 0,
          rank: null,
          gagnant: false,
        },
      ]);

      setNewPlayerName("");

      alert(`${nom} a été ajouté à la partie.`);
    } catch (err) {
      console.error(
        "Erreur lors de la création du joueur :",
        err
      );

      alert(
        `Erreur lors de la création du joueur : ${
          err?.message || "erreur inconnue"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Supprimer une inscription
  // ============================================================

  const removeInscrit = async (inscriptionId) => {
    if (!window.confirm("Retirer ce joueur de la partie ?")) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("inscriptions")
        .delete()
        .eq("id", inscriptionId);

      if (error) throw error;

      setInscrits((prev) =>
        prev.filter((i) => i.id !== inscriptionId)
      );
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Sauvegarder les rangs + scores
  // ============================================================

  const saveRanks = async () => {
    setLoading(true);

    try {
      for (const i of inscrits) {
        const { error } = await supabase
          .from("inscriptions")
          .update({
            rank: i.rank,
            score:
              i.score === 0 && !i.gagnant
                ? null
                : i.score,
          })
          .eq("id", i.id);

        if (error) throw error;
      }

      alert("Classements enregistrés !");

      onClose();
      fetchParties();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l’enregistrement des rangs.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Couleur / style selon le rang
  // ============================================================

  const rankStyle = (rank) => {
    if (rank === 1) {
      return {
        card: "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200",
        badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
      };
    }

    if (rank === 2) {
      return {
        card: "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200",
        badge: "bg-gray-100 text-gray-600 border-gray-200",
      };
    }

    if (rank === 3) {
      return {
        card: "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200",
        badge: "bg-orange-100 text-orange-700 border-orange-200",
      };
    }

    return {
      card: "bg-white border-gray-200",
      badge: "bg-gray-100 text-gray-500 border-gray-200",
    };
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy size={16} />;
    if (rank === 2) return <Medal size={16} />;
    if (rank === 3) return <Medal size={16} />;

    return null;
  };

  // ============================================================
  // Rendu
  // ============================================================

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative z-[101] bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[94vh] overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="relative bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-950 px-5 sm:px-6 py-5 sm:py-6 text-white overflow-hidden flex-shrink-0">
          {/* Décorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-20 w-60 h-60 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute -bottom-32 -left-20 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl" />

            <Trophy
              size={190}
              className="absolute -right-8 -bottom-20 text-white opacity-[0.035] rotate-12"
            />
          </div>

          {/* Fermeture */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition z-10"
            aria-label="Fermer"
          >
            <X size={19} />
          </button>

          {/* Titre */}
          <div className="relative flex items-center gap-3 pr-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <Trophy size={23} />
            </div>

            <div className="min-w-0">
              <p className="text-indigo-200 text-xs uppercase tracking-widest font-bold">
                Résultats de la partie
              </p>

              <h2 className="text-xl sm:text-2xl font-black truncate">
                {partie.jeux?.nom || "Classement"}
              </h2>

              {partie.date_partie && (
                <p className="text-indigo-200 text-sm mt-0.5">
                  Classement des joueurs
                </p>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================
            CONTENU
        ====================================================== */}

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">

          {/* Résumé */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-gray-800">
                Joueurs
              </h3>

              <p className="text-sm text-gray-500">
                {inscrits.length} joueur
                {inscrits.length > 1 ? "s" : ""} inscrit
                {inscrits.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={19} />
            </div>
          </div>

          {/* ===================================================
              LISTE DES INSCRITS
          ==================================================== */}

          <div className="space-y-2.5">
            {inscrits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <Users
                  size={34}
                  className="mx-auto text-gray-300 mb-2"
                />

                <p className="font-semibold text-gray-500">
                  Aucun joueur inscrit
                </p>

                <p className="text-sm text-gray-400 mt-1">
                  Ajoutez des joueurs ci-dessous.
                </p>
              </div>
            ) : (
              inscrits.map((i) => {
                const nomParticipant =
                  i.profil?.nom ||
                  i.profils?.nom ||
                  i.joueur?.nom ||
                  i.joueurs?.nom ||
                  i.utilisateur_id ||
                  "Joueur";

                const estJoueurSansCompte =
                  i.joueur_id !== null &&
                  i.joueur_id !== undefined;

                const style = rankStyle(i.rank);

                return (
                  <div
                    key={i.id}
                    className={`border rounded-2xl p-3 sm:p-3.5 transition-all ${style.card}`}
                  >
                    <div className="flex items-center gap-3">

                      {/* Rang */}
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 font-black ${style.badge}`}
                      >
                        {getRankIcon(i.rank) || (
                          <span className="text-sm">
                            {i.rank || "—"}
                          </span>
                        )}
                      </div>

                      {/* Nom */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {estJoueurSansCompte ? (
                            <span
                              className="text-purple-500"
                              title="Joueur sans compte"
                            >
                              <UserRound size={15} />
                            </span>
                          ) : (
                            <span
                              className="text-indigo-500"
                              title="Utilisateur"
                            >
                              <UserRound size={15} />
                            </span>
                          )}

                          <span className="font-bold text-gray-800 truncate">
                            {nomParticipant}
                          </span>

                          {i.gagnant && (
                            <Crown
                              size={15}
                              className="text-yellow-500 flex-shrink-0"
                            />
                          )}
                        </div>

                        <div className="text-xs text-gray-500 mt-0.5">
                          {i.rank
                            ? `Rang ${i.rank}`
                            : "Rang non défini"}
                        </div>
                      </div>

                      {/* Score */}
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            className="w-[72px] sm:w-[80px] border border-gray-200 bg-white rounded-xl px-2 py-2.5 text-center font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={i.score}
                            onChange={(e) =>
                              handleScoreChange(
                                i.id,
                                e.target.value
                              )
                            }
                            placeholder="Score"
                            aria-label={`Score de ${nomParticipant}`}
                          />
                        </div>

                        {/* Gagnant */}
                        <button
                          type="button"
                          onClick={() =>
                            handleWinnerToggle(i.id)
                          }
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                            i.gagnant
                              ? "bg-yellow-100 border-yellow-300 text-yellow-600 shadow-sm"
                              : "bg-white border-gray-200 text-gray-300 hover:text-yellow-500 hover:border-yellow-200"
                          }`}
                          title={
                            i.gagnant
                              ? "Retirer le statut de gagnant"
                              : "Définir comme gagnant"
                          }
                          aria-label={
                            i.gagnant
                              ? "Retirer le statut de gagnant"
                              : "Définir comme gagnant"
                          }
                        >
                          <Trophy size={17} />
                        </button>

                        {/* Supprimer */}
                        <button
                          type="button"
                          onClick={() =>
                            removeInscrit(i.id)
                          }
                          disabled={loading}
                          className="w-10 h-10 rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition disabled:opacity-50"
                          title="Retirer ce joueur"
                          aria-label="Retirer ce joueur"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ===================================================
              AJOUTER UN JOUEUR EXISTANT
          ==================================================== */}

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <UserPlus size={18} />
              </div>

              <div>
                <h3 className="font-black text-gray-800">
                  Ajouter un joueur
                </h3>

                <p className="text-xs text-gray-500">
                  Utilisateur ou joueur déjà enregistré
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                className="flex-1 appearance-none border border-gray-200 bg-white px-3 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={newParticipant}
                onChange={(e) =>
                  setNewParticipant(e.target.value)
                }
              >
                <option value="">
                  Sélectionner un joueur…
                </option>

                <optgroup label="👤 Utilisateurs">
                  {allUsers
                    .filter(
                      (u) =>
                        !inscrits.some(
                          (i) =>
                            i.utilisateur_id === u.id
                        )
                    )
                    .map((u) => (
                      <option
                        key={`user-${u.id}`}
                        value={`user:${u.id}`}
                      >
                        {u.nom}
                      </option>
                    ))}
                </optgroup>

                <optgroup label="🎭 Joueurs sans compte">
                  {allJoueurs
                    .filter(
                      (j) =>
                        !inscrits.some(
                          (i) =>
                            Number(i.joueur_id) ===
                            Number(j.id)
                        )
                    )
                    .map((j) => (
                      <option
                        key={`player-${j.id}`}
                        value={`player:${j.id}`}
                      >
                        {j.nom}
                      </option>
                    ))}
                </optgroup>
              </select>

              <button
                type="button"
                onClick={addParticipant}
                disabled={loading || !newParticipant}
                className={`sm:w-auto px-5 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                  loading || !newParticipant
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:-translate-y-0.5"
                }`}
              >
                {loading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Plus size={17} />
                )}

                Ajouter
              </button>
            </div>
          </div>

          {/* ===================================================
              CRÉER UN NOUVEAU JOUEUR
          ==================================================== */}

          <div className="mt-3 rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <UserRoundPlus size={18} />
              </div>

              <div>
                <h3 className="font-black text-gray-800">
                  Nouveau joueur sans compte
                </h3>

                <p className="text-xs text-gray-500">
                  Créer un joueur invité pour cette partie
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                className="flex-1 border border-purple-100 bg-white px-3 py-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Nom du joueur"
                value={newPlayerName}
                onChange={(e) =>
                  setNewPlayerName(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    createNewPlayer();
                  }
                }}
              />

              <button
                type="button"
                onClick={createNewPlayer}
                disabled={
                  loading || !newPlayerName.trim()
                }
                className={`sm:w-auto px-5 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                  loading || !newPlayerName.trim()
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 hover:shadow-lg"
                }`}
              >
                {loading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Plus size={17} />
                )}

                Créer
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <div className="flex flex-col-reverse sm:flex-row gap-3 border-t border-gray-100 bg-gray-50/90 px-4 sm:px-6 py-4 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 transition"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <X size={17} />
              Annuler
            </span>
          </button>

          <button
            type="button"
            onClick={saveRanks}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save size={17} />
              )}

              {loading
                ? "Enregistrement..."
                : "Enregistrer le classement"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}