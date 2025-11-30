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

    // Génération pseudo fun
  const generateRandomName = () => {
    const adjectives = ["Rapide", "Mystique", "Épique", "Fougueux", "Sombre", "Lumineux", "Vaillant", "Astucieux"];
    const creatures = ["Dragon", "Licorne", "Phoenix", "Ninja", "Pirate", "Viking", "Samouraï", "Gobelin"];

    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomCreature = creatures[Math.floor(Math.random() * creatures.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);

    return `${randomAdj}${randomCreature}${randomNum}`;
  };

  // Création du profil immédiatement après login/signup
  const createProfileIfNeeded = async (userId) => {
    console.log("➡️ createProfileIfNeeded userId:", userId);
    if (!userId) {
      console.error("❌ userId undefined ! (ne peut pas créer de profil)");
      return;
    }

    try {
      // 1) check existant
      const { data: profilData, error: fetchError } = await supabase
        .from("profils")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) {
        console.error("Fetch profil error:", fetchError);
        // continue: on va tenter d'insérer si aucune ligne trouvée
      } else if (profilData) {
        console.log("✔ Profil déjà présent:", profilData);
        return profilData;
      }

      // 2) tentative d'insert AVEC user_id (valeur fournie)
      console.log("Tentative INSERT avec user_id...");
      const randomName = generateRandomName();
      const { data: insertedWithUserId, error: insertErr1 } = await supabase
        .from("profils")
        .insert([
          {
            id: crypto.randomUUID(),
            user_id: userId,
            nom: randomName,
            role: "user",
          },
        ])
        .select()
        .single();

      if (!insertErr1 && insertedWithUserId) {
        console.log("✔ Insert with user_id OK:", insertedWithUserId);
        return insertedWithUserId;
      }

      console.warn("Insert with user_id failed:", insertErr1);

      // 3) si échec, tenter insert SANS user_id (utile si colonne a DEFAULT auth.uid())
      console.log("Tentative INSERT sans user_id (laisser DB poser auth.uid())...");
      const { data: insertedNoUser, error: insertErr2 } = await supabase
        .from("profils")
        .insert([
          {
            id: crypto.randomUUID(),
            nom: randomName,
            role: "user",
          },
        ])
        .select()
        .single();

      if (!insertErr2 && insertedNoUser) {
        console.log("✔ Insert without user_id OK:", insertedNoUser);

        // 4) vérification : relire par user_id (au cas où DB a posé user_id)
        const { data: finalProfile, error: finalFetchErr } = await supabase
          .from("profils")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (finalFetchErr) {
          console.error("Erreur fetch final :", finalFetchErr);
          return insertedNoUser; // on retourne la ligne insérée même si user_id n'est pas fixé
        }

        console.log("Final profile by user_id:", finalProfile);
        return finalProfile || insertedNoUser;
      }

      console.error("Insert sans user_id aussi échoué :", insertErr2);
      return null;
    } catch (err) {
      console.error("Unexpected error createProfileIfNeeded:", err);
      return null;
    }
  };

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
      options: { captchaToken },
    });

    if (error) {
      setErrorMsg("Erreur de connexion : " + error.message);
    } else if (data.user && !data.user.email_confirmed_at) {
      setErrorMsg("❌ Vous devez confirmer votre email avant de vous connecter.");
      await supabase.auth.signOut();
    } else {
      // ⚡ Crée le profil si nécessaire
      console.log("User connecté :", data.user);
      await createProfileIfNeeded(data.user.id);

      onLogin(data.user);
      navigate("/profils", { replace: true });
    }

    setLoading(false);
    setCaptchaToken(null);
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { captchaToken },
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

      <div className="mb-3">
        <HCaptcha
          sitekey={import.meta.env.VITE_HCAPTCHA_SITEKEY}
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
