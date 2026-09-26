import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

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
        // Charger les inscriptions de la partie
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

        // Charger tous les utilisateurs
        const { data: users, error: usersError } = await supabase
          .from("profils")
          .select("id, nom")
          .order("nom");

        if (usersError) throw usersError;

        setAllUsers(users || []);

        // Charger tous les joueurs sans compte actifs
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

    // Tout le monde à 0 et aucun gagnant
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

    // Tri par score décroissant
    nonGagnants.sort((a, b) => b.score - a.score);

    // Les gagnants sont rang 1
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

      // Vérifier si déjà présent
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

      // ========================================================
      // UTILISATEUR AVEC COMPTE
      // ========================================================

      if (type === "user") {
        const { data: inscriptionId, error } = await supabase.rpc(
          "ajouter_utilisateur_partie",
          {
            p_partie_id: partie.id,
            p_utilisateur_id: value,
          }
        );

        if (error) throw error;

        // Récupérer l'inscription créée
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

      // ========================================================
      // JOUEUR SANS COMPTE EXISTANT
      // ========================================================

      if (type === "player") {
        const { data: inscriptionId, error } = await supabase.rpc(
          "ajouter_joueur_existant_partie",
          {
            p_partie_id: partie.id,
            p_joueur_id: Number(value),
          }
        );

        if (error) throw error;

        // Récupérer l'inscription créée
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
      // Création du joueur + inscription à la partie
      // effectuées côté Supabase dans une seule opération
      const { data: joueurId, error } = await supabase.rpc(
        "ajouter_joueur_partie",
        {
          p_partie_id: partie.id,
          p_nom: nom,
        }
      );

      if (error) {
        console.error(
          "Erreur RPC ajouter_joueur_partie :",
          error
        );
        throw error;
      }

      // Ajouter le nouveau joueur à la liste locale
      const nouveauJoueur = {
        id: joueurId,
        nom,
        actif: true,
      };

      setAllJoueurs((prev) =>
        [...prev, nouveauJoueur].sort((a, b) =>
          a.nom.localeCompare(b.nom, "fr")
        )
      );

      // Ajouter l'inscription à l'affichage local
      setInscrits((prev) => [
        ...prev,
        {
          id: `new-${joueurId}`,
          partie_id: partie.id,
          utilisateur_id: null,
          joueur_id: joueurId,
          rank: null,
          score: 0,
          gagnant: false,
          joueurs: {
            id: joueurId,
            nom,
          },
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
  // Couleur selon le rang
  // ============================================================

  const rankColor = (rank) => {
    if (rank === 1) return "bg-yellow-200";
    if (rank === 2) return "bg-gray-200";
    if (rank === 3) return "bg-orange-200";
    return "";
  };

  // ============================================================
  // Rendu
  // ============================================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[480px] max-h-[90vh] overflow-y-auto">

        <h2 className="text-xl font-bold mb-4 text-center">
          🏆 Classement — {partie.jeux?.nom}
        </h2>

        {/* =====================================================
            Liste des inscrits
        ====================================================== */}

        {inscrits.map((i) => {
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

          return (
            <div
              key={i.id}
              className={`flex justify-between items-center mb-3 border-b pb-1 p-1 ${rankColor(
                i.rank
              )}`}
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {estJoueurSansCompte ? "👥 " : "👤 "}
                  {nomParticipant}
                </span>

                <div className="text-sm text-gray-500">
                  {i.rank
                    ? `Rang : ${i.rank}`
                    : "—"}
                </div>
              </div>

              <div className="flex items-center gap-2">

                <input
                  type="number"
                  className="w-16 border rounded p-1 text-center"
                  value={i.score}
                  onChange={(e) =>
                    handleScoreChange(
                      i.id,
                      e.target.value
                    )
                  }
                  placeholder="Score"
                />

                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={i.gagnant}
                    onChange={() =>
                      handleWinnerToggle(i.id)
                    }
                  />
                  🥇
                </label>

                <button
                  onClick={() =>
                    removeInscrit(i.id)
                  }
                  disabled={loading}
                  className="text-red-600 hover:text-red-800 text-sm"
                  title="Retirer ce joueur"
                >
                  ❌
                </button>

              </div>
            </div>
          );
        })}

        {/* =====================================================
            Ajouter un utilisateur ou joueur existant
        ====================================================== */}

        <div className="border-t pt-3 mt-4">

          <h3 className="font-semibold mb-2 text-center">
            ➕ Ajouter un joueur
          </h3>

          <div className="flex gap-2">

            <select
              className="border rounded p-1 flex-1"
              value={newParticipant}
              onChange={(e) =>
                setNewParticipant(e.target.value)
              }
            >
              <option value="">
                Sélectionner un joueur
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

              <optgroup label="👥 Joueurs sans compte">

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
              onClick={addParticipant}
              disabled={loading || !newParticipant}
              className={`px-3 py-1 rounded ${
                loading || !newParticipant
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              } text-white`}
            >
              Ajouter
            </button>

          </div>
        </div>

        {/* =====================================================
            Créer un nouveau joueur
        ====================================================== */}

        <div className="border-t pt-3 mt-4">

          <h3 className="font-semibold mb-2 text-center">
            👥 Nouveau joueur sans compte
          </h3>

          <div className="flex gap-2">

            <input
              type="text"
              className="border rounded p-1 flex-1"
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
              onClick={createNewPlayer}
              disabled={loading || !newPlayerName.trim()}
              className={`px-3 py-1 rounded ${
                loading || !newPlayerName.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700"
              } text-white`}
            >
              Créer
            </button>

          </div>

        </div>

        {/* =====================================================
            Boutons d'action
        ====================================================== */}

        <div className="flex justify-end gap-2 mt-5">

          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400"
          >
            Annuler
          </button>

          <button
            onClick={saveRanks}
            disabled={loading}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {loading
              ? "Enregistrement..."
              : "Enregistrer"}
          </button>

        </div>

      </div>
    </div>
  );
}