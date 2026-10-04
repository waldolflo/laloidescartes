import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import {
  enablePushForDevice,
  disablePushForDevice,
} from "./push";

import RecapJeuxShareableStyle from "./RecapJeuxShareableStyle";

import {
  User,
  Bell,
  Gamepad2,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Send,
  Smartphone,
  Info,
  Check,
  Trophy,
  Settings,
} from "lucide-react";

export default function Profils({
  authUser,
  user,
  setProfilGlobal,
  setAuthUser,
  setUser,
}) {
  const [profil, setProfil] = useState(null);
  const [nom, setNom] = useState("");
  const [jeux, setJeux] = useState([]);

  const SUPABASE_URL =
    "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/delete-user";

  const [notifSettings, setNotifSettings] = useState({
    notif_parties: false,
    notif_chat: false,
    notif_annonces: false,
    notif_jeux: false,
    notif_ping: false,
  });

  const [pushDevicesCount, setPushDevicesCount] = useState(0);
  const [testingNotif, setTestingNotif] = useState(false);

  const isIOS = () => {
    if (typeof window === "undefined") return false;

    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" &&
        navigator.maxTouchPoints > 1)
    );
  };

  const isPWA = () => {
    if (typeof window === "undefined") return false;

    if (window.navigator.standalone) return true;

    return window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
  };

  const isIOSPWA = () => isIOS() && isPWA();

  const notifPermission =
    typeof window !== "undefined" &&
    "Notification" in window &&
    typeof Notification.permission === "string"
      ? Notification.permission
      : "unsupported";

  useEffect(() => {
    if (!authUser) return;

    const fetchProfil = async () => {
      const { data, error } = await supabase
        .from("profils")
        .select(
          "id, nom, role, jeufavoris1, jeufavoris2"
        )
        .eq("id", authUser.id)
        .single();

      if (error || !data) return;

      let updatedData = data;

      if (!data.nom) {
        const adjectives = [
          "Rapide",
          "Mystique",
          "Épique",
          "Fougueux",
          "Sombre",
          "Lumineux",
          "Vaillant",
          "Astucieux",
        ];

        const creatures = [
          "Dragon",
          "Licorne",
          "Phoenix",
          "Ninja",
          "Pirate",
          "Viking",
          "Samouraï",
          "Gobelin",
        ];

        const randomAdj =
          adjectives[
            Math.floor(Math.random() * adjectives.length)
          ];

        const randomCreature =
          creatures[
            Math.floor(Math.random() * creatures.length)
          ];

        const randomNum = Math.floor(
          100 + Math.random() * 900
        );

        const defaultName =
          `${randomAdj}${randomCreature}${randomNum}`;

        const {
          data: newData,
          error: updateError,
        } = await supabase
          .from("profils")
          .update({ nom: defaultName })
          .eq("id", authUser.id)
          .select()
          .single();

        if (!updateError) {
          updatedData = newData;
        }
      }

      setProfil(updatedData);
      setNom(updatedData.nom || "");
      setProfilGlobal?.(updatedData);
    };

    const fetchJeux = async () => {
      const { data } = await supabase
        .from("jeux")
        .select("id, nom, couverture_url")
        .order("nom", { ascending: true });

      if (data) {
        setJeux(data);
      }
    };

    fetchProfil();
    fetchJeux();
    fetchPushDevicesCount();
    fetchNotifSettings();
  }, [authUser, setProfilGlobal]);

  const fetchPushDevicesCount = async () => {
    if (!authUser) return;

    const { count, error } = await supabase
      .from("push_tokens")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", authUser.id);

    if (!error) {
      setPushDevicesCount(count || 0);
    }
  };

  const fetchNotifSettings = async () => {
    if (!authUser) return;

    try {
      const registration =
        await navigator.serviceWorker.ready;

      const subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        setNotifSettings({
          notif_parties: false,
          notif_chat: false,
          notif_annonces: false,
          notif_jeux: false,
          notif_ping: false,
        });
        return;
      }

      const token = JSON.stringify(subscription);

      const { data, error } = await supabase
        .from("push_tokens")
        .select(
          "notif_parties, notif_chat, notif_annonces, notif_jeux, notif_ping"
        )
        .eq("token", token)
        .maybeSingle();

      if (error || !data) {
        setNotifSettings({
          notif_parties: false,
          notif_chat: false,
          notif_annonces: false,
          notif_jeux: false,
          notif_ping: false,
        });
        return;
      }

      setNotifSettings({
        notif_parties: !!data.notif_parties,
        notif_chat: !!data.notif_chat,
        notif_annonces: !!data.notif_annonces,
        notif_jeux: !!data.notif_jeux,
        notif_ping: !!data.notif_ping,
      });
    } catch (error) {
      console.error(
        "Erreur récupération notifications :",
        error
      );
    }
  };

  const toggleNotif = async (key, value) => {
    if (!authUser) return;

    if (value) {
      await enablePushForDevice(
        authUser.id,
        key
      );
    } else {
      await disablePushForDevice(key);
    }

    await fetchNotifSettings();
    await fetchPushDevicesCount();
  };

  const testNotification = async () => {
    try {
      setTestingNotif(true);

      const registration =
        await navigator.serviceWorker.ready;

      const subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        alert(
          "❌ Les notifications ne sont pas activées sur cet appareil"
        );
        return;
      }

      const token = JSON.stringify(subscription);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      await fetch(
        "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/notify-game",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tokens: [token],
            title: "🔔 Test notification",
            body: "Notification envoyée sur CET appareil uniquement",
            url: "/",
          }),
        }
      );

      alert(
        "✅ Notification envoyée sur ce device !"
      );
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors du test");
    } finally {
      setTestingNotif(false);
    }
  };

  const updateNom = async () => {
    if (!nom || !profil) return;

    const { data, error } = await supabase
      .from("profils")
      .update({ nom })
      .eq("id", profil.id)
      .select()
      .single();

    if (!error) {
      setProfil(data);
      setProfilGlobal?.(data);
      alert("✅ Prénom mis à jour !");
    }
  };

  const updateFavoris = async (
    champ,
    valeur
  ) => {
    if (!profil) return;

    const ancienFavori = profil[champ];
    const nouveauFavori = valeur || null;

    const { data, error } = await supabase
      .from("profils")
      .update({
        [champ]: nouveauFavori,
      })
      .eq("id", profil.id)
      .select()
      .single();

    if (error) {
      console.error(
        "Erreur update profil :",
        error
      );
      return;
    }

    if (
      ancienFavori &&
      ancienFavori !== nouveauFavori
    ) {
      const { data: oldJeu } = await supabase
        .from("jeux")
        .select("fav")
        .eq("id", ancienFavori)
        .single();

      if (oldJeu) {
        await supabase
          .from("jeux")
          .update({
            fav: Math.max(
              (oldJeu.fav || 0) - 1,
              0
            ),
          })
          .eq("id", ancienFavori);
      }
    }

    if (
      nouveauFavori &&
      ancienFavori !== nouveauFavori
    ) {
      const { data: newJeu } = await supabase
        .from("jeux")
        .select("fav")
        .eq("id", nouveauFavori)
        .single();

      if (newJeu) {
        await supabase
          .from("jeux")
          .update({
            fav: (newJeu.fav || 0) + 1,
          })
          .eq("id", nouveauFavori);
      }
    }

    setProfil(data);
    setProfilGlobal?.(data);
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "⚠️ Voulez-vous vraiment supprimer votre compte ?"
      )
    ) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert(
          "❌ Impossible de récupérer la session utilisateur"
        );
        return;
      }

      const res = await fetch(
        SUPABASE_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: authUser.id,
          }),
        }
      );

      if (!res.ok) {
        console.error(
          "Erreur suppression :",
          await res.text()
        );

        alert(
          "❌ Une erreur est survenue lors de la suppression du compte"
        );

        return;
      }

      await supabase.auth.signOut({
        scope: "local",
      });

      setAuthUser(null);
      setUser(null);

      alert("✅ Compte supprimé !");

      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert(
        "❌ Impossible de supprimer le compte"
      );
    }
  };

  if (!authUser) {
    return <Navigate to="/auth" replace />;
  }

  if (!profil) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 px-8 py-6 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-600" />
          <p className="font-semibold text-slate-700">
            Chargement du profil...
          </p>
        </div>
      </div>
    );
  }

  const couleursCatalogue = [
    "from-violet-950 via-purple-900 to-indigo-950",
    "from-indigo-950 via-blue-900 to-violet-950",
    "from-purple-950 via-fuchsia-900 to-indigo-950",
    "from-slate-950 via-violet-900 to-purple-950",
    "from-indigo-950 via-purple-900 to-fuchsia-950",
    "from-violet-950 via-indigo-900 to-blue-950",
    "from-purple-950 via-indigo-900 to-slate-950",
    "from-fuchsia-950 via-purple-900 to-indigo-950",
    "from-blue-950 via-indigo-900 to-purple-950",
    "from-indigo-950 via-violet-900 to-fuchsia-950",
  ];

  const couleurProfil =
    couleursCatalogue[
      (new Date().getDate() - 1) %
        couleursCatalogue.length
    ];

  const notificationItems = [
    {
      key: "notif_parties",
      label: "Nouvelles parties",
      description:
        "Être prévenu lorsqu'une nouvelle partie est créée",
      icon: "🎲",
    },
    {
      key: "notif_jeux",
      label: "Nouveaux jeux",
      description:
        "Nouveaux jeux ajoutés à la ludothèque",
      icon: "🆕",
    },
    {
      key: "notif_annonces",
      label: "Annonces importantes",
      description:
        "Annonces importantes du président",
      icon: "📢",
    },
    {
      key: "notif_ping",
      label: "Ping",
      description:
        "Lorsqu'un message du tchat vous mentionne",
      icon: "🔔",
    },
    {
      key: "notif_chat",
      label: "Tous les messages du tchat",
      description:
        "Recevoir tous les nouveaux messages",
      icon: "💬",
    },
  ];

  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* HERO */}
        <section
          className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${couleurProfil} shadow-2xl`}
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative p-6 md:p-8 lg:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

              <div className="flex items-center gap-5">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white/15 border border-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
                  <User className="w-9 h-9 md:w-11 md:h-11 text-white" />
                </div>

                <div>
                  <p className="text-white/70 text-sm font-semibold uppercase tracking-[0.2em]">
                    Espace personnel
                  </p>

                  <h1 className="text-3xl md:text-4xl font-black text-white mt-1">
                    Mon profil
                  </h1>

                  <p className="text-white/75 mt-1">
                    Gère ton profil, tes notifications et tes préférences
                  </p>
                </div>
              </div>

              <span className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/20 text-white font-semibold backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4" />
                {profil.role}
              </span>
            </div>
          </div>
        </section>

        {/* MENU ADMIN */}
        {profil.role === "admin" && (
          <section className="bg-white rounded-[2rem] border border-violet-200 shadow-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-violet-600" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Administration
                    </h2>

                    <p className="text-sm text-slate-500">
                      Accède aux différentes sections de gestion
                    </p>
                  </div>
                </div>
              </div>

              <Link
                to="/admin/utilisateurs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
              >
                <ShieldCheck className="w-5 h-5" />
                Ouvrir l'administration
              </Link>
            </div>
          </section>
        )}

        {/* PROFIL */}
        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Informations personnelles
                </h2>

                <p className="text-sm text-slate-500">
                  Personnalise les informations affichées sur l'application
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Prénom / pseudo
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={nom}
                onChange={(e) =>
                  setNom(e.target.value)
                }
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition"
                placeholder="Entrez votre prénom"
              />

              <button
                onClick={updateNom}
                type="button"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold shadow-lg hover:shadow-xl transition"
              >
                <Check className="w-4 h-4" />
                Valider
              </button>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 text-violet-700 text-sm font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Rôle : {profil.role}
            </div>
          </div>
        </section>

        {/* NOTIFICATIONS */}
        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg">
                <Bell className="w-5 h-5 text-white" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Notifications
                </h2>

                <p className="text-sm text-slate-500">
                  Choisis les notifications que tu souhaites recevoir
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {isIOS() && !isPWA() ? (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    🍎
                  </div>

                  <div>
                    <p className="font-bold">
                      Notifications sur iPhone
                    </p>

                    <p className="text-sm mt-1">
                      Les notifications fonctionnent uniquement si l’application est ajoutée à l’écran d’accueil.
                    </p>

                    <ul className="list-disc ml-5 mt-3 text-sm space-y-1">
                      <li>Ouvrez Safari</li>
                      <li>Ajoutez l'app à l'écran d'accueil</li>
                      <li>Ouvrez l'app installée</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {notificationItems.map(
                    ({
                      key,
                      label,
                      description,
                      icon,
                    }) => (
                      <label
                        key={key}
                        className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition ${
                          notifSettings[key]
                            ? "bg-violet-50 border-violet-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl">
                            {icon}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {label}
                            </p>

                            <p className="text-sm text-slate-500">
                              {description}
                            </p>
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={
                            !!notifSettings[key]
                          }
                          disabled={
                            key === "notif_ping" &&
                            notifSettings.notif_chat
                          }
                          onChange={(e) => {
                            const checked =
                              e.target.checked;

                            if (
                              key === "notif_chat" &&
                              checked
                            ) {
                              toggleNotif(
                                "notif_chat",
                                true
                              );

                              toggleNotif(
                                "notif_ping",
                                false
                              );
                            } else {
                              toggleNotif(
                                key,
                                checked
                              );
                            }
                          }}
                          className="w-5 h-5 accent-violet-600"
                        />
                      </label>
                    )
                  )}
                </div>

                <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-slate-500" />

                    <p className="text-sm text-slate-600">
                      <strong>
                        {pushDevicesCount} device
                        {pushDevicesCount > 1
                          ? "s"
                          : ""}{" "}
                        actif
                        {pushDevicesCount > 1
                          ? "s"
                          : ""}
                      </strong>
                      .
                      <br />
                      Chaque appareil peut avoir ses propres préférences.
                    </p>
                  </div>
                </div>

                <button
                  onClick={testNotification}
                  disabled={
                    testingNotif ||
                    !Object.values(
                      notifSettings
                    ).some(Boolean)
                  }
                  type="button"
                  className={`mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold shadow-lg transition ${
                    testingNotif ||
                    !Object.values(
                      notifSettings
                    ).some(Boolean)
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600"
                  }`}
                >
                  <Send className="w-4 h-4" />
                  {testingNotif
                    ? "Envoi en cours..."
                    : "Tester la notification"}
                </button>
              </>
            )}
          </div>
        </section>

        {/* MESSAGE USER */}
        {profil.role === "user" && (
          <div className="rounded-[2rem] bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <Info className="w-5 h-5 text-violet-600" />

              <p className="text-slate-700 leading-relaxed">
                <strong>
                  N'hésitez pas à vous manifester dans le tchat de l'accueil ou sur messenger si vous souhaitez obtenir des droits supplémentaire sur l'application comme ceux d'organiser des parties ou d'ajouter des jeux à la ludothèque
                </strong>
              </p>
            </div>
          </div>
        )}

        {/* RECAP */}
        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-violet-50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-violet-600 flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Le récap' partageable de mes parties
                </h2>

                <p className="text-sm text-slate-500">
                  Consulte et partage ton historique de parties
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <RecapJeuxShareableStyle
              userId={profil.id}
            />
          </div>
        </section>

        {/* FAVORIS */}
        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-violet-50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Les jeux auxquels j'aimerais jouer
                </h2>

                <p className="text-sm text-slate-500">
                  Sélectionne tes deux jeux favoris
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((n) => {
              const selectedId =
                profil[`jeufavoris${n}`];

              const jeu = jeux.find(
                (j) => j.id === selectedId
              );

              return (
                <div
                  key={n}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Jeu favori {n}
                  </label>

                  <select
                    value={selectedId || ""}
                    onChange={(e) =>
                      updateFavoris(
                        `jeufavoris${n}`,
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">
                      -- Choisir un jeu --
                    </option>

                    {jeux.map((j) => (
                      <option
                        key={j.id}
                        value={j.id}
                      >
                        {j.nom}
                      </option>
                    ))}
                  </select>

                  {jeu && (
                    <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                      <p className="font-bold text-slate-800">
                        {jeu.nom}
                      </p>

                      {jeu.couverture_url && (
                        <img
                          src={jeu.couverture_url}
                          alt={jeu.nom}
                          className="w-full h-40 object-contain mt-3 rounded-xl"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* SUPPRESSION */}
        <section className="rounded-[2rem] border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>

              <div>
                <h2 className="font-bold text-lg text-red-900">
                  Supprimer mon compte
                </h2>

                <p className="text-sm text-red-700 mt-1">
                  Cette action est définitive.
                </p>
              </div>
            </div>

            <button
              onClick={handleDeleteAccount}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold shadow-lg"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer mon compte
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}