// src/Home.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Chat from "./Chat";
import CountUp from "react-countup"; // pour les stats animées

export default function Home({ user }) {
  const currentUser = user || null;

  const [stats, setStats] = useState({ jeux: 0, parties: 0, rencontres: 0, membres: 0 });
  const [messagePresident, setMessagePresident] = useState("");
  const [facebookPosts, setFacebookPosts] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchPresidentMessage();
    fetchFacebookPosts();
  }, []);

  // ----------------------
  // Stats générales
  // ----------------------
  const fetchStats = async () => {
    try {
      const [jeuxRes, partiesRes, rencontresRes, membresRes] = await Promise.all([
        supabase.from("jeux").select("id", { count: "exact" }),
        supabase.from("parties").select("id", { count: "exact" }),
        supabase.from("parties").select("date_partie", { distinct: true, count: "exact" }),
        supabase.from("profils").select("id", { count: "exact" }).gte("role", "membre"),
      ]);

      setStats({
        jeux: jeuxRes?.count || 0,
        parties: partiesRes?.count || 0,
        rencontres: rencontresRes?.count || 0,
        membres: membresRes?.count || 0,
      });
    } catch (error) {
      console.error("Erreur fetchStats:", error);
    }
  };

  // ----------------------
  // Mot du président
  // ----------------------
  const fetchPresidentMessage = async () => {
    try {
      const { data, error } = await supabase
        .from("settings") // si table absente ou colonne absente, ne doit pas planter
        .select("global_image_url")
        .eq("id", 2)
        .single();

      if (error || !data) {
        console.warn("Impossible de récupérer le mot du président:", error?.message || "Aucune donnée");
        setMessagePresident(""); // fallback
        return;
      }

      setMessagePresident(data?.global_image_url || "");
    } catch (err) {
      console.error("Erreur fetchPresidentMessage:", err);
      setMessagePresident("");
    }
  };

  // ----------------------
  // Publications Facebook (placeholder)
  // ----------------------
  const fetchFacebookPosts = async () => {
    try {
      const posts = [
        { id: 1, message: "Publication 1", permalink: "https://facebook.com" },
        { id: 2, message: "Publication 2", permalink: "https://facebook.com" },
      ];
      setFacebookPosts(posts);
    } catch (err) {
      console.error("Erreur fetchFacebookPosts:", err);
      setFacebookPosts([]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* LOGO + Titre */}
      <header className="text-center mb-12">
        <img src="/public/logo_loidc.png" alt="Logo" className="mx-auto h-28" />
        <h1 className="text-4xl font-bold mt-4">La Loi des Cartes</h1>
        <p className="text-gray-700 mt-2">Découvrez nos jeux, nos rencontres et notre association.</p>
      </header>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Jeux", value: stats.jeux, color: "text-blue-600" },
          { label: "Parties organisées", value: stats.parties, color: "text-green-600" },
          { label: "Rencontres", value: stats.rencontres, color: "text-purple-600" },
          { label: "Adhérents", value: stats.membres, color: "text-rose-600" },
        ].map((stat) => (
          <div key={stat.label} className="p-6 bg-white rounded shadow hover:shadow-lg transition text-center">
            <h2 className={`text-3xl font-bold ${stat.color}`}>
              <CountUp end={stat.value} duration={1.5} />
            </h2>
            <p className="text-gray-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* MOT DU PRESIDENT */}
      {messagePresident && (
        <section className="mb-12 p-6 bg-blue-50 rounded shadow">
          <h2 className="text-2xl font-bold mb-3">Mot du président</h2>
          <p className="text-gray-700">{messagePresident}</p>
        </section>
      )}

      {/* PUBLICATIONS FACEBOOK */}
      {facebookPosts.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Dernières publications</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {facebookPosts.map((post) => (
              <div key={post.id} className="p-4 bg-white rounded shadow hover:shadow-lg transition">
                <p className="text-gray-700 mb-2">{post.message}</p>
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-medium hover:underline"
                >
                  Voir sur Facebook
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CHAT */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">💬 Chat de l'asso</h2>
        <Chat user={currentUser} readOnly={!currentUser} />
      </section>
    </div>
  );
}
