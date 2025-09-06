import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { v4 as uuidv4 } from "uuid";

export default function Profils({ user, setUser, onLogout }) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [profil, setProfil] = useState(null);
  const [jeux, setJeux] = useState([]);

  useEffect(() => {
    if (user) {
      fetchProfil();
      fetchJeux();
    }
  }, [user]);

  const fetchProfil = async () => {
    const { data, error } = await supabase
      .from("profils")
      .select("id, nom, email, role, jeufavoris1, jeufavoris2")
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

  const handleLogin = async () => {
    if (!nom || !email) {
      setErrorMsg("Veuillez entrer votre nom et votre email.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("profils")
        .select("*")
        .eq("nom", nom)
        .eq("email", email)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error(fetchError);
        setErrorMsg("Erreur lors de la recherche de profil.");
        setLoading(false);
        return;
      }

      let newUser;
      if (existing) {
        newUser = existing;
      } else {
        const newProfil = {
          id: uuidv4(),
          nom,
          email,
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

      // ✅ on met directement à jour l'utilisateur global
      if (setUser) setUser(newUser);

      setNom("");
      setEmail("");
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
        <input
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

  // --- si le profil existe mais rôle non validé ---
  if (profil && profil.role === "user") {
    return (
      <div className="p-6 text-center bg-white shadow rounded max-w-lg mx-auto">
        <h2 className="text-xl font-bold mb-4">Compte en attente</h2>
        <p className="text-gray-700">
          Demandez dans Messenger à l’administrateur de valider votre compte.
        </p>
        <div className="mt-6">
          <button
            onClick={onLogout}
            className="bg-rose-700 text-white px-4 py-2 rounded hover:bg-rose-800"
          >
            Déconnexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {profil && (
        <>
          <h2 className="text-2xl font-bold mb-4">Mon profil</h2>
          <p><strong>Prénom :</strong> {profil.nom}</p>
          <p><strong>Email :</strong> {profil.email}</p>
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
        </>
      )}
    </div>
  );
}
