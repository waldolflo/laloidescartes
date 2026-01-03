// src/Home.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Chat from "./Chat";
import CountUp from "react-countup"; // pour les stats animées
import { Phone, Mail } from "lucide-react";
import FacebookWidget from "./FacebookWidget";
import DiaporamaSwiper from "./DiaporamaSwiper";

export default function Home({ user }) {
  const currentUser = user || null;
  const [activeTab, setActiveTab] = useState("asso"); // onglet actif si connecté
  const [stats, setStats] = useState({ jeux: 0, parties: 0, rencontres: 0, membres: 0 });
  const [messagePresident, setMessagePresident] = useState("");
  const [annoncePresident, setAnnoncePresident] = useState("");
  const [facebookPosts, setFacebookPosts] = useState([]);
  const [planningImageUrl, setPlanningImageUrl] = useState("");
  const [countFollowersFB, setCountFollowersFB] = useState(null);
  const [countAdherentTotal, setCountAdherentTotal] = useState(null);
  const [countSeanceavantdouzeS, setCountSeanceavantdouzeS] = useState(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchPresidentMessage();
    fetchPresidentAnnonce();
    fetchPlanningImage();
    fetchFacebookPosts();
    fetchCountFollowersFB();
    fetchCountAdherentTotal();
    fetchCountSeanceavantdouzeS();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setZoomOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // ----------------------
  // Stats générales
  // ----------------------
  const fetchStats = async () => {
    try {
      const [jeuxRes, partiesRes, membresRes] = await Promise.all([
        supabase.from("jeux").select("id", { count: "exact" }),
        supabase.from("parties").select("id", { count: "exact" }).eq("lieu", "La loi des cartes"),
        supabase
          .from("profils")
          .select("id", { count: "exact" })
          .in("role", ["membre", "ludo", "ludoplus", "admin"]),
      ]);

      // ----------------------
      // Rencontres (jours distincts)
      // ----------------------
      const { data: partiesDates } = await supabase
        .from("parties")
        .select("date_partie")
        .eq("lieu", "La loi des cartes");

      const rencontresCount = new Set(
        (partiesDates || []).map(p =>
          new Date(p.date_partie).toISOString().split("T")[0]
        )
      ).size;

      // ----------------------
      // ⏱️ Heures de jeu (PAR PARTIE)
      // ----------------------
      const { data: parties } = await supabase
        .from("parties")
        .select("jeu_id")
        .eq("lieu", "La loi des cartes");

      let totalMinutes = 0;

      if (parties && parties.length > 0) {
        const jeuIds = parties.map(p => p.jeu_id);

        const { data: jeux } = await supabase
          .from("jeux")
          .select("id, duree")
          .in("id", jeuIds);

        // Map id -> durée
        const dureeParJeu = {};
        (jeux || []).forEach(jeu => {
          if (!jeu.duree) return;

          const minutes = parseInt(
            jeu.duree.toString().split("-")[0].trim(),
            10
          );

          if (!isNaN(minutes)) {
            dureeParJeu[jeu.id] = minutes;
          }
        });

        // Addition par PARTIE
        parties.forEach(partie => {
          const minutes = dureeParJeu[partie.jeu_id];
          if (minutes) {
            totalMinutes += minutes;
          }
        });
      }

      const totalHeures = Math.round((totalMinutes / 60) * 10) / 10;

      setStats({
        jeux: jeuxRes?.count || 0,
        parties: partiesRes?.count || 0,
        rencontres: rencontresCount || 0,
        membres: membresRes?.count || 0,
        heures: totalHeures || 0,
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
  // Annonce du président
  // ----------------------
  const fetchPresidentAnnonce = async () => {
    try {
      const { data, error } = await supabase
        .from("settings") // si table absente ou colonne absente, ne doit pas planter
        .select("global_image_url")
        .eq("id", 6)
        .single();

      if (error || !data) {
        console.warn("Impossible de récupérer l'annonce du président:", error?.message || "Aucune donnée");
        setAnnoncePresident(""); // fallback
        return;
      }

      setAnnoncePresident(data?.global_image_url || "");
    } catch (err) {
      console.error("Erreur fetchPresidentAnnonce:", err);
      setAnnoncePresident("");
    }
  };

  const fetchPlanningImage = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 1)
        .single();

      if (!error && data?.global_image_url) {
        setPlanningImageUrl(data.global_image_url);
      }
    } catch (err) {
      console.error("Erreur fetchPlanningImage:", err);
    }
  };

  const fetchCountFollowersFB = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 3)
        .single();

      if (!error && data?.global_image_url) {
        setCountFollowersFB(Number(data.global_image_url));
      }
    } catch (err) {
      console.error("Erreur fetchCountFollowersFB:", err);
    }
  };

  const fetchCountAdherentTotal = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 4)
        .single();

      if (!error && data?.global_image_url) {
        setCountAdherentTotal(Number(data.global_image_url));
      }
    } catch (err) {
      console.error("Erreur fetchCountAdherentTotal:", err);
    }
  };

  const fetchCountSeanceavantdouzeS = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 5)
        .single();

      if (!error && data?.global_image_url) {
        setCountSeanceavantdouzeS(Number(data.global_image_url));
      }
    } catch (err) {
      console.error("Erreur fetchCountSeanceavantdouzeS:", err);
    }
  };

  const countSeanceTotal =
  (stats.rencontres || 0) + (countSeanceavantdouzeS || 0);

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
        <img src="/logo_loidc_Complet_250.png" alt="Logo" className="mx-auto h-28" />
        <h1 className="text-4xl font-bold mt-4">La Loi des Cartes</h1>
        <p className="text-gray-700 mt-2">Découvrez nos jeux, rejoignez notre association pour des après-midi et soirées jeux.</p>
      </header>

      {currentUser && (
        <div className="mb-8">
          <nav className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setActiveTab("asso")}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                activeTab === "asso" ? "bg-purple-700 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              Association
            </button>
            <button
              onClick={() => setActiveTab("home")}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                activeTab === "home" ? "bg-purple-700 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              Accueil
            </button>
          </nav>
        </div>
      )}

      {/* ------------------------- */}
      {/* Contenu onglets */}
      {/* ------------------------- */}
      {currentUser ? (
        <>
          {activeTab === "asso" && (
            <section className="animate-fadeInBounce">
              {annoncePresident?.trim() && (
                <div className="p-6 bg-slate-800 text-white rounded-xl shadow-md mb-6 animate-fadeInBounce">
                  <h2 className="text-2xl font-bold text-center mb-4">📢 Annonce du président</h2>
                  <p className="text-center">{annoncePresident}</p>
                </div>
              )}
              <div className="mb-12 mt-12">
                <Chat user={currentUser} readOnly={false} />
              </div>
            </section>
          )}

          {activeTab === "home" && (
            <HomePublicContent
              stats={stats}
              countSeanceTotal={countSeanceTotal}
              countAdherentTotal={countAdherentTotal}
              countFollowersFB={countFollowersFB}
              messagePresident={messagePresident}
              planningImageUrl={planningImageUrl}
              setZoomOpen={setZoomOpen}
            />
          )}
        </>
      ) : (
        <HomePublicContent
          stats={stats}
          countSeanceTotal={countSeanceTotal}
          countAdherentTotal={countAdherentTotal}
          countFollowersFB={countFollowersFB}
          messagePresident={messagePresident}
          planningImageUrl={planningImageUrl}
          setZoomOpen={setZoomOpen}
        />
      )}

      <style jsx>{`
        @keyframes fadeInBounce {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          60% {
            opacity: 1;
            transform: translateY(-10px);
          }
          80% {
            transform: translateY(5px);
          }
          100% {
            transform: translateY(0);
          }
        }

        .animate-fadeInBounce {
          animation: fadeInBounce 0.8s ease-out forwards;
        }
      `}</style>

      {/* MODALE IMAGE */}
      {zoomOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center animate-fadeIn"
          onClick={() => setZoomOpen(false)}
        >
          {/* Conteneur image + bouton */}
          <div
            className="relative animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermer */}
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute -top-4 -right-4 bg-black bg-opacity-70 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold hover:bg-opacity-90 transition"
              aria-label="Fermer"
            >
              ✖
            </button>

            {/* Image zoomée */}
            <img
              src={planningImageUrl}
              alt="Planning zoomé"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}