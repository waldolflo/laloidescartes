// src/Home.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Chat from "./Chat";
import CountUp from "react-countup"; // pour les stats animées
import { Phone, Mail } from "lucide-react";
import FacebookWidget from "./FacebookWidget";

export default function Home({ user }) {
  const currentUser = user || null;

  const [stats, setStats] = useState({ jeux: 0, parties: 0, rencontres: 0, membres: 0 });
  const [messagePresident, setMessagePresident] = useState("");
  const [facebookPosts, setFacebookPosts] = useState([]);
  const [planningImageUrl, setPlanningImageUrl] = useState("");
  const [countFollowersFB, setCountFollowersFB] = useState(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchPresidentMessage();
    fetchPlanningImage();
    fetchFacebookPosts();
    fetchCountFollowersFB();
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
        supabase.from("parties").select("id", { count: "exact" }),
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
        <img src="/logo_loidc.png" alt="Logo" className="mx-auto h-28" />
        <h1 className="text-4xl font-bold mt-4">La Loi des Cartes</h1>
        <p className="text-gray-700 mt-2">Découvrez nos jeux, nos rencontres et notre association.</p>
      </header>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Création de l'asso", value: "2021", color: "text-black-600" },
          { label: "Jeux", value: stats.jeux, color: "text-yellow-600" },
          { label: "Parties organisées via l'App", value: stats.parties, color: "text-green-600" },
          { label: "Heures de jeu organisées via l'App", value: stats.heures, color: "text-orange-600" },
          { label: "Après-midi et soirées jeux", value: stats.rencontres, color: "text-purple-600" },
          { label: "Adhérents sur l'App", value: stats.membres, color: "text-rose-600" },
          ...(countFollowersFB > 0
            ? [{ label: "Followers Facebook", value: countFollowersFB, color: "text-blue-600" }]
            : [])
        ].map((stat) => (
          <div key={stat.label} className="p-6 bg-white rounded shadow hover:shadow-lg transition text-center">
            <h2 className={`text-3xl font-bold ${stat.color}`}>
              <CountUp end={stat.value} duration={1.5} separator="" />
            </h2>
            <p className="text-gray-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* MOT DU PRESIDENT + PLANNING + FACEBOOK */}
      {(messagePresident || planningImageUrl ) && (
        <section className="mb-12 p-6 bg-blue-50 rounded shadow">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* COLONNE GAUCHE — Président */}
            {messagePresident && (
              <div className="flex flex-col">
                <p className="text-gray-700">{messagePresident}</p>

                {/* Boutons d'action */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="https://www.facebook.com/LaLoidesCartes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition text-center"
                  >
                    Nos actualités sur Facebook
                  </a>

                  <a
                    href="https://www.helloasso.com/associations/la-loi-des-cartes/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition text-center"
                  >
                    Adhérer en ligne sur HelloAsso
                  </a>
                </div>
              </div>
            )}

            {/* COLONNE CENTRALE — Planning */}
            {planningImageUrl && (
              <div className="flex justify-center">
                <img
                  src={planningImageUrl}
                  alt="Planning des prochaines rencontres"
                  onClick={() => setZoomOpen(true)}
                  className="w-56 h-56 lg:w-64 lg:h-64 object-contain border rounded shadow cursor-pointer hover:scale-105 transition-transform"
                />
              </div>
            )}

            {/* COLONNE DROITE — Facebook */}
            <div className="w-full flex justify-center">
              <FacebookWidget />
            </div>

          </div>
        </section>
      )}

      {/* --- Section TARIFS --- */}
      <section className="mt-12 bg-white rounded-xl shadow-md p-6 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
          TARIFS & ADHÉSION
        </h2>
        <p className="text-center text-gray-600">
          🎟️ Venez découvrir gratuitement, puis <strong>2€ / séance</strong> pour les non-adhérents.
        </p>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Texte */}
          <div className="space-y-4 text-gray-700">
            <h3 className="text-xl font-semibold">Adhésion à l’année</h3>


            <ul className="space-y-2">
              <li>🎲 <strong>Individuelle</strong> : 20€</li>
              <li>🎲 <strong>Duo</strong> : 35€</li>
              <li>🎲 <strong>Famille</strong> (min. 4) : 60€</li>
            </ul>

            <p className="mt-4">
              💸 <strong>10% de remise</strong> sur les jeux de société dans les boutiques partenaires.
            </p>

            <div className="mt-4">
              <a
                href="https://www.lantre.eu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 hover:opacity-80 transition"
              >
                <img
                  src="https://www.lantre.eu/wp-content/uploads/2017/06/logo-lantre-07-1.png"
                  alt="L’Antre du Jouet"
                  className="h-12 object-contain"
                />
                <span className="text-sm text-gray-600">Boutique partenaire</span>
              </a>
            </div>

            <p className="mt-6">
              ✅ <strong>Accès illimité</strong> aux séances du club
            </p>
          </div>

          {/* Illustration */}
          <div className="flex justify-center">
            <img
              src="https://laloidescartes.my.canva.site/_assets/media/aafb92db0bd70670b208b44a98d8ddcc.png"
              alt="Illustration jeux de société"
              className="rounded-xl shadow-md max-h-80 object-contain"
            />
          </div>
        </div>
      </section>

      {/* --- Section ADRESSE & CARTE --- */}
      <section className="mt-16 bg-slate-800 text-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 md:p-10">
          <h2 className="text-2xl font-bold text-center mb-8">Nous trouver</h2>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            
            {/* GAUCHE : adresse + image */}
            <div className="space-y-6">
              <div>
                <p className="text-lg font-semibold">📍 Adresse</p>
                <p className="text-gray-300 mt-1">
                  2 Rue Albert Leroy<br />
                  62170 Neuville-sous-Montreuil
                </p>
              </div>

              <img
                src="https://laloidescartes.my.canva.site/_assets/media/e330db1ce4e0a769721d6668a95d40f4.png"
                alt="Lieu de l'association"
                className="rounded-lg shadow-md max-h-64 object-contain"
              />
            </div>

            {/* DROITE : contact + carte */}
            <div className="space-y-6">
              
              {/* Contact */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone size={20} className="text-rose-400" />
                  <span className="text-lg">06 44 17 10 82</span>
                </div>

                <div className="flex items-center gap-3">
                  <Mail size={20} className="text-rose-400" />
                  <a
                    href="mailto:laloidescartes@gmail.com"
                    className="text-lg hover:underline"
                  >
                    laloidescartes@gmail.com
                  </a>
                </div>
                {/* Carte */}
                <div className="w-full h-[300px] rounded-lg overflow-hidden">
                  <iframe
                    title="Carte Google Maps"
                    src="https://www.google.com/maps?q=2%20Rue%20Albert%20Leroy%2062170%20Neuville-sous-Montreuil&output=embed"
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHAT */}
      <section className="mb-12">
        {/* ✅ Protection pour éviter le crash si user est null */}
        {currentUser ? (
          <Chat user={currentUser} readOnly={false} />
        ) : (
          <Chat user={null} readOnly={true} />
        )}
      </section>

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
