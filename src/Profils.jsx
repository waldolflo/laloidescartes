import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom"; // 👈 ajouté

export default function Profils({ user, onLogin, onLogout, setProfilGlobal }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [profil, setProfil] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [jeux, setJeux] = useState([]);

  const navigate = useNavigate(); // 👈 utilisé pour rediriger après déconnexion

  // Charger le profil après login
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
    if (!error && data) {
      setProfil(data);
      setNom(data.nom || "");
      if (setProfilGlobal) setProfilGlobal(data);
    }
  };

  const fetchJeux = async () => {
    const { data, error } = await supabase
      .from("jeux")
      .select("id, nom, couverture_url")
      .order("nom", { ascending: true });
    if (!error) setJeux(data || []);
  };

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from("profils")
      .select("id, nom, role")
      .order("nom", { ascending: true });
    if (!error) setAllUsers(data || []);
  };

  // Connexion
  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Veuillez entrer email et mot de passe.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Erreur de connexion : " + error.message);
    } else if (data.user && !data.user.email_confirmed_at) {
      setErrorMsg("❌ Vous devez confirmer votre email avant de vous connecter.");
      await supabase.auth.signOut();
    } else {
      // Créer un profil si inexistant
      const { data: existing, error: fetchError } = await supabase
        .from("profils")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (fetchError && fetchError.code === "PGRST116") {
        await supabase.from("profils").insert([
          {
            id: data.user.id,
            nom: "",
            role: "user",
            created_at: new Date().toISOString(),
          },
        ]);
      }
      onLogin(data.user);
    }

    setLoading(false);
  };

  // Inscription
  const handleSignUp = async () => {
    if (!email || !password) {
      setErrorMsg("Veuillez entrer email et mot de passe.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Erreur d'inscription : " + error.message);
    } else {
      setErrorMsg(
        "✅ Un email de confirmation vous a été envoyé. Veuillez confirmer avant de vous connecter."
      );
    }

    setLoading(false);
  };

  // Mettre à jour jeux favoris
  const updateFavoris = async (champ, valeur) => {
    const { data, error } = await supabase
      .from("profils")
      .update({ [champ]: valeur })
      .eq("id", profil.id)
      .select()
      .single();
    if (!error) {
      setProfil(data);
      if (setProfilGlobal) setProfilGlobal(data);
    }
  };

  // Changer rôle (admin)
  const updateUserRole = async (userId, newRole) => {
    const { data, error } = await supabase
      .from("profils")
      .update({ role: newRole })
      .eq("id", userId)
      .select()
      .single();
    if (!error) setAllUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
  };

  // Supprimer son compte
  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "⚠️ Êtes-vous sûr de vouloir supprimer définitivement votre compte ?"
      )
    ) {
      return;
    }

    await supabase.from("profils").delete().eq("id", user.id);

    try {
      if (supabase.auth.admin?.deleteUser) {
        await supabase.auth.admin.deleteUser(user.id);
      }
    } catch (err) {
      console.warn(
        "Suppression du compte Auth non possible côté client :",
        err.message
      );
    }

    await supabase.auth.signOut();
    onLogout();
    navigate("/"); // 👈 redirige vers connexion
  };

  // ---------------- Rendu ----------------
  if (!user) {
    return (
      <div className="p-4 border rounded bg-white shadow max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Connexion / Inscription</h2>
        {errorMsg && <p className="text-red-600 mb-2">{errorMsg}</p>}
        <input
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        <button
          onClick={handleSignUp}
          disabled={loading}
          className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 mt-2"
        >
          {loading ? "Inscription..." : "Créer un compte"}
        </button>
      </div>
    );
  }

  if (profil?.role === "user") {
    return (
      <div className="p-4 max-w-2xl mx-auto text-center">
        <p className="text-lg text-red-600">
          Demandez dans Messenger à l'administrateur de valider votre compte.
        </p>
        <button
          onClick={() => {
            onLogout();
            navigate("/"); // 👈 redirection
          }}
          className="mt-4 bg-rose-700 text-white px-4 py-2 rounded hover:bg-rose-800"
        >
          Déconnexion
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {profil && (
        <>
          <h2 className="text-2xl font-bold mb-4">Mon profil</h2>

          {/* Prénom avec bouton Valider */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Prénom :</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="border p-2 rounded w-full"
                placeholder="Entrez votre prénom"
              />
              <button
                onClick={async () => {
                  if (!nom) return;
                  const { data, error } = await supabase
                    .from("profils")
                    .update({ nom })
                    .eq("id", profil.id)
                    .select()
                    .single();
                  if (!error) {
                    setProfil(data);
                    if (setProfilGlobal) setProfilGlobal(data);
                    alert("✅ Prénom mis à jour !");
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Valider
              </button>
            </div>
          </div>

          <p>
            <strong>Rôle :</strong> {profil.role}
          </p>

          {/* Jeux Favoris */}
          <h3 className="text-xl font-semibold mt-6 mb-2">
            🎲 Mes jeux favoris
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
                <option key={j.id} value={j.id}>
                  {j.nom}
                </option>
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
                <option key={j.id} value={j.id}>
                  {j.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {[profil.jeufavoris1, profil.jeufavoris2]
              .filter(Boolean)
              .map((id) => {
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

          {/* Déconnexion
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                onLogout();
                navigate("/"); // 👈 redirection
              }}
              className="bg-rose-700 text-white px-4 py-2 rounded hover:bg-rose-800"
            >
              Déconnexion
            </button>
          </div> */}

          {/* Gestion des utilisateurs pour admin */}
          {profil.role === "admin" && (
            <div className="mt-10">
              <h3 className="text-xl font-semibold mb-4">
                Gestion des utilisateurs
              </h3>
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
                            <span className="px-2 py-1 bg-gray-200 rounded">
                              {u.role}
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => {
                                const newRole = e.target.value;
                                if (
                                  window.confirm(
                                    `Changer le rôle de ${u.nom} en "${newRole}" ?`
                                  )
                                ) {
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

          {/* Supprimer mon compte */}
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
