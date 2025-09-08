// src/Profils.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Navigate } from "react-router-dom";

export default function Profils({ authUser, setProfilGlobal }) {
  // redirection si pas connecté
  if (!authUser) return <Navigate to="/" replace />;

  const [user, setUser] = useState(null); // profil complet
  const [nom, setNom] = useState("");
  const [jeux, setJeux] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // 🔄 Récupération du profil complet et des jeux
  useEffect(() => {
    if (!authUser?.id) return;

    const fetchData = async () => {
      // Profil complet
      const { data: profilData, error: profilError } = await supabase
        .from("profils")
        .select("id, nom, role, jeufavoris1, jeufavoris2")
        .eq("id", authUser.id)
        .single();

      if (!profilError && profilData) {
        setUser(profilData);
        setNom(profilData.nom || "");
        setProfilGlobal(profilData);

        // Si admin, récupérer tous les utilisateurs
        if (profilData.role === "admin") {
          const { data: usersData } = await supabase
            .from("profils")
            .select("id, nom, role")
            .order("nom", { ascending: true });
          if (usersData) setAllUsers(usersData);
        }
      }

      // Jeux
      const { data: jeuxData } = await supabase
        .from("jeux")
        .select("id, nom, couverture_url")
        .order("nom", { ascending: true });
      if (jeuxData) setJeux(jeuxData);
    };

    fetchData();
  }, [authUser?.id, setProfilGlobal]);

  // 🔹 Modifier le prénom
  const updateNom = async () => {
    if (!nom.trim()) return;
    const { data, error } = await supabase
      .from("profils")
      .update({ nom })
      .eq("id", user.id)
      .select()
      .single();

    if (!error) {
      setUser(data);
      setProfilGlobal(data);
      alert("✅ Prénom mis à jour !");
    }
  };

  // 🔹 Modifier jeux favoris
  const updateFavoris = async (champ, valeur) => {
    const { data, error } = await supabase
      .from("profils")
      .update({ [champ]: valeur })
      .eq("id", user.id)
      .select()
      .single();

    if (!error) {
      setUser(data);
      setProfilGlobal(data);
    }
  };

  // 🔹 Modifier rôle (admin)
  const updateUserRole = async (userId, newRole) => {
    const { data, error } = await supabase
      .from("profils")
      .update({ role: newRole })
      .eq("id", userId)
      .select()
      .single();
    if (!error) setAllUsers(prev => prev.map(u => (u.id === userId ? data : u)));
  };

  // 🔹 Supprimer compte
  const handleDeleteAccount = async () => {
    if (!window.confirm("⚠️ Êtes-vous sûr de vouloir supprimer définitivement votre compte ?")) return;

    await supabase.from("profils").delete().eq("id", authUser.id);

    try {
      if (supabase.auth.admin?.deleteUser) {
        await supabase.auth.admin.deleteUser(authUser.id);
      }
    } catch (err) {
      console.warn("Suppression du compte Auth non possible côté client :", err?.message || err);
    }

    await supabase.auth.signOut();
    // Parent gérera la redirection via Navbar
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {user && (
        <>
          <h2 className="text-2xl font-bold mb-4">Mon profil</h2>

          {/* Prénom */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Prénom :</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nom}
                onChange={e => setNom(e.target.value)}
                className="border p-2 rounded w-full"
                placeholder="Entrez votre prénom"
              />
              <button
                onClick={updateNom}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Valider
              </button>
            </div>
          </div>

          <p><strong>Rôle :</strong> {user.role}</p>

          {/* Jeux favoris */}
          <h3 className="text-xl font-semibold mt-6 mb-2">🎲 Mes jeux favoris</h3>
          {[1, 2].map(i => (
            <div className="mb-4" key={i}>
              <label className="block font-medium mb-1">Jeu favori {i} :</label>
              <select
                value={user[`jeufavoris${i}`] || ""}
                onChange={e => updateFavoris(`jeufavoris${i}`, e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">-- Choisir un jeu --</option>
                {jeux.map(j => (
                  <option key={j.id} value={j.id}>{j.nom}</option>
                ))}
              </select>
            </div>
          ))}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {[user.jeufavoris1, user.jeufavoris2].filter(Boolean).map(id => {
              const jeu = jeux.find(j => j.id === id);
              if (!jeu) return null;
              return (
                <div key={id} className="border rounded p-2 bg-white shadow">
                  <p className="font-semibold">{jeu.nom}</p>
                  {jeu.couverture_url && (
                    <img src={jeu.couverture_url} alt={jeu.nom} className="w-full h-32 object-contain mt-2" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Gestion utilisateurs admin */}
          {user.role === "admin" && (
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
                  {allUsers.map(u => {
                    const isCurrentAdmin = u.id === user.id;
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
                              onChange={e => {
                                const newRole = e.target.value;
                                if (window.confirm(`Changer le rôle de ${u.nom} en "${newRole}" ?`)) {
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

          {/* Supprimer compte */}
          <div className="mt-10 border-t pt-6">
            <button
              onClick={handleDeleteAccount}
              className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Supprimer mon compte
            </button>
          </div>
        </>
      )}
    </div>
  );
}
