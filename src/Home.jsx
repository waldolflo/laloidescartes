// src/Home.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Chat from "./Chat";
import CountUp from "react-countup"; // pour les stats animées

export default function Home({ user }) {
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
      const [jeux, parties, rencontres, membres] = await Promise.all([
        supabase.from("jeux").select("id", { count: "exact" }),
        supabase.from("parties").select("id", { count: "exact" }),
        supabase.from("parties").select("date_partie", { count: "exact", distinct: true }),
        supabase.from("profils").select("id", { count: "exact" }).gte("role", "membre")
      ]);

      setStats({
        jeux: jeux.count || 0,
        parties: parties.count || 0,
        rencontres: rencontres.count || 0,
        membres: membres.count || 0
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
        .from("settings")
        .select("global_image_url")
        .eq("id", 1)
        .single();
        
      if (error) {
        console.warn("Table president_message absente ou autre erreur", error.message);
        setMessagePresident(""); // fallback
        return;
      }

      setMessagePresident(data.global_image_url || "");
    } catch (err) {
      console.error(err);
      setMessagePresident("");
    }
  };

  // ----------------------
  // Publications Facebook
  // ----------------------
  const fetchFacebookPosts = async () => {
    // Ici tu peux intégrer la récupération via l'API Graph Facebook
    // Pour l'instant, on met des placeholders
    setFacebookPosts([
      { id: 1, message: "Publication 1", permalink: "https://facebook.com" },
      { id: 2, message: "Publication 2", permalink: "https://facebook.com" },
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* LOGO + Titre */}
      <header className="text-center mb-12">
        <img src="/logo.png" alt="Logo" className="mx-auto h-28" />
        <h1 className="text-4xl font-bold mt-4">Bienvenue sur notre association !</h1>
        <p className="text-gray-700 mt-2">Découvrez nos jeux, nos rencontres et notre association.</p>
      </header>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <div className="p-6 bg-white rounded shadow hover:shadow-lg transition text-center">
          <h2 className="text-3xl font-bold text-blue-600">
            <CountUp end={stats.jeux} duration={1.5} />
          </h2>
          <p className="text-gray-600 mt-1">Jeux</p>
        </div>
        <div className="p-6 bg-white rounded shadow hover:shadow-lg transition text-center">
          <h2 className="text-3xl font-bold text-green-600">
            <CountUp end={stats.parties} duration={1.5} />
          </h2>
          <p className="text-gray-600 mt-1">Parties organisées</p>
        </div>
        <div className="p-6 bg-white rounded shadow hover:shadow-lg transition text-center">
          <h2 className="text-3xl font-bold text-purple-600">
            <CountUp end={stats.rencontres} duration={1.5} />
          </h2>
          <p className="text-gray-600 mt-1">Rencontres</p>
        </div>
        <div className="p-6 bg-white rounded shadow hover:shadow-lg transition text-center">
          <h2 className="text-3xl font-bold text-rose-600">
            <CountUp end={stats.membres} duration={1.5} />
          </h2>
          <p className="text-gray-600 mt-1">Adhérents</p>
        </div>
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
            {facebookPosts.map(post => (
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
        <h2 className="text-2xl font-bold mb-4">Chat communautaire</h2>
        <Chat user={user} readOnly={!user} />
      </section>
    </div>
  );
}
