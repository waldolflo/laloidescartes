import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import EditPartie from "./EditPartie";
import Inscriptions from "./Inscriptions";

export default function Parties({ user }) {
  const [parties, setParties] = useState({ upcoming: [], past: [] });
  const [jeux, setJeux] = useState([]);
  const [newPartie, setNewPartie] = useState({
    jeu_id: "",
    date_partie: "",
    heure_partie: "",
    utilisateur_id: user.id,
    description: "",
    lieu: "",
  });
  const [editingPartie, setEditingPartie] = useState(null);
  const [selectedPartie, setSelectedPartie] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [search, setSearch] = useState("");

  // ------------------- FETCH ROLE UTILISATEUR -------------------
  useEffect(() => {
    if (!user) return;
    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("profils")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!error) setUserRole(data?.role || "");
    };
    fetchRole();
  }, [user]);

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
        .select("utilisateur_id")
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
        utilisateur_id: user.id,
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
            Créer une partie
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

      {/* PARTIES À VENIR */}
      <h2 className="text-xl font-bold mb-2">Parties à venir</h2>
      <div className="grid gap-4">
        {filterParties(parties.upcoming)?.map((p) => (
          <div key={p.id} className="border rounded p-4 bg-white shadow flex gap-4">
            {p.jeux?.couverture_url && (
              <img
                src={p.jeux.couverture_url}
                alt={p.jeux.nom}
                className="w-24 h-24 object-contain"
              />
            )}
            <div className="flex-1">
              <h2 className="text-lg font-bold">{p.jeux?.nom}</h2>
              <p>{p.nom}</p>
              <p>Date: {formatDate(p.date_partie)} - Heure: {formatHeure(p.heure_partie)}</p>
              {p.description && <p>{p.description}</p>}
              {p.lieu && <p>Lieu: {p.lieu}</p>}
              <p>Organisateur: {p.organisateur?.nom || "?"}</p>
              <p>Joueurs inscrits: {p.nombredejoueurs} / {p.jeux?.max_joueurs}</p>

              {/* Liste des joueurs inscrits */}
              {p.inscrits?.length > 0 && (
                <ul className="list-disc pl-5 mt-2">
                  {p.inscrits.map((i) => (
                    <li key={i.utilisateur_id}>{i.profil?.nom || i.utilisateur_id}</li>
                  ))}
                </ul>
              )}

              {/* Boutons Modifier / Supprimer */}
              <div className="flex gap-2 mt-2">
                {(p.utilisateur_id === user.id || userRole === "admin") && (
                  <>
                    <button
                      onClick={() => setEditingPartie(p)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
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
                      className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    >
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PARTIES PASSÉES */}
      {parties.past?.length > 0 && (
        <>
          <h2 className="text-xl font-bold mt-6 mb-2">Archives de parties</h2>
          <div className="grid gap-4">
            {filterParties(parties.past).map((p) => (
              <div key={p.id} className="border rounded p-4 bg-gray-100 shadow flex gap-4">
                {p.jeux?.couverture_url && (
                  <img
                    src={p.jeux.couverture_url}
                    alt={p.jeux.nom}
                    className="w-24 h-24 object-contain"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-lg font-bold">{p.jeux?.nom}</h2>
                  <p>Date: {formatDate(p.date_partie)} - Heure: {formatHeure(p.heure_partie)}</p>
                  <p>Organisateur: {p.organisateur?.nom || "?"}</p>
                  {p.lieu && <p>Lieu: {p.lieu}</p>}
                  {p.inscrits?.length > 0 && (
                    <ul className="list-disc pl-5 mt-2">
                      {p.inscrits.map((i) => (
                        <li key={i.utilisateur_id}>{i.profil?.nom || i.utilisateur_id}</li>
                      ))}
                    </ul>
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

      {/* INSCRIPTIONS */}
      {selectedPartie && (
        <Inscriptions
          user={user}
          parties={parties.upcoming}
          updateInscritsCount={() => fetchParties()}
        />
      )}
    </div>
  );
}
