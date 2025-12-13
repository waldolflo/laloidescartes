// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "./supabaseClient";

import Catalogue from "./Catalogue";
import Parties from "./Parties";
import Archives from "./Archives";
import Inscriptions from "./Inscriptions";
import Statistiques from "./Statistiques";
import Profils from "./Profils";
import Auth from "./Auth";
import Home from "./Home";
import FooterBGG from "./FooterBGG"; // <-- importe ton FooterBGG
import Chat from "./Chat";
import { House, BookOpen, CalendarDays, Dices, User, LogOut, MessageCircle } from "lucide-react";

// --- Navbar responsive ---
function Navbar({ currentUser, authUser, onLogout }) {
  if (!currentUser) return null; // 👈 AJOUT
  const location = useLocation();

  const publicTabs = [
    { to: "/", label: "Accueil", icon: House },
  ];

  const privateTabs = [
    { to: "/catalogue", label: "Ludothèque", icon: BookOpen },
    { to: "/parties", label: "Parties", icon: CalendarDays },
    { to: "/statistiques", label: "Statistiques", icon: Dices },
    { to: "/profils", label: "Profil", icon: User },
    { to: "/chat", label: "Chat", icon: MessageCircle },
  ];

  const tabs = authUser ? [...publicTabs, ...privateTabs] : publicTabs;

  return (
    <>
      {/* Desktop */}
      <nav className="hidden md:block bg-slate-800 text-white sticky top-0 z-50 shadow-md w-full">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex gap-2">
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${active ? "bg-slate-700" : "hover:bg-slate-700"}`}
                >
                  <Icon size={18} />
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-rose-500 rounded-t"></span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-4">
            {authUser ? (
              <>
                <span className="text-sm">
                  Bonjour <strong>{currentUser?.nom || currentUser?.email}</strong>
                </span>
                <button
                  onClick={onLogout}
                  className="bg-rose-700 text-white px-4 py-2 rounded hover:bg-rose-800 text-sm"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                Connexion
              </Link>
            )}
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
              className={`flex flex-col items-center text-xs transition-colors ${
                active ? "text-rose-500" : "text-gray-300 hover:text-white"
              }`}
            >
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          );
        })}

        <button
          onClick={onLogout}
          className="flex flex-col items-center text-xs text-gray-300 hover:text-rose-500 transition-colors"
        >
          <LogOut size={22} />
          <span>Quitter</span>
        </button>
      </nav>
    </>
  );
}

// --- Animated Routes ---
function AnimatedRoutes({ authUser, user, setAuthUser, setUser }) {
  const location = useLocation();
  const currentUser = user || authUser || null;

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
          <Route path="/" element={<Home user={currentUser} />} />
          <Route path="/auth" element={<Auth />} />
          {currentUser ? (
            <>
              <Route path="/catalogue" element={<Catalogue user={currentUser} authUser={authUser} />} />
              <Route path="/parties" element={<Parties user={currentUser} authUser={authUser} />} />
              <Route path="/archives" element={<Archives user={currentUser} authUser={authUser} />} />
              <Route path="/inscriptions" element={<Inscriptions user={currentUser} authUser={authUser} />} />
              <Route path="/statistiques" element={<Statistiques user={currentUser} authUser={authUser} profil={currentUser} />} />
              <Route path="/profils" element={<Profils user={currentUser} setProfilGlobal={setUser} authUser={authUser} setAuthUser={setAuthUser} setUser={setUser} />} />
              <Route path="/chat" element={<Chat user={currentUser} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <Route path="/*" element={<Navigate to="/" replace />} />
          )}
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

// --- Bandeau RGPD ---
function GDPRBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("rgpdConsent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("rgpdConsent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 flex flex-col md:flex-row justify-between items-center gap-2 z-50 shadow-lg">
      <span className="text-sm">
        Ce site utilise des données personnelles (votre email et le prénom/surnom de votre choix) pour gérer votre compte et améliorer votre expérience.
      </span>
      <button
        onClick={accept}
        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
      >
        J'accepte
      </button>
    </div>
  );
}

// --- App principale ---
export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setAuthUser(data.user);
        const { data: profilData } = await supabase
          .from("profils")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();
        setUser(profilData);
      }
      setLoadingAuth(false); // 🔴 essentiel
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setUser(null);
  };

  const currentUser = user || authUser;

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Chargement...
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 pb-16 md:pb-0">
        <Navbar currentUser={currentUser} authUser={authUser} onLogout={handleLogout} />
        <div className="p-4">
          <AnimatedRoutes
            authUser={authUser}
            user={user}
            setAuthUser={setAuthUser}
            setUser={setUser}
          />
        </div>
        <GDPRBanner />
        <FooterBGG />
      </div>
    </Router>
  );
}