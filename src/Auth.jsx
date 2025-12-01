import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import HCaptcha from "@hcaptcha/react-hcaptcha";

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  const captchaRef = useRef(null);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Veuillez entrer email et mot de passe.");
      return;
    }
    if (!captchaToken) {
      setErrorMsg("Veuillez valider le Captcha.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken }, // ✅ envoie le captcha à Supabase
    });

    if (error) {
      setErrorMsg("Erreur de connexion : " + error.message);
    } else if (data.user && !data.user.email_confirmed_at) {
      setErrorMsg("❌ Vous devez confirmer votre email avant de vous connecter.");
      await supabase.auth.signOut();
    } else {
      // Vérifie profil
      const { data: profilData, error: fetchError } = await supabase
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
      navigate("/profils", { replace: true });
    }

    setLoading(false);
    setCaptchaToken(null); // reset après usage
    captchaRef.current?.resetCaptcha();
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setErrorMsg("Veuillez entrer email et mot de passe.");
      return;
    }
    if (!captchaToken) {
      setErrorMsg("Veuillez valider le Captcha.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { captchaToken }, // ✅ aussi pour l'inscription
    });

    if (error) {
      setErrorMsg("Erreur d'inscription : " + error.message);
    } else {
      setErrorMsg(
        "✅ Un email de confirmation vous a été envoyé. Veuillez confirmer avant de vous connecter."
      );
    }

    setLoading(false);
    setCaptchaToken(null);
    captchaRef.current?.resetCaptcha();
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

      {/* ✅ Ajout du captcha */}
      <div className="mb-3">
        <HCaptcha
          sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY} // clé publique
          onVerify={(token) => setCaptchaToken(token)}
          ref={captchaRef}
        />
      </div>

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
