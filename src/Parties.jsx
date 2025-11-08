import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import EditPartie from "./EditPartie";
import RankModal from "./RankModal";

export default function Parties({ user, authUser }) {
  const currentUser = user || authUser; // fallback si user pas encore passé

  const [parties, setParties] = useState({ upcoming: [], past: [] });
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
  const [selectedPartieForRank, setSelectedPartieForRank] = useState(null);

  // ------------------- PROTECTION SI PAS D'UTILISATEUR -------------------
  if (!currentUser) return <p>Chargement de l’utilisateur…</p>;

  // ------------------- FETCH ROLE UTILISATEUR -------------------
  useEffect(() => {
    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("profils")
        .select("role")
        .eq("id", currentUser.id)
        .single();
      if (!error) setUserRole(data?.role || "");
    };
    fetchRole();
  }, [currentUser]);

  // ------------------- FETCH JEUX ET PARTIES -------------------
  useEffect(() => {
    fetchJeux();
    fetchParties();
  }, []);

  const fetchJeux = async () => {
    const { data, error } = await supabase.from("jeux").select("*");
    if (!error) setJeux(data || []);
    else console.error("Erreur fetch jeux :", error);
  };

  const fetchParties = async () => {
    const { data, error } = await supabase
      .from("parties")
      .select("*, jeux(*), organisateur:profils!parties_utilisateur_id_fkey(id, nom)")
      .order("date_partie", { ascending: true })
      .order("heure_partie", { ascending: true });

    if (error) {
      console.error("Erreur fetch parties :", error);
      return;
    }

    const now = new Date();
    const upcoming = [];
    const past = [];

    for (let p of data || []) {
      const partDate = new Date(`${p.date_partie}T${p.heure_partie}`);

      // Récupérer les inscrits pour cette partie
      const { data: insData } = await supabase
        .from("inscriptions")
        .select("utilisateur_id, rank, score")
        .eq("partie_id", p.id);

      const userIds = (insData || []).map((i) => i.utilisateur_id);
      const { data: profilsData } = await supabase
        .from("profils")
        .select("id, nom")
        .in("id", userIds);

      const inscrits = (insData || []).map((i) => ({
        ...i,
        profil: profilsData?.find((u) => u.id === i.utilisateur_id),
      }));

      const partieWithInscrits = { ...p, inscrits };

      if (partDate >= now) upcoming.push(partieWithInscrits);
      else past.push(partieWithInscrits);
    }

    setParties({ upcoming, past });
  };

  // ------------------- INSCRIPTION / DÉSINSCRIPTION -------------------
  const toggleInscription = async (partie) => {
    const isInscrit = partie.inscrits?.some((i) => i.utilisateur_id === currentUser.id);

    if (isInscrit) {
      // Se désinscrire
      const { error } = await supabase
        .from("inscriptions")
        .delete()
        .eq("partie_id", partie.id)
        .eq("utilisateur_id", currentUser.id);
      if (error) return alert("Erreur de désinscription : " + error.message);
    } else {
      // S’inscrire
      if ((partie.inscrits?.length || 0) >= (partie.jeux?.max_joueurs || 0)) {
        return alert("La partie est complète !");
      }
      const { error } = await supabase
        .from("inscriptions")
        .insert([{ partie_id: partie.id, utilisateur_id: currentUser.id }]);
      if (error) return alert("Erreur d’inscription : " + error.message);
    }

    fetchParties();
  };

  // ------------------- AJOUT DE PARTIE -------------------
  const addPartie = async () => {
    if (!newPartie.jeu_id || !newPartie.date_partie || !newPartie.heure_partie) {
      setErrorMsg("Jeu, date et heure sont obligatoires");
      return;
    }
    setErrorMsg("");

    const jeu = jeux.find((j) => j.id === newPartie.jeu_id);
    if (!jeu) {
      setErrorMsg("Jeu sélectionné introuvable");
      return;
    }

    const nomDefault = `${jeu.nom} ${formatDate(newPartie.date_partie)} ${formatHeure(newPartie.heure_partie)}`;

    const { error } = await supabase.from("parties").insert([
      {
        ...newPartie,
        nom: nomDefault,
        utilisateur_id: currentUser.id,
        max_joueurs: jeu.max_joueurs || 0,
        nombredejoueurs: 0,
      },
    ]);

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
    } else {
      setShowModal(false);
      setNewPartie({
        jeu_id: "",
        date_partie: "",
        heure_partie: "",
        utilisateur_id: currentUser.id,
        description: "",
        lieu: "",
      });
      fetchParties();
    }
  };

  // ------------------- UTILS -------------------
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR");
  };

  const formatHeure = (timeStr) => (timeStr ? timeStr.slice(0, 5) : "");

  const filterParties = (list) => {
    return list.filter((p) => {
      const searchLower = search.toLowerCase();
      return (
        p.jeux?.nom?.toLowerCase().includes(searchLower) ||
        p.nom?.toLowerCase().includes(searchLower) ||
        p.lieu?.toLowerCase().includes(searchLower) ||
        p.organisateur?.nom?.toLowerCase().includes(searchLower) ||
        formatDate(p.date_partie).includes(search)
      );
    });
  };

  // ------------------- RENDU -------------------
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Parties</h1>

      {/* Barre de recherche */}
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border p-2 rounded"
          type="text"
          placeholder="Rechercher par jeu, date, organisateur, lieu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {(userRole === "admin" || userRole === "ludoplus" || userRole === "ludo" || userRole === "membre") && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Créer partie
          </button>
        )}
      </div>

      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Nouvelle partie</h2>
            {errorMsg && <p className="text-red-600 mb-2">{errorMsg}</p>}
            <select
              value={newPartie.jeu_id}
              onChange={(e) =>
                setNewPartie((prev) => ({ ...prev, jeu_id: e.target.value }))
              }
              className="w-full border p-2 rounded mb-2"
            >
              <option value="">Choisir un jeu</option>
              {jeux.map((j) => (
                <option key={j.id} value={j.id.toString()}>
                  {j.nom}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newPartie.date_partie}
              onChange={(e) =>
                setNewPartie((prev) => ({ ...prev, date_partie: e.target.value }))
              }
              className="w-full border p-2 rounded mb-2"
            />
            <input
              type="time"
              value={newPartie.heure_partie}
              onChange={(e) =>
                setNewPartie((prev) => ({ ...prev, heure_partie: e.target.value }))
              }
              className="w-full border p-2 rounded mb-2"
            />
            <input
              type="text"
              placeholder="Description (optionnelle)"
              value={newPartie.description}
              onChange={(e) =>
                setNewPartie((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full border p-2 rounded mb-2"
            />
            <input
              type="text"
              placeholder="Lieu (optionnel)"
              value={newPartie.lieu}
              onChange={(e) =>
                setNewPartie((prev) => ({ ...prev, lieu: e.target.value }))
              }
              className="w-full border p-2 rounded mb-2"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Annuler
              </button>
              <button
                onClick={addPartie}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parties à venir */}
      <h2 className="text-xl font-bold mb-2">Parties à venir</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filterParties(parties.upcoming).map((p) => {
          const isInscrit = p.inscrits?.some((i) => i.utilisateur_id === currentUser.id);
          const placesRestantes = (p.jeux?.max_joueurs || 0) - (p.inscrits?.length || 0);

          return (
            <div
              key={p.id}
              className="border rounded p-4 bg-white shadow flex flex-col hover:shadow-lg transition"
            >
              {p.jeux?.couverture_url && (
                <img
                  src={p.jeux.couverture_url}
                  alt={p.jeux.nom}
                  className="w-full h-40 object-contain mb-2"
                />
              )}

              <h2 className="text-lg font-bold text-center">{p.jeux?.nom}</h2>
              <p className="text-sm text-gray-600 text-center">
                {formatDate(p.date_partie)} — {formatHeure(p.heure_partie)}
              </p>
              {p.description && <p className="text-sm text-gray-600 text-center">{p.description}</p>}
              {p.lieu && <p className="text-sm text-gray-600 text-center">{p.lieu}</p>}
              <p className="text-sm text-gray-700 text-center">
                Organisateur : {p.organisateur?.nom || "?"}
              </p>
              <p className="text-sm text-gray-700 text-center">Joueurs inscrits : {p.nombredejoueurs} / {p.jeux?.max_joueurs}</p>

              {p.inscrits?.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {p.inscrits.map((i) => (
                    <li className="flex justify-between items-center rounded px-3 py-1 border" key={i.utilisateur_id}><span className="font-medium flex items-center gap-2">{i.profil?.nom || i.utilisateur_id}</span></li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-col gap-2 items-center">
                <button
                  onClick={() => toggleInscription(p)}
                  className={`w-full px-3 py-1 rounded text-white text-sm ${
                    isInscrit
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isInscrit ? "Se désinscrire" : "S’inscrire"}
                </button>

                {(p.utilisateur_id === currentUser.id || userRole === "admin") && (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => setEditingPartie(p)}
                      className="flex-1 bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-sm"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm("Voulez-vous vraiment supprimer cette partie ?")) return;
                        try {
                          const { error } = await supabase
                            .from("parties")
                            .delete()
                            .eq("id", p.id);
                          if (error) throw error;
                          fetchParties();
                        } catch (err) {
                          console.error(err);
                          alert("Erreur lors de la suppression de la partie.");
                        }
                      }}
                      className="flex-1 bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 text-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                )}

                {placesRestantes <= 0 && !isInscrit && (
                  <p className="text-red-600 text-xs mt-1">Partie complète</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Parties passées */}
      {parties.past?.length > 0 && (
        <>
          <h2 className="text-xl font-bold mt-6 mb-2">Archives de parties</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filterParties(parties.past).map((p) => (
              <div
                key={p.id}
                className="border rounded p-4 bg-gray-100 shadow flex flex-col gap-4 hover:shadow-lg transition"
              >
                {p.jeux?.couverture_url && (
                  <img
                    src={p.jeux.couverture_url}
                    alt={p.jeux.nom}
                    className="w-full h-40 object-contain"
                  />
                )}
                <div className="flex-1 flex flex-col justify-between">
                  <h2 className="text-lg font-bold text-center">{p.jeux?.nom}</h2>
                  <p className="text-sm text-gray-600 text-center">
                    {formatDate(p.date_partie)} — {formatHeure(p.heure_partie)}
                  </p>
                  <p className="text-sm text-gray-700 text-center">
                    {p.organisateur?.nom || "?"} — {p.lieu || "?"}
                  </p>

                  {p.inscrits?.length > 0 && (
                    <div className="mt-2">
                      <h3 className="font-semibold text-sm mb-1 text-center">Classement :</h3>
                      <ul className="flex flex-col gap-1">
                        {p.inscrits
                          .sort((a, b) => (a.rank || 99) - (b.rank || 99))
                          .map((i) => {
                            const rank = i.rank;
                            const score = i.score;
                            const nom = i.profil?.nom || "Joueur inconnu";

                            let bgColor = "bg-white";
                            let emoji = "";
                            if (rank === 1) {
                              bgColor = "bg-yellow-100";
                              emoji = "🥇";
                            } else if (rank === 2) {
                              bgColor = "bg-gray-200";
                              emoji = "🥈";
                            } else if (rank === 3) {
                              bgColor = "bg-orange-200";
                              emoji = "🥉";
                            }

                            return (
                              <li
                                key={i.utilisateur_id}
                                className={`flex justify-between items-center rounded px-3 py-1 border ${bgColor}`}
                              >
                                <span className="font-medium flex items-center gap-2">
                                  {emoji && <span>{emoji}</span>}
                                  {nom}
                                </span>
                                <div className="text-sm text-gray-700 flex items-center gap-2">
                                  {score !== null && score !== undefined && (
                                    <span>{score}</span>
                                  )}
                                  {rank && <span>Rang : {rank}</span>}
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  )}
                  {/* Bouton attribuer les rangs (admin ou organisateur) */}
                  {(p.utilisateur_id === currentUser.id || userRole === "admin") && (
                    <div className="mt-3 text-center">
                      <button
                        onClick={() => setSelectedPartieForRank(p)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                      >
                        Gérer les scores 🏆
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL EDITION */}
      {editingPartie && (
        <EditPartie
          partie={editingPartie}
          onClose={() => setEditingPartie(null)}
          onUpdate={fetchParties}
        />
      )}
      {/* MODAL RANKING */}
      {selectedPartieForRank && (
        <RankModal
          partie={selectedPartieForRank}
          onClose={() => setSelectedPartieForRank(null)}
          fetchParties={fetchParties}
        />
      )}
    </div>
  );
}
