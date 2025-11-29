import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; 
import { supabase } from "./supabaseClient";
import EditPartie from "./EditPartie";

export default function Parties({ user, authUser }) {
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

  if (!currentUser) return <p>Chargement de l’utilisateur…</p>;

  // -----------------------------------------------------
  // FETCH ROLE
  // -----------------------------------------------------
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

  // -----------------------------------------------------
  // FETCH JEUX & PARTIES À VENIR
  // -----------------------------------------------------
  useEffect(() => {
    fetchJeux();
    fetchParties();
  }, []);

  const fetchJeux = async () => {
    const { data } = await supabase.from("jeux").select("*");
    setJeux(data || []);
  };

  const fetchParties = async () => {
    const { data, error } = await supabase
      .from("parties")
      .select("*, jeux(*), organisateur:profils!parties_utilisateur_id_fkey(id, nom)")
      .order("date_partie", { ascending: true })
      .order("heure_partie", { ascending: true });

    if (error) return;

    const now = new Date();

    const upcoming = [];

    for (let p of data || []) {
      const dateFull = new Date(`${p.date_partie}T${p.heure_partie}`);

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

      const fullPartie = { ...p, inscrits };

      if (dateFull >= now) upcoming.push(fullPartie);
    }

    upcoming.sort((a, b) => new Date(a.date_partie) - new Date(b.date_partie));

    setParties(upcoming);
  };

  // -----------------------------------------------------
  // INSCRIPTION / DESINSCRIPTION
  // -----------------------------------------------------
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
      if ((partie.inscrits?.length || 0) >= (partie.jeux?.max_joueurs || 0)) {
        return alert("La partie est complète !");
      }
      await supabase
        .from("inscriptions")
        .insert([{ partie_id: partie.id, utilisateur_id: currentUser.id }]);
    }
    fetchParties();
  };

  // -----------------------------------------------------
  // CRÉATION PARTIE
  // -----------------------------------------------------
  const addPartie = async () => {
    if (!newPartie.jeu_id || !newPartie.date_partie || !newPartie.heure_partie) {
      setErrorMsg("Jeu, date et heure sont obligatoires");
      return;
    }

    const jeu = jeux.find((j) => j.id === newPartie.jeu_id);
    const nomDefault = `${jeu.nom} ${formatDate(newPartie.date_partie)} ${formatHeure(newPartie.heure_partie)}`;

    const { error } = await supabase.from("parties").insert([
      {
        ...newPartie,
        nom: nomDefault,
        utilisateur_id: currentUser.id,
        max_joueurs: jeu.max_joueurs,
      },
    ]);

    if (error) setErrorMsg(error.message);
    else {
      setShowModal(false);
      fetchParties();
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("fr-FR");

  const formatHeure = (t) => (t ? t.slice(0, 5) : "");

  const filterParties = (list) => {
    const s = search.toLowerCase();
    return list.filter(
      (p) =>
        p.jeux?.nom?.toLowerCase().includes(s) ||
        p.nom?.toLowerCase().includes(s) ||
        p.lieu?.toLowerCase().includes(s) ||
        p.organisateur?.nom?.toLowerCase().includes(s) ||
        formatDate(p.date_partie).includes(search)
    );
  };

  // -----------------------------------------------------
  // RENDU
  // -----------------------------------------------------
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Parties à venir</h1>
        {/* Bouton simple vers Archives */}
        <Link
          to="/archives"
          className="ml-4 bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300"
        >
          Voir les archives
        </Link>
      </div>

      {/* Barre de recherche */}
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border p-2 rounded"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {(userRole === "admin" ||
          userRole === "ludoplus" ||
          userRole === "ludo" ||
          userRole === "membre") && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Créer partie
          </button>
        )}
      </div>

      {/* MODAL CREATION */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Nouvelle partie</h2>

            {errorMsg && <p className="text-red-600">{errorMsg}</p>}

            <select
              value={newPartie.jeu_id}
              onChange={(e) =>
                setNewPartie((prev) => ({ ...prev, jeu_id: e.target.value }))
              }
              className="w-full border p-2 rounded mb-2"
            >
              <option value="">Choisir un jeu</option>
              {jeux.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nom}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={newPartie.date_partie}
              onChange={(e) =>
                setNewPartie((p) => ({ ...p, date_partie: e.target.value }))
              }
              className="w-full border p-2 rounded mb-2"
            />

            <input
              type="time"
              value={newPartie.heure_partie}
              onChange={(e) =>
                setNewPartie((p) => ({ ...p, heure_partie: e.target.value }))
              }
              className="w-full border p-2 rounded mb-2"
            />

            <input
              type="text"
              placeholder="Description"
              value={newPartie.description}
              onChange={(e) =>
                setNewPartie((p) => ({ ...p, description: e.target.value }))
              }
              className="w-full border p-2 rounded mb-2"
            />

            <input
              type="text"
              placeholder="Lieu"
              value={newPartie.lieu}
              onChange={(e) =>
                setNewPartie((p) => ({ ...p, lieu: e.target.value }))
              }
              className="w-full border p-2 rounded mb-2"
            />

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Annuler
              </button>
              <button
                onClick={addPartie}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTE DES PARTIES */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filterParties(parties).map((p) => {
          const isInscrit = p.inscrits?.some(
            (i) => i.utilisateur_id === currentUser.id
          );
          const placesRestantes =
            (p.jeux?.max_joueurs || 0) - (p.inscrits?.length || 0);

          return (
            <div
              key={p.id}
              className="border p-4 rounded shadow bg-white hover:shadow-lg transition flex flex-col"
            >
              {p.jeux?.couverture_url && (
                <img
                  src={p.jeux.couverture_url}
                  className="w-full h-40 object-contain mb-2"
                />
              )}

              <h2 className="text-lg font-bold text-center">{p.jeux?.nom}</h2>
              <p className="text-sm text-gray-600 text-center">
                {formatDate(p.date_partie)} — {formatHeure(p.heure_partie)}
              </p>
              {p.lieu && (
                <p className="text-sm text-gray-700 text-center">{p.lieu}</p>
              )}

              {/* Inscrits */}
              {p.inscrits?.map((i) => (
                <p key={i.utilisateur_id} className="text-sm text-center">
                  {i.profil?.nom}
                </p>
              ))}

              {/* Boutons */}
              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={() => toggleInscription(p)}
                  className={`px-3 py-2 rounded text-white ${
                    isInscrit
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isInscrit ? "Se désinscrire" : "S'inscrire"}
                </button>

                {(p.utilisateur_id === currentUser.id ||
                  userRole === "admin") && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingPartie(p)}
                      className="flex-1 bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                    >
                      Modifier
                    </button>

                    <button
                      onClick={async () => {
                        if (!window.confirm("Supprimer cette partie ?")) return;
                        await supabase.from("parties").delete().eq("id", p.id);
                        fetchParties();
                      }}
                      className="flex-1 bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    >
                      Supprimer
                    </button>
                  </div>
                )}

                {placesRestantes <= 0 && !isInscrit && (
                  <p className="text-red-600 text-xs text-center">
                    Partie complète
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingPartie && (
        <EditPartie
          partie={editingPartie}
          onClose={() => setEditingPartie(null)}
          onUpdate={fetchParties}
        />
      )}
    </div>
  );
}
