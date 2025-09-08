import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Profils from "./Profils";
import Auth from "./Auth";
import Catalogue from "./Catalogue";
import Parties from "./Parties";
import Inscriptions from "./Inscriptions";
import { BookOpen, CalendarDays, Users, User } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

// Navbar
function Navbar({ user, onLogout }) {
  const location = useLocation();
  const tabs = [
    { to: "/", label: "Ludothèque", icon: BookOpen },
    { to: "/parties", label: "Parties", icon: CalendarDays },
    { to: "/inscriptions", label: "Inscriptions", icon: Users },
    { to: "/profil", label: "Profil", icon: User },
  ];

  return (
    <>
      <nav className="hidden md:block bg-slate-800 text-white sticky top-0 z-50 shadow-md w-full">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex gap-2">
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    active ? "bg-slate-700" : "hover:bg-slate-700"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                  {active && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-rose-500 rounded-t"></span>}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">Bonjour <strong>{user.nom || user.email}</strong></span>
            <button
              onClick={onLogout}
              className="bg-rose-700 text-white px-4 py-2 rounded hover:bg-rose-800 text-sm"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>
      {/* Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 text-white flex justify-around items-center py-2 shadow-inner z-50">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center text-xs transition-colors ${active ? "text-rose-500" : "text-gray-300 hover:text-white"}`}
            >
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// Routes animées
function AnimatedRoutes({ authUser, user, setUser}) {
  const location = useLocation();

    // Tant que user n'est pas encore récupéré depuis DB
  if (authUser && !user) {
    return <div className="text-center mt-10">Chargement du profil...</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <Routes location={location}>
          {!authUser ? (
            <Route path="/*" element={<Auth onLogin={setUser} />} />
          ) : (
            <>
              <Route path="/" element={<Catalogue user={user} />} />
              <Route path="/parties" element={<Parties user={user} />} />
              <Route path="/inscriptions" element={<Inscriptions user={user} />} />
              <Route path="/profil" element={<Profils authUser={authUser} setProfilGlobal={setUser} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

// App principale
export default function App() {
  const [authUser, setAuthUser] = useState(null); // authUser = supabase.auth.getUser()
  const [user, setUser] = useState(null);         // user = profil complet
  const [profil, setProfil] = useState(null);     // profil complet pour Navbar
  const navigate = useNavigate();
  const location = useLocation();

  // Redirection automatique après login
  useEffect(() => {
    if (user && (location.pathname === "/" || location.pathname === "/auth")) {
      navigate("/profil", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Fonction passée à Auth.jsx
  const handleLogin = (auth, profil) => {
    setAuthUser(auth);
    setUser(profil);
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setAuthUser(data.user);
        const { data: profilData } = await supabase.from("profils").select("*").eq("id", data.user.id).single();
        setUser(profilData);
        setProfil(profilData);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setUser(null);
    setProfil(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 pb-16 md:pb-0">
        {authUser && <Navbar user={profil || authUser} onLogout={handleLogout} />}
        <div className="p-4">
          <AnimatedRoutes authUser={authUser} user={user} setUser={setUser} setProfil={setProfil} />
        </div>
      </div>
    </Router>
  );
}
