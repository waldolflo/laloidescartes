// src/Home.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Chat from "./Chat";

export default function Home({ user }) {
  const [stats, setStats] = useState({});
  const [messagePresident, setMessagePresident] = useState("");
  const [facebookPosts, setFacebookPosts] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchPresidentMessage();
    fetchFacebookPosts();
  }, []);

  const fetchStats = async () => {
    const [jeux, parties, rencontres, membres] = await Promise.all([
      supabase.from("jeux").select("id", { count: "exact" }),
      supabase.from("parties").select("id", { count: "exact" }),
      supabase.from("parties").select("date_partie", { count: "exact", distinct: true }),
      supabase.from("profils").select("id", { count: "exact" }).gte("role", "membre")
    ]);

    setStats({
      jeux: jeux.count,
      parties: parties.count,
      rencontres: rencontres.count,
      membres: membres.count
    });
  };

  const fetchPresidentMessage = async () => {
    const { data } = await supabase
      .from("president_message")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);
    setMessagePresident(data?.[0]?.message || "");
  };

  const fetchFacebookPosts = async () => {
    // Ici tu peux intégrer la récupération via l'API Graph Facebook
    setFacebookPosts([]); // Placeholder pour l'instant
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="text-center my-8">
        <img src="/logo.png" alt="Logo de l'association" className="mx-auto h-24" />
        <h1 className="text-3xl font-bold mt-4">Bienvenue sur notre association !</h1>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
        <div className="p-4 bg-white rounded shadow">
          <h2 className="text-xl font-bold">{stats.jeux || 0}</h2>
          <p>Jeux</p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h2 className="text-xl font-bold">{stats.parties || 0}</h2>
          <p>Parties organisées</p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h2 className="text-xl font-bold">{stats.rencontres || 0}</h2>
          <p>Rencontres</p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h2 className="text-xl font-bold">{stats.membres || 0}</h2>
          <p>Adhérents</p>
        </div>
      </section>

      {messagePresident && (
        <section className="mb-8 p-6 bg-blue-50 rounded shadow">
          <h2 className="text-2xl font-bold mb-2">Mot du président</h2>
          <p>{messagePresident}</p>
        </section>
      )}

      {facebookPosts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Dernières publications</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {facebookPosts.map((post) => (
              <div key={post.id} className="p-4 bg-white rounded shadow">
                <p>{post.message}</p>
                <a href={post.permalink} target="_blank" className="text-blue-600">Voir sur Facebook</a>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Chat</h2>
        <Chat user={user} readOnly={!user} />
      </section>
    </div>
  );
}
