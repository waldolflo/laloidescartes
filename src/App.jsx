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
import AdminUtilisateurs from "./AdminUtilisateurs";
import AdminEvenements from "./AdminEvenements";
import AdminDiaporama from "./AdminDiaporama";
import AdminParametres from "./AdminParametres";
import AdminReseaux from "./AdminReseaux";
import Images from "./Images";
import Auth from "./Auth";
import Home from "./Home";
import FooterBGG from "./FooterBGG";
import HomeAssoContent from "./HomeAssoContent";
import {
  House,
  ChartPie,
  CalendarDays,
  Dices,
  User,
  LogOut,
} from "lucide-react";

// ============================================================
// NAVBAR RESPONSIVE
// ============================================================

function Navbar({ currentUser, authUser, onLogout }) {
  const location = useLocation();

  const publicTabs = [
    { to: "/", label: "Accueil", icon: House },
  ];

  const privateTabs = [
    { to: "/catalogue", label: "Ludothèque", icon: Dices },
    { to: "/parties", label: "Parties", icon: CalendarDays },
    { to: "/statistiques", label: "Statistiques", icon: ChartPie },
    { to: "/profils", label: "Profil", icon: User },
  ];

  const tabs = authUser ? [...publicTabs, ...privateTabs] : publicTabs;

  return (
    <>
      {/* ========================================================
          DESKTOP
          ======================================================== */}

      <nav className="hidden md:block sticky top-0 z-50 px-4 py-3 bg-gray-100">

        <div className="max-w-[1600px] mx-auto">

          <div className="relative overflow-hidden rounded-[1.75rem] shadow-2xl bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950">

            {/* ==================================================
                DÉCOR
                ================================================== */}

            <div className="absolute inset-0 overflow-hidden pointer-events-none">

              <img
                src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
                alt=""
                className="absolute -right-24 -top-20 w-[420px] opacity-[0.035] rotate-[-12deg]"
              />

              <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-purple-500/20 blur-3xl" />

              <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] rounded-full bg-indigo-500/20 blur-3xl" />

              <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-fuchsia-500/10 blur-3xl" />

            </div>

            {/* ==================================================
                CONTENU
                ================================================== */}

            <div className="relative px-5 py-4">

              <div className="flex items-center justify-between gap-6">

                {/* ==================================================
                    LOGO
                    ================================================== */}

                <Link
                  to="/"
                  className="flex-shrink-0 hidden lg:flex items-center"
                >
                  <div className="bg-white rounded-xl px-3 py-2 shadow-xl">

                    <img
                      src="https://laloidescartes.vercel.app/logo_loidc_Complet_250.png"
                      alt="La Loi des Cartes"
                      className="h-11 w-auto object-contain"
                    />

                  </div>
                </Link>

                {/* ==================================================
                    NAVIGATION
                    ================================================== */}

                <div className="flex items-center gap-1 flex-1">

                  {tabs.map(({ to, label, icon: Icon }) => {

                    const active = location.pathname === to;

                    return (
                      <Link
                        key={to}
                        to={to}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          active
                            ? "bg-white text-indigo-900 shadow-lg"
                            : "text-purple-100 hover:bg-white/10 hover:text-white"
                        }`}
                      >

                        <Icon size={18} />

                        {label}

                        {active && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-purple-400 rounded-full" />
                        )}

                      </Link>
                    );

                  })}

                </div>

                {/* ==================================================
                    UTILISATEUR
                    ================================================== */}

                <div className="flex items-center gap-3 flex-shrink-0">

                  {authUser ? (

                    <>

                      <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10">

                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black">

                          {(currentUser?.nom ||
                            currentUser?.email ||
                            "?")
                            .charAt(0)
                            .toUpperCase()}

                        </div>

                        <span className="text-sm text-white">

                          Bonjour{" "}

                          <strong>
                            {currentUser?.nom ||
                              currentUser?.email}
                          </strong>

                        </span>

                      </div>

                      <button
                        onClick={onLogout}
                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all hover:-translate-y-0.5"
                      >
                        <LogOut size={17} />
                        Déconnexion
                      </button>

                    </>

                  ) : (

                    <>

                      <span className="hidden xl:block text-xs text-purple-100 max-w-[400px] text-right leading-relaxed">

                        Créez un compte pour voir notre ludothèque,
                        vous inscrire aux parties, en créer, suivre
                        vos statistiques et accéder à des
                        fonctionnalités exclusives !

                      </span>

                      <Link
                        to="/auth"
                        className="inline-flex items-center gap-2 bg-white text-indigo-900 px-4 py-2.5 rounded-xl font-black text-sm shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
                      >
                        <User size={17} />
                        Connexion
                      </Link>

                    </>

                  )}

                </div>

              </div>

            </div>

          </div>

        </div>

      </nav>

      {/* ========================================================
          MOBILE
          ======================================================== */}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white flex justify-around items-center py-2 shadow-2xl z-50 border-t border-white/10">

        {tabs.map(({ to, label, icon: Icon }) => {

          const active = location.pathname === to;

          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center justify-center min-w-[60px] px-2 py-1 rounded-xl text-xs transition-all ${
                active
                  ? "text-white bg-white/10"
                  : "text-purple-200 hover:text-white"
              }`}
            >

              <Icon size={22} />

              <span className="mt-0.5 font-semibold">
                {label}
              </span>

              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-purple-300 rounded-full" />
              )}

            </Link>
          );

        })}

        {authUser ? (

          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center min-w-[60px] px-2 py-1 rounded-xl text-xs text-purple-200 hover:text-white transition-all"
          >
            <LogOut size={22} />

            <span className="mt-0.5 font-semibold">
              Quitter
            </span>
          </button>

        ) : (

          <Link
            to="/auth"
            className="flex flex-col items-center justify-center min-w-[60px] px-2 py-1 rounded-xl text-xs text-purple-200 hover:text-white transition-all"
          >
            <User size={22} />

            <span className="mt-0.5 font-semibold">
              Connexion
            </span>
          </Link>

        )}

      </nav>
    </>
  );
}

// ============================================================
// ANIMATED ROUTES
// ============================================================

function AnimatedRoutes({
  authUser,
  user,
  setAuthUser,
  setUser,
  onLogin,
}) {
  const location = useLocation();
  const currentUser = user || authUser || null;

  return (
    <AnimatePresence mode="wait">

      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{
          duration: 0.25,
          ease: "easeInOut",
        }}
      >

        <Routes location={location}>

          <Route
            path="/"
            element={<Home user={currentUser} />}
          />

          <Route
            path="/auth"
            element={<Auth onLogin={onLogin} />}
          />

          {/* ==================================================
              ROUTES PUBLIQUES
              ================================================== */}

          {/* ==================================================
              ROUTES PROTÉGÉES
              ================================================== */}

          {currentUser ? (

            <>

              <Route
                path="/catalogue"
                element={
                  <Catalogue
                    user={currentUser}
                    authUser={authUser}
                  />
                }
              />

              <Route
                path="/parties"
                element={
                  <Parties
                    user={currentUser}
                    authUser={authUser}
                  />
                }
              />

              <Route
                path="/archives"
                element={
                  <Archives
                    user={currentUser}
                    authUser={authUser}
                  />
                }
              />

              <Route
                path="/inscriptions"
                element={
                  <Inscriptions
                    user={currentUser}
                    authUser={authUser}
                  />
                }
              />

              <Route
                path="/statistiques"
                element={
                  <Statistiques
                    user={currentUser}
                    authUser={authUser}
                    profil={currentUser}
                  />
                }
              />

              <Route
                path="/profils"
                element={
                  <Profils
                    user={currentUser}
                    setProfilGlobal={setUser}
                    authUser={authUser}
                    setAuthUser={setAuthUser}
                    setUser={setUser}
                  />
                }
              />

              <Route
                path="/images"
                element={
                  user?.role === "admin" ? (
                    <Images
                      user={user}
                      authUser={authUser}
                    />
                  ) : (
                    <Navigate
                      to="/"
                      replace
                    />
                  )
                }
              />

              <Route
                path="/admin/utilisateurs"
                element={
                  user?.role === "admin" ? (
                    <AdminUtilisateurs
                      profil={user}
                    />
                  ) : (
                    <Navigate
                      to="/profils"
                      replace
                    />
                  )
                }
              />

              <Route
                path="/admin/evenements"
                element={
                  user?.role === "admin" ? (
                    <AdminEvenements
                      profil={user}
                    />
                  ) : (
                    <Navigate
                      to="/profils"
                      replace
                    />
                  )
                }
              />

              <Route
                path="/admin/diaporama"
                element={
                  user?.role === "admin" ? (
                    <AdminDiaporama
                      profil={user}
                    />
                  ) : (
                    <Navigate
                      to="/profils"
                      replace
                    />
                  )
                }
              />

              <Route
                path="/admin/parametres"
                element={
                  user?.role === "admin" ? (
                    <AdminParametres
                      profil={user}
                    />
                  ) : (
                    <Navigate
                      to="/profils"
                      replace
                    />
                  )
                }
              />

              <Route
                path="/admin/reseaux"
                element={
                  user?.role === "admin" ? (
                    <AdminReseaux
                      profil={user}
                    />
                  ) : (
                    <Navigate
                      to="/profils"
                      replace
                    />
                  )
                }
              />

              <Route
                path="/HomeAssoContent"
                element={
                  <HomeAssoContent
                    user={currentUser}
                  />
                }
              />

              <Route
                path="*"
                element={
                  <Navigate
                    to="/"
                    replace
                  />
                }
              />

            </>

          ) : (

            /* Redirection si pas connecté */

            <Route
              path="/*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          )}

        </Routes>

      </motion.div>

    </AnimatePresence>
  );
}

// ============================================================
// BANDEAU RGPD
// ============================================================

function GDPRBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {

    const consent =
      localStorage.getItem("rgpdConsent");

    if (!consent) {
      setVisible(true);
    }

  }, []);

  const accept = () => {

    localStorage.setItem(
      "rgpdConsent",
      "true"
    );

    setVisible(false);

  };

  if (!visible) return null;

  return (

    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 flex flex-col md:flex-row justify-between items-center gap-2 z-50 shadow-lg">

      <span className="text-sm">
        Ce site utilise des données personnelles
        (votre email et le prénom/surnom de votre choix)
        pour gérer votre compte, vous envoyer les notifications
        de votre choix et améliorer votre expérience.
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

// ============================================================
// APP PRINCIPALE
// ============================================================

export default function App() {

  const [authUser, setAuthUser] =
    useState(null);

  const [user, setUser] =
    useState(null);

  const [loadingAuth, setLoadingAuth] =
    useState(true);

  const [homeKey, setHomeKey] =
    useState(0);

  useEffect(() => {

    const getUser = async () => {

      const { data } =
        await supabase.auth.getUser();

      if (data?.user) {

        setAuthUser(data.user);

        const { data: profilData } =
          await supabase
            .from("profils")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();

        setUser(profilData);

      }

      setLoadingAuth(false);

    };

    getUser();

    // ========================================================
    // ÉCOUTE DES CHANGEMENTS D'AUTH
    // ========================================================

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {

          if (session?.user) {

            setAuthUser(session.user);

            supabase
              .from("profils")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle()
              .then(({ data }) =>
                setUser(
                  data || {
                    id: session.user.id,
                    nom: "",
                  }
                )
              );

          } else {

            setAuthUser(null);
            setUser(null);

            setHomeKey(
              (prev) => prev + 1
            );

          }

        }
      );

    return () =>
      listener.subscription.unsubscribe();

  }, []);

  // ============================================================
  // DÉCONNEXION
  // ============================================================

  const handleLogout = async () => {

    await supabase.auth.signOut();

    setAuthUser(null);
    setUser(null);

    setHomeKey(
      (prev) => prev + 1
    );

  };

  const currentUser =
    user || authUser;

  // ============================================================
  // CHARGEMENT
  // ============================================================

  if (loadingAuth) {

    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Chargement...
      </div>
    );

  }

  // ============================================================
  // RENDU
  // ============================================================

  return (

    <Router>

      <div className="min-h-screen bg-gray-100 pb-16 md:pb-0">

        <Navbar
          currentUser={currentUser}
          authUser={authUser}
          onLogout={handleLogout}
        />

        <div className="p-4">

          <AnimatedRoutes
            key={homeKey}
            authUser={authUser}
            user={user}
            setAuthUser={setAuthUser}
            setUser={setUser}
            onLogin={(newUser) => {

              setAuthUser(newUser);

              supabase
                .from("profils")
                .select("*")
                .eq("id", newUser.id)
                .maybeSingle()
                .then(({ data }) =>
                  setUser(
                    data || {
                      id: newUser.id,
                      nom: "",
                    }
                  )
                );

            }}
          />

        </div>

        <GDPRBanner />

        <FooterBGG />

      </div>

    </Router>

  );
}