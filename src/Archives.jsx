import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import RankModal from "./RankModal";

export default function Archives({ user, authUser }) {
  const currentUser = user || authUser;

  const [archives, setArchives] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLieu, setSelectedLieu] = useState("La loi des cartes");
  const [selectedPartieForRank, setSelectedPartieForRank] = useState(null);

  // -----------------------------------------------------
  // FETCH ROLE
  // -----------------------------------------------------
  useEffect(() => {
    const fetchRole = async () => {
      const { data } = await supabase
        .from("profils")
        .select("role")
        .eq("id", currentUser.id)
        .single();
      setUserRole(data?.role || "");
    };
    fetchRole();
  }, [currentUser]);

  // -----------------------------------------------------
  // FETCH PARTIES PASSEES
  // -----------------------------------------------------
  useEffect(() => {
    fetchPast();
  }, []);

  const fetchPast = async () => {
    const { data } = await supabase
      .from("parties")
      .select("*, jeux(*), organisateur:profils!parties_utilisateur_id_fkey(id, nom)")
      .order("date_partie", { ascending: true });

    const now = new Date();
    const past = [];

    for (let p of data || []) {
      const dateFull = new Date(`${p.date_partie}T${p.heure_partie}`);

      if (dateFull < now) {
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

        past.push({ ...p, inscrits });
      }
    }

    past.sort((a, b) => new Date(b.date_partie) - new Date(a.date_partie));

    setArchives(past);
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("fr-FR");
  const formatHeure = (t) => (t ? t.slice(0, 5) : "");

  const filterSearch = (list) => {
    const s = search.toLowerCase();
    return list.filter(
      (p) =>
        p.jeux?.nom?.toLowerCase().includes(s) ||
        p.nom?.toLowerCase().includes(s) ||
        p.lieu?.toLowerCase().includes(s) ||
        p.organisateur?.nom?.toLowerCase().includes(s)
    );
  };

  const lieux = ["Tous", ...new Set(archives.map((p) => p.lieu || "Inconnu"))];

  // -----------------------------------------------------
  // RENDU
  // -----------------------------------------------------
  return (
    <div className="p-4">

      <h1 className="text-2xl font-bold mb-4">Archives des parties</h1>

      {/* Recherche */}
      <input
        className="border p-2 rounded mb-4 w-full"
        placeholder="Rechercher..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filtre par lieu */}
      <select
        value={selectedLieu}
        onChange={(e) => setSelectedLieu(e.target.value)}
        className="border p-2 rounded mb-4"
      >
        {lieux.map((l) => (
          <option key={l}>{l}</option>
        ))}
      </select>

      {/* LISTE */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filterSearch(
          archives.filter((p) => selectedLieu === "Tous" || p.lieu === selectedLieu)
        ).map((p) => (
          <div
            key={p.id}
            className="border rounded p-4 bg-gray-100 shadow"
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
            <p className="text-sm text-gray-700 text-center">
              {p.organisateur?.nom} — {p.lieu}
            </p>

            {/* Classements */}
            {p.inscrits?.length > 0 && (
              <div className="mt-2">
                <h3 className="font-semibold text-sm mb-1 text-center">Classement :</h3>

                {p.inscrits
                  .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                  .map((i) => (
                    <div key={i.utilisateur_id} className="flex justify-between px-3 py-1 border rounded mb-1 bg-white">
                      <span>{i.profil?.nom}</span>
                      <span>{i.score} pts — Rank {i.rank}</span>
                    </div>
                  ))}
              </div>
            )}

            {(p.utilisateur_id === currentUser.id || userRole === "admin") && (
              <button
                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
                onClick={() => setSelectedPartieForRank(p)}
              >
                Gérer les scores 🏆
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedPartieForRank && (
        <RankModal
          partie={selectedPartieForRank}
          onClose={() => setSelectedPartieForRank(null)}
          fetchParties={fetchPast}
        />
      )}
    </div>
  );
}
