// RankModal.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function RankModal({ partie, onClose, fetchParties }) {
  const [inscrits, setInscrits] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [newUserId, setNewUserId] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Charger inscrits + profils
  useEffect(() => {
    const loadData = async () => {
      const initial = partie.inscrits.map((i) => ({
        ...i,
        score: i.score || 0,
        gagnant: i.rank === 1,
        rank: i.rank || null,
      }));
      setInscrits(initial);

      const { data: users, error } = await supabase
        .from("profils")
        .select("id, nom")
        .order("nom");
      if (!error) setAllUsers(users || []);
    };
    loadData();
  }, [partie]);

  // 🔢 Recalcul automatique des ranks
  const computeRanks = (players) => {
    const gagnants = players.filter((p) => p.gagnant);
    const nonGagnants = players.filter((p) => !p.gagnant);

    // Trie par score décroissant
    nonGagnants.sort((a, b) => b.score - a.score);

    // Gagnants = rang 1
    gagnants.forEach((p) => (p.rank = 1));

    if (nonGagnants.length > 0) {
      let lastScore = null;
      let lastRank = gagnants.length > 0 ? 2 : 1;
      nonGagnants.forEach((p, i) => {
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

    return [...gagnants, ...nonGagnants].sort((a, b) => a.rank - b.rank);
  };

  // 🔹 Changer un score
  const handleScoreChange = (userId, value) => {
    const updated = inscrits.map((i) =>
      i.utilisateur_id === userId
        ? { ...i, score: parseFloat(value) || 0 }
        : i
    );
    setInscrits(computeRanks(updated));
  };

  // 🔹 Basculer gagnant
  const handleWinnerToggle = (userId) => {
    const updated = inscrits.map((i) =>
      i.utilisateur_id === userId ? { ...i, gagnant: !i.gagnant } : i
    );
    setInscrits(computeRanks(updated));
  };

  // 🔹 Ajouter un inscrit
  const addInscrit = async () => {
    if (!newUserId) return alert("Sélectionne un joueur à ajouter !");
    setLoading(true);
    try {
      if (inscrits.some((i) => i.utilisateur_id === newUserId)) {
        alert("Ce joueur est déjà inscrit !");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("inscriptions")
        .insert([{ partie_id: partie.id, utilisateur_id: newUserId }]);
      if (error) throw error;

      const userAdded = allUsers.find((u) => u.id === newUserId);
      const newList = [
        ...inscrits,
        {
          utilisateur_id: newUserId,
          profil: userAdded,
          rank: null,
          score: 0,
          gagnant: false,
        },
      ];
      setInscrits(newList);
      setNewUserId("");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l’ajout du joueur.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Supprimer un inscrit
  const removeInscrit = async (userId) => {
    if (!window.confirm("Retirer ce joueur de la partie ?")) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("inscriptions")
        .delete()
        .eq("partie_id", partie.id)
        .eq("utilisateur_id", userId);
      if (error) throw error;

      setInscrits((prev) => prev.filter((i) => i.utilisateur_id !== userId));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression.");
    } finally {
      setLoading(false);
    }
  };

  // 💾 Sauvegarder ranks + scores
  const saveRanks = async () => {
    setLoading(true);
    try {
      for (const i of inscrits) {
        await supabase
          .from("inscriptions")
          .update({ rank: i.rank, score: i.score })
          .eq("utilisateur_id", i.utilisateur_id)
          .eq("partie_id", partie.id);
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

  // 🎨 Couleur selon le rang
  const rankColor = (rank) => {
    if (rank === 1) return "bg-yellow-200";
    if (rank === 2) return "bg-gray-200";
    if (rank === 3) return "bg-orange-200";
    return "";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[480px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-center">
          🏆 Classement — {partie.jeux?.nom}
        </h2>

        {/* Liste des inscrits */}
        {inscrits.map((i) => (
          <div
            key={i.utilisateur_id}
            className={`flex justify-between items-center mb-3 border-b pb-1 p-1 ${rankColor(
              i.rank
            )}`}
          >
            <div className="flex flex-col">
              <span className="font-medium">
                {i.profil?.nom || i.utilisateur_id}
              </span>
              <div className="text-sm text-gray-500">
                {i.rank ? `Rang : ${i.rank}` : "—"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-16 border rounded p-1 text-center"
                value={i.score}
                onChange={(e) =>
                  handleScoreChange(i.utilisateur_id, e.target.value)
                }
                placeholder="Score"
              />
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={i.gagnant}
                  onChange={() => handleWinnerToggle(i.utilisateur_id)}
                />
                🥇
              </label>
              <button
                onClick={() => removeInscrit(i.utilisateur_id)}
                disabled={loading}
                className="text-red-600 hover:text-red-800 text-sm"
                title="Retirer ce joueur"
              >
                ❌
              </button>
            </div>
          </div>
        ))}

        {/* Ajouter un joueur */}
        <div className="border-t pt-3 mt-4">
          <h3 className="font-semibold mb-2 text-center">
            ➕ Ajouter un joueur
          </h3>
          <div className="flex gap-2">
            <select
              className="border rounded p-1 flex-1"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
            >
              <option value="">Sélectionner un joueur</option>
              {allUsers
                .filter(
                  (u) =>
                    !inscrits.some((i) => i.utilisateur_id === u.id)
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nom}
                  </option>
                ))}
            </select>
            <button
              onClick={addInscrit}
              disabled={loading}
              className={`px-3 py-1 rounded ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              } text-white`}
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* Boutons d’action */}
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
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
