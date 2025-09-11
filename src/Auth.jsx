// src/Auth.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Connexion via API serverless
  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Veuillez entrer email et mot de passe.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        setErrorMsg(result.error);
      } else {
        onLogin(result.user);
        navigate("/profils", { replace: true });
      }
    } catch (err) {
      setErrorMsg("Erreur serveur : " + err.message);
    }

    setLoading(false);
  };

  // Inscription reste côté Supabase
  const handleSignUp = async () => {
    if (!email || !password) {
      setErrorMsg("Veuillez entrer email et mot de passe.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();
      if (!res.ok) setErrorMsg(result.error);
      else
        setErrorMsg(
          "✅ Un email de confirmation vous a été envoyé. Veuillez confirmer avant de vous connecter."
        );
    } catch (err) {
      setErrorMsg("Erreur serveur : " + err.message);
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
