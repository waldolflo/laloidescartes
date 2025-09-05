import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Inscriptions({ user }) {
  const [parties, setParties] = useState([]);
  const [selectedPartieId, setSelectedPartieId] = useState("");
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // S'assurer que le profil existe pour le user courant (sinon FK bloque l'insert)
  useEffect(() => {
    if (!user) return;
    supabase.from("profils").upsert([{ id: user.id, nom: user.nom }]).select();
  }, [user]);

  // Charger toutes les parties (uniquement celles où nombredejoueurs < max_joueurs)
    const fetchParties = async () => {
      setMsg("");

      // 1) récupérer toutes les parties
      const { data: partiesData, error: partiesErr } = await supabase
        .from("parties")
        .select("id, nom, date_partie, heure_partie, max_joueurs, nombredejoueurs");

      if (partiesErr) {
        console.error("Erreur fetch parties :", partiesErr);
        setMsg("Erreur au chargement des parties.");
        return;
      }

      // 2) récupérer les inscriptions de l'utilisateur courant
      const { data: userInscriptions } = await supabase
        .from("inscriptions")
        .select("partie_id")
        .eq("utilisateur_id", user.id);

      const userPartieIds = (userInscriptions || []).map((i) => i.partie_id);

      const now = new Date();

      const available = (partiesData || [])
        // garder les parties avec places dispo OU si l'utilisateur est déjà inscrit
        .filter((p) => 
          (p.nombredejoueurs ?? 0) < (p.max_joueurs ?? 0) || userPartieIds.includes(p.id)
        )
        // filtrer parties dont la date + heure n'est pas passée
        .filter((p) => {
          const dateTime = new Date(`${p.date_partie}T${p.heure_partie || "00:00"}`);
          return dateTime >= now;
        })
        // trier par date + heure croissante
        .sort((a, b) => {
          const dateA = new Date(`${a.date_partie}T${a.heure_partie || "00:00"}`);
          const dateB = new Date(`${b.date_partie}T${b.heure_partie || "00:00"}`);
          return dateA - dateB;
        });

      setParties(available);
    };
  useEffect(() => {
    fetchParties();

    // Abonnement temps réel pour recharger la liste à chaque changement sur inscriptions ou parties
    const partiesChannel = supabase
      .channel("realtime-parties")
      .on("postgres_changes", { event: "*", schema: "public", table: "inscriptions" }, () => {
        fetchParties();
        if (selectedPartieId) fetchInscriptions(selectedPartieId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(partiesChannel);
    };
  }, [selectedPartieId]);

  // Charger inscriptions + profils de la partie sélectionnée
  const fetchInscriptions = async (partieId) => {
    if (!partieId) return;
    setLoading(true);
    setMsg("");

    const { data: insData, error: insErr } = await supabase
      .from("inscriptions")
      .select("id, utilisateur_id")
      .eq("partie_id", partieId);

    if (insErr) {
      console.error("Erreur fetch inscriptions :", insErr);
      setMsg("Erreur au chargement des inscriptions.");
      setLoading(false);
      return;
    }

    if (!insData || insData.length === 0) {
      setInscriptions([]);
      setLoading(false);
      return;
    }

    const userIds = insData.map((i) => i.utilisateur_id);
    const { data: profilsData, error: profilsErr } = await supabase
      .from("profils")
      .select("id, nom")
      .in("id", userIds);

    if (profilsErr) {
      console.error("Erreur fetch profils :", profilsErr);
      setInscriptions(insData);
      setLoading(false);
      return;
    }

    const merged = insData.map((i) => ({
      ...i,
      profil: profilsData.find((p) => p.id === i.utilisateur_id),
    }));

    setInscriptions(merged);
    setLoading(false);
  };

  const handleSelectPartie = (e) => {
    const id = e.target.value;
    setSelectedPartieId(id);
    fetchInscriptions(id);
  };

  // S'inscrire
  const addInscription = async () => {
    if (!selectedPartieId || !user) return;

    if (inscriptions.some((i) => i.utilisateur_id === user.id)) {
      alert("Vous êtes déjà inscrit !");
      return;
    }

    const { error } = await supabase
      .from("inscriptions")
      .insert([{ partie_id: selectedPartieId, utilisateur_id: user.id }]);

    if (error) {
      console.error("Erreur insertion inscription :", error);
      alert(error.message || "Erreur lors de l’inscription");
      return;
    }

    fetchInscriptions(selectedPartieId);
    fetchParties(); // pour mettre à jour nombredejoueurs en direct
  };

  // Se désinscrire
  const removeMyInscription = async () => {
    const mine = inscriptions.find((i) => i.utilisateur_id === user.id);
    if (!mine) {
      alert("Vous n’êtes pas inscrit à cette partie.");
      return;
    }

    const { error } = await supabase
      .from("inscriptions")
      .delete()
      .eq("id", mine.id);

    if (error) {
      console.error("Erreur suppression inscription :", error);
      alert(error.message || "Erreur lors de la désinscription");
      return;
    }

    fetchInscriptions(selectedPartieId);
    fetchParties(); // pour mettre à jour nombredejoueurs
  };

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h2 className="text-xl font-bold mb-2">Inscriptions</h2>

      <select
        className="w-full border p-2 rounded mb-2"
        value={selectedPartieId}
        onChange={handleSelectPartie}
      >
        <option value="">Choisir une partie</option>
        {parties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nom} ({p.nombredejoueurs ?? 0}/{p.max_joueurs ?? 0})
          </option>
        ))}
      </select>

      {msg && <p className="text-red-600 mb-2">{msg}</p>}

      {selectedPartieId && (
        <div>
          {loading ? (
            <p>Chargement…</p>
          ) : inscriptions.length === 0 ? (
            <p>Aucun inscrit pour cette partie.</p>
          ) : (
            <ul className="list-disc pl-5 mb-2">
              {inscriptions.map((i) => (
                <li key={i.id}>{i.profil?.nom || i.utilisateur_id}</li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <button
              onClick={addInscription}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              S’inscrire
            </button>
            <button
              onClick={removeMyInscription}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Se désinscrire
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
