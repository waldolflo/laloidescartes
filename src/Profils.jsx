import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { v4 as uuidv4 } from "uuid";

export default function Profils({ user, onLogin, onLogout }) {
  const [nom, setNom] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [profil, setProfil] = useState(null);
  const [jeux, setJeux] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Charger profil et jeux
  useEffect(() => {
    if (user) {
      fetchProfil();
      fetchJeux();
      if (profil?.role === "admin") fetchAllUsers();
    }
  }, [user]);

  const fetchProfil = async () => {
    const { data, error } = await supabase
      .from("profils")
      .select("id, nom, role, jeufavoris1, jeufavoris2")
      .eq("id", user.id)
      .single();
    if (error) console.error("Erreur fetch profil :", error);
    else setProfil(data);
  };

  const fetchJeux = async () => {
    const { data, error } = await supabase
      .from("jeux")
      .select("id, nom, couverture_url")
      .order("nom", { ascending: true });
    if (error) console.error("Erreur fetch jeux :", error);
    else setJeux(data || []);
  };

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from("profils")
      .select("id, nom, role")
      .order("nom", { ascending: true });
    if (error) console.error("Erreur fetch users :", error);
    else setAllUsers(data || []);
  };

  const updateFavoris = async (field, value) => {
    if (!profil) return;
    const { data, error } = await supabase
      .from("profils")
      .update({ [field]: value || null })
      .eq("id", profil.id)
      .select()
      .single();
    if (error) console.error("Erreur update favoris :", error);
    else setProfil(data);
  };

  const updateUserRole = async (userId, newRole) => {
    const { data, error } = await supabase
      .from("profils")
      .update({ role: newRole })
      .eq("id", userId)
      .select()
      .single();
    if (error) console.error("Erreur update role :", error);
    else setAllUsers(prev => prev.map(u => (u.id === userId ? data : u)));
  };

  const handleLogin = async () => {
    if (!nom) {
      setErrorMsg("Veuillez entrer votre nom.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("profils")
        .select("*")
        .eq("nom", nom)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error(fetchError);
        setErrorMsg("Erreur lors de la recherche de profil.");
        setLoading(false);
        return;
      }

      let newUser;
      if (existing) newUser = existing;
      else {
        const newProfil = {
          id: uuidv4(),
          nom,
          role: "user",
          created_at: new Date().toISOString(),
        };
        const { data, error: insertError } = await supabase
          .from("profils")
          .insert([newProfil])
          .select()
          .single();
        if (insertError) {
          console.error(insertError);
          setErrorMsg("Erreur lors de la création du compte.");
          setLoading(false);
          return;
        }
        newUser = data;
      }

      if (onLogin) onLogin(newUser);
      setNom("");
    } catch (err) {
      console.error(err);
      setErrorMsg("Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ RENDU ------------------
  if (!user) {
    return (
      <div className="p-4 border rounded bg-white shadow max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Connexion / Inscription</h2>
        {errorMsg && <p className="text-red-600 mb-2">{errorMsg}</p>}
        <input
          type="text"
          placeholder="Votre Prénom N."
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter / Créer un compte"}
        </button>
      </div>
    );
  }

  if (profil.role === "user") {
    return (
      <div className="p-4 max-w-2xl mx-auto text-center">
        <p className="text-lg text-red-600">
          Demandez dans Messenger à l'administrateur de valider votre compte.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {profil && (
        <>
          <h2 className="text-2xl font-bold mb-4">Mon profil</h2>
          <p><strong>Prénom :</strong> {profil.nom}</p>
          <p><strong>Rôle :</strong> {profil.role}</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">
            🎲 Les jeux auxquels j’ai le plus envie de jouer
          </h3>

          <div className="mb-4">
            <label className="block font-medium mb-1">Jeu favori 1 :</label>
            <select
              value={profil.jeufavoris1 || ""}
              onChange={(e) => updateFavoris("jeufavoris1", e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">-- Choisir un jeu --</option>
              {jeux.map((j) => (
                <option key={j.id} value={j.id}>{j.nom}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Jeu favori 2 :</label>
            <select
              value={profil.jeufavoris2 || ""}
              onChange={(e) => updateFavoris("jeufavoris2", e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">-- Choisir un jeu --</option>
              {jeux.map((j) => (
                <option key={j.id} value={j.id}>{j.nom}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {[profil.jeufavoris1, profil.jeufavoris2].filter(Boolean).map((id) => {
              const jeu = jeux.find((j) => j.id === id);
              if (!jeu) return null;
              return (
                <div key={id} className="border rounded p-2 bg-white shadow">
                  <p className="font-semibold">{jeu.nom}</p>
                  {jeu.couverture_url && (
                    <img
                      src={jeu.couverture_url}
                      alt={jeu.nom}
                      className="w-full h-32 object-contain mt-2"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Bouton Déconnexion */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onLogout}
              className="bg-rose-700 text-white px-4 py-2 rounded hover:bg-rose-800"
            >
              Déconnexion
            </button>
          </div>

          {/* Tableau des utilisateurs (admin) */}
          {profil.role === "admin" && (
            <div className="mt-10">
              <h3 className="text-xl font-semibold mb-4">Gestion des utilisateurs</h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 p-2">Nom</th>
                    <th className="border border-gray-300 p-2">Rôle</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => {
                    const isCurrentAdmin = u.id === profil.id;
                    const isAdminUser = u.role === "admin";
                    return (
                      <tr key={u.id} className="text-center">
                        <td className="border border-gray-300 p-2">{u.nom}</td>
                        <td className="border border-gray-300 p-2">
                          {isCurrentAdmin || isAdminUser ? (
                            <span className="px-2 py-1 bg-gray-200 rounded">{u.role}</span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => {
                                const newRole = e.target.value;
                                if (window.confirm(`Voulez-vous changer le rôle de ${u.nom} en "${newRole}" ?`)) {
                                  updateUserRole(u.id, newRole);
                                } else e.target.value = u.role;
                              }}
                              className="border p-1 rounded"
                            >
                              <option value="user">user</option>
                              <option value="membre">membre</option>
                              <option value="ludo">ludo</option>
                              <option value="admin">admin</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
