// src/Auth.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Connexion
  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Veuillez entrer email et mot de passe.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setErrorMsg("Erreur de connexion : " + authError.message);
      setLoading(false);
      return;
    }

    const authUser = authData.user;

    if (authUser && !authUser.email_confirmed_at) {
      setErrorMsg("❌ Vous devez confirmer votre email avant de vous connecter.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // Vérifier si le profil existe
    const { data: profilData, error: fetchError } = await supabase
      .from("profils")
      .select("*")
      .eq("id", authUser.id)
      .single();

    let userProfil = profilData;

    // Créer un profil si inexistant
    if (fetchError && fetchError.code === "PGRST116") {
      const { data: newProfil } = await supabase.from("profils").insert([
        {
          id: authUser.id,
          nom: "",
          role: "user",
          created_at: new Date().toISOString(),
        },
      ]).select().single();
      userProfil = newProfil;
    }

    // Retourner au parent : { authUser, user }
    onLogin(authUser, userProfil);
    navigate("/profil", { replace: true });
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

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setErrorMsg("Erreur d'inscription : " + error.message);
    } else {
      setErrorMsg(
        "✅ Un email de confirmation vous a été envoyé. Veuillez confirmer avant de vous connecter."
      );
    }

    setLoading(false);
  };

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
