import React, { useEffect, useState, useRef } from "react";
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
  Users,
  CalendarDays,
  Images,
  Settings,
  Megaphone,
  Trash2,
  Link2,
  Unlink2,
  RefreshCw,
  Send,
  Save,
  Pencil,
  Power,
  Eye,
  Smartphone,
  X,
  Info,
  Check,
  Trophy,
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
  const [allUsers, setAllUsers] = useState([]);
  const [allJoueurs, setAllJoueurs] = useState([]);
  const [datesEvenements, setDatesEvenements] = useState([]);

  const formulaireDateRef = useRef(null);

  const SUPABASE_URL =
    "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/delete-user";

  const [globalImageUrl, setGlobalImageUrl] = useState("");
  const [globalTexte, setGlobalTexte] = useState("");
  const [globalAnnonce, setGlobalAnnonce] = useState("");
  const [globalcountFollowersFB, setGlobalcountFollowersFB] =
    useState("");
  const [globalcountAdherentTotal, setGlobalcountAdherentTotal] =
    useState("");
  const [globalcountSeanceavantdouzeS, setGlobalcountSeanceavantdouzeS] =
    useState("");
  const [zoomOpen, setZoomOpen] = useState(false);

  const [notifSettings, setNotifSettings] = useState({
    notif_parties: false,
    notif_chat: false,
    notif_annonces: false,
    notif_jeux: false,
    notif_ping: false,
  });

  const [pushDevicesCount, setPushDevicesCount] = useState(0);
  const [testingNotif, setTestingNotif] = useState(false);

  const [rechercheUtilisateur, setRechercheUtilisateur] = useState("");
  const [ongletGestionUsers, setOngletGestionUsers] = useState("utilisateurs");

  // =========================================================
  // 📅 GESTION DES DATES D'ÉVÉNEMENTS
  // =========================================================

  const [dateEvenement, setDateEvenement] = useState("");
  const [typeEvenement, setTypeEvenement] = useState("soiree");
  const [heureDebut, setHeureDebut] = useState("20:00");
  const [heureFin, setHeureFin] = useState("23:00");
  const [dateEvenementEnEdition, setDateEvenementEnEdition] =
    useState(null);
  const [chargementDates, setChargementDates] = useState(false);
  const [texteEvenement, setTexteEvenement] = useState("");

  const [emojiEvenement, setEmojiEvenement] = useState("🎲");
  const [nomTypePersonnalise, setNomTypePersonnalise] = useState("");

  // =========================================================
  // 🎨 TYPES D'ÉVÉNEMENTS
  // =========================================================

  const getDefaultsFromDate = (date) => {
    if (!date) {
      return {
        type_evenement: "soiree",
        heure_debut: "20:00",
        heure_fin: "23:00",
      };
    }

    const jour = new Date(`${date}T12:00:00`).getDay();

    if (jour === 0 || jour === 6) {
      return {
        type_evenement: "apres_midi",
        heure_debut: "14:00",
        heure_fin: "17:00",
      };
    }

    return {
      type_evenement: "soiree",
      heure_debut: "20:00",
      heure_fin: "23:00",
    };
  };

  const creerTypePersonnalise = (emoji, nom) => {
    return `custom|${emoji}|${nom}`;
  };

  const estTypePersonnalise = (type) => {
    return typeof type === "string" && type.startsWith("custom|");
  };

  const getEmojiTypePersonnalise = (type) => {
    if (!estTypePersonnalise(type)) return "";
    const morceaux = type.split("|");
    return morceaux[1] || "";
  };

  const getNomTypePersonnalise = (type) => {
    if (!estTypePersonnalise(type)) return "";
    const morceaux = type.split("|");
    return morceaux.slice(2).join("|") || "";
  };

  const getTypesPersonnalises = () => {
    const types = datesEvenements
      .filter((date) => estTypePersonnalise(date.type_evenement))
      .map((date) => date.type_evenement);

    return [...new Set(types)];
  };

  const handleDateEvenementChange = (nouvelleDate) => {
    setDateEvenement(nouvelleDate);

    if (!dateEvenementEnEdition) {
      const defaults = getDefaultsFromDate(nouvelleDate);

      setTypeEvenement(defaults.type_evenement);
      setHeureDebut(defaults.heure_debut);
      setHeureFin(defaults.heure_fin);
    }
  };

  const resetFormDateEvenement = () => {
    setDateEvenement("");
    setTypeEvenement("soiree");
    setHeureDebut("20:00");
    setHeureFin("23:00");
    setTexteEvenement("");
    setEmojiEvenement("🎲");
    setNomTypePersonnalise("");
    setDateEvenementEnEdition(null);
  };

  const fetchDatesEvenements = async () => {
    if (!authUser) return;

    setChargementDates(true);

    const { data, error } = await supabase
      .from("dates_evenements")
      .select(
        "id, date_evenement, type_evenement, heure_debut, heure_fin, texte, actif, created_at"
      )
      .order("date_evenement", { ascending: true })
      .order("heure_debut", { ascending: true });

    if (error) {
      console.error("Erreur récupération dates événements :", error);
      setDatesEvenements([]);
    } else {
      setDatesEvenements(data || []);
    }

    setChargementDates(false);
  };

  const ajouterOuModifierDateEvenement = async () => {
    if (!dateEvenement) {
      alert("❌ Veuillez choisir une date.");
      return;
    }

    if (!heureDebut || !heureFin) {
      alert("❌ Veuillez renseigner l'heure de début et l'heure de fin.");
      return;
    }

    if (heureFin <= heureDebut) {
      alert("❌ L'heure de fin doit être après l'heure de début.");
      return;
    }

    let typeFinal = typeEvenement;

    if (typeEvenement === "personnalise") {
      if (!emojiEvenement.trim()) {
        alert("❌ Veuillez choisir un emoji.");
        return;
      }

      if (!nomTypePersonnalise.trim()) {
        alert("❌ Veuillez renseigner le nom du type d'événement.");
        return;
      }

      typeFinal = creerTypePersonnalise(
        emojiEvenement.trim(),
        nomTypePersonnalise.trim()
      );
    }

    const donnees = {
      date_evenement: dateEvenement,
      type_evenement: typeFinal,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      texte: texteEvenement || null,
      actif: true,
    };

    if (dateEvenementEnEdition) {
      const { data, error } = await supabase
        .from("dates_evenements")
        .update({
          date_evenement: dateEvenement,
          type_evenement: typeFinal,
          heure_debut: heureDebut,
          heure_fin: heureFin,
          texte: texteEvenement || null,
        })
        .eq("id", dateEvenementEnEdition)
        .select()
        .single();

      if (error) {
        console.error("Erreur modification date événement :", error);
        alert(`❌ Impossible de modifier la date : ${error.message}`);
        return;
      }

      setDatesEvenements((prev) =>
        prev
          .map((date) =>
            date.id === dateEvenementEnEdition ? data : date
          )
          .sort((a, b) => {
            const dateA = `${a.date_evenement} ${a.heure_debut || ""}`;
            const dateB = `${b.date_evenement} ${b.heure_debut || ""}`;
            return dateA.localeCompare(dateB);
          })
      );

      alert("✅ Date de l'événement modifiée !");
      resetFormDateEvenement();
      return;
    }

    const { data, error } = await supabase
      .from("dates_evenements")
      .insert(donnees)
      .select()
      .single();

    if (error) {
      console.error("Erreur ajout date événement :", error);
      alert(`❌ Impossible d'ajouter la date : ${error.message}`);
      return;
    }

    setDatesEvenements((prev) =>
      [...prev, data].sort((a, b) => {
        const dateA = `${a.date_evenement} ${a.heure_debut || ""}`;
        const dateB = `${b.date_evenement} ${b.heure_debut || ""}`;
        return dateA.localeCompare(dateB);
      })
    );

    alert("✅ Date de l'événement ajoutée !");
    resetFormDateEvenement();
  };

  const modifierDateEvenement = (date) => {
    setDateEvenement(date.date_evenement);
    setTypeEvenement(date.type_evenement);

    if (estTypePersonnalise(date.type_evenement)) {
      setEmojiEvenement(getEmojiTypePersonnalise(date.type_evenement));
      setNomTypePersonnalise(getNomTypePersonnalise(date.type_evenement));
    } else {
      setEmojiEvenement("🎲");
      setNomTypePersonnalise("");
    }

    setHeureDebut(
      date.heure_debut ? date.heure_debut.slice(0, 5) : ""
    );

    setHeureFin(
      date.heure_fin ? date.heure_fin.slice(0, 5) : ""
    );

    setTexteEvenement(date.texte || "");
    setDateEvenementEnEdition(date.id);

    setTimeout(() => {
      formulaireDateRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  const toggleDateEvenement = async (date) => {
    const nouvelEtat = !date.actif;

    const { data, error } = await supabase
      .from("dates_evenements")
      .update({ actif: nouvelEtat })
      .eq("id", date.id)
      .select()
      .single();

    if (error) {
      console.error("Erreur activation/désactivation date :", error);
      alert(`❌ Impossible de modifier l'état : ${error.message}`);
      return;
    }

    setDatesEvenements((prev) =>
      prev.map((d) => (d.id === date.id ? data : d))
    );
  };

  const supprimerDateEvenement = async (date) => {
    const dateAffichee = new Date(
      `${date.date_evenement}T12:00:00`
    ).toLocaleDateString("fr-FR");

    if (
      !window.confirm(
        `Supprimer définitivement l'événement du ${dateAffichee} ?`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("dates_evenements")
      .delete()
      .eq("id", date.id);

    if (error) {
      console.error("Erreur suppression date événement :", error);
      alert(`❌ Impossible de supprimer la date : ${error.message}`);
      return;
    }

    setDatesEvenements((prev) =>
      prev.filter((d) => d.id !== date.id)
    );

    if (dateEvenementEnEdition === date.id) {
      resetFormDateEvenement();
    }

    alert("✅ Événement supprimé.");
  };

  const formatDateEvenement = (date) => {
    if (!date) return "";

    return new Date(`${date}T12:00:00`).toLocaleDateString(
      "fr-FR",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

  const formatHeureEvenement = (heure) => {
    if (!heure) return "";
    return heure.slice(0, 5);
  };

  // =========================================================
  // 🔔 NOTIFICATIONS
  // =========================================================

  const fetchPushDevicesCount = async () => {
    if (!authUser) return;

    const { count, error } = await supabase
      .from("push_tokens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", authUser.id);

    if (!error) {
      setPushDevicesCount(count || 0);
    }
  };

  const isIOS = () => {
    if (typeof window === "undefined") return false;

    const iOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" &&
        navigator.maxTouchPoints > 1);

    return iOSDevice;
  };

  const isPWA = () => {
    if (typeof window === "undefined") return false;

    if (window.navigator.standalone) return true;

    if (
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      return true;
    }

    return false;
  };

  const toggleNotif = async (key, value) => {
    if (!authUser) return;

    if (value === true) {
      await enablePushForDevice(authUser.id, key);
    } else {
      await disablePushForDevice(key);
    }

    fetchNotifSettings();
    fetchPushDevicesCount();
  };

  const fetchNotifSettings = async () => {
    if (!authUser) return;

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
  };

  const isIOSPWA = () => isIOS() && isPWA();

  const notifPermission =
    typeof window !== "undefined" &&
    "Notification" in window &&
    typeof Notification.permission === "string"
      ? Notification.permission
      : "unsupported";

  // =========================================================
  // 🔄 CHARGEMENT DES DONNÉES
  // =========================================================

  useEffect(() => {
    if (!authUser) return;

    const fetchProfil = async () => {
      const { data, error } = await supabase
        .from("profils")
        .select("id, nom, role, jeufavoris1, jeufavoris2")
        .eq("id", authUser.id)
        .single();

      if (!error && data) {
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

          const randomNum =
            Math.floor(100 + Math.random() * 900);

          const defaultName =
            `${randomAdj}${randomCreature}${randomNum}`;

          const { data: newData, error: updateError } =
            await supabase
              .from("profils")
              .update({ nom: defaultName })
              .eq("id", authUser.id)
              .select()
              .single();

          if (!updateError) updatedData = newData;
        }

        setProfil(updatedData);
        setNom(updatedData.nom);
        setProfilGlobal?.(updatedData);

        if (updatedData.role === "admin") {
          const { data: usersData, error: usersError } =
            await supabase
              .from("profils")
              .select("id, nom, role")
              .order("nom", { ascending: true });

          if (!usersError && usersData) {
            setAllUsers(usersData);
          }

          const { data: joueursData, error: joueursError } =
            await supabase
              .from("joueurs")
              .select("id, nom, actif, utilisateur_id")
              .order("nom", { ascending: true });

          if (!joueursError && joueursData) {
            setAllJoueurs(joueursData);
          }

          await fetchDatesEvenements();
        }
      }
    };

    const fetchJeux = async () => {
      const { data: jeuxData } = await supabase
        .from("jeux")
        .select("id, nom, couverture_url")
        .order("nom", { ascending: true });

      if (jeuxData) setJeux(jeuxData);
    };

    const fetchGlobalImage = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 1)
        .single();

      if (!error && data) {
        setGlobalImageUrl(data.global_image_url || "");
      }
    };

    const fetchGlobalTexte = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 2)
        .single();

      if (!error && data) {
        setGlobalTexte(data.global_image_url || "");
      }
    };

    const fetchGlobalAnnonce = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 6)
        .single();

      if (!error && data) {
        setGlobalAnnonce(data.global_image_url || "");
      }
    };

    const fetchGlobalcountFollowersFB = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 3)
        .single();

      if (!error && data) {
        setGlobalcountFollowersFB(
          data.global_image_url || ""
        );
      }
    };

    const fetchGlobalcountAdherentTotal = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 4)
        .single();

      if (!error && data) {
        setGlobalcountAdherentTotal(
          data.global_image_url || ""
        );
      }
    };

    const fetchGlobalcountSeanceavantdouzeS = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 5)
        .single();

      if (!error && data) {
        setGlobalcountSeanceavantdouzeS(
          data.global_image_url || ""
        );
      }
    };

    fetchProfil();
    fetchJeux();
    fetchGlobalImage();
    fetchGlobalTexte();
    fetchGlobalAnnonce();
    fetchGlobalcountFollowersFB();
    fetchGlobalcountAdherentTotal();
    fetchGlobalcountSeanceavantdouzeS();
    fetchPushDevicesCount();
    fetchNotifSettings();
  }, [authUser, setProfilGlobal]);

  // =========================================================
  // 🔔 TEST NOTIFICATION
  // =========================================================

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
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tokens: [token],
            title: "🔔 Test notification",
            body: "Notification envoyée sur CET appareil uniquement",
            url: "/",
          }),
        }
      );

      alert("✅ Notification envoyée sur ce device !");
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

  const updateFavoris = async (champ, valeur) => {
    if (!profil) return;

    const ancienFavori = profil[champ];
    const nouveauFavori = valeur || null;

    const { data, error } = await supabase
      .from("profils")
      .update({ [champ]: nouveauFavori })
      .eq("id", profil.id)
      .select()
      .single();

    if (error) {
      console.error("Erreur update profil :", error);
      return;
    }

    if (ancienFavori && ancienFavori !== nouveauFavori) {
      const { data: oldJeu } = await supabase
        .from("jeux")
        .select("fav")
        .eq("id", ancienFavori)
        .single();

      if (oldJeu) {
        await supabase
          .from("jeux")
          .update({
            fav: Math.max((oldJeu.fav || 0) - 1, 0),
          })
          .eq("id", ancienFavori);
      }
    }

    if (nouveauFavori && ancienFavori !== nouveauFavori) {
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

  const updateUserRole = async (userId, newRole) => {
    const { data, error } = await supabase
      .from("profils")
      .update({ role: newRole })
      .eq("id", userId)
      .select()
      .single();

    if (!error) {
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? data : u))
      );
    }
  };

  const updateJoueurUtilisateur = async (
    joueurId,
    utilisateurId
  ) => {
    const nouveauUtilisateurId = utilisateurId || null;

    const joueur = allJoueurs.find(
      (j) => j.id === joueurId
    );

    if (!joueur) return;

    if (
      nouveauUtilisateurId &&
      allJoueurs.some(
        (j) =>
          j.id !== joueurId &&
          j.utilisateur_id === nouveauUtilisateurId
      )
    ) {
      alert(
        "❌ Ce vrai compte est déjà lié à un faux compte."
      );
      return;
    }

    const nomUtilisateur =
      allUsers.find(
        (u) => u.id === nouveauUtilisateurId
      )?.nom || "";

    const message = nouveauUtilisateurId
      ? `Lier le faux compte "${joueur.nom}" au compte "${nomUtilisateur}" ?\n\nSes anciennes parties et statistiques seront rattachées à ce compte.`
      : `Délier le faux compte "${joueur.nom}" de son compte utilisateur ?`;

    if (!window.confirm(message)) {
      return;
    }

    const { data, error } = await supabase
      .from("joueurs")
      .update({
        utilisateur_id: nouveauUtilisateurId,
      })
      .eq("id", joueurId)
      .select("id, nom, actif, utilisateur_id")
      .single();

    if (error) {
      console.error(
        "Erreur liaison faux compte :",
        error
      );
      alert(
        `❌ Impossible de modifier la liaison : ${error.message}`
      );
      return;
    }

    setAllJoueurs((prev) =>
      prev.map((j) =>
        j.id === joueurId ? data : j
      )
    );

    alert(
      nouveauUtilisateurId
        ? `✅ "${joueur.nom}" est maintenant lié à "${nomUtilisateur}".`
        : `✅ "${joueur.nom}" a été délié.`
    );
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "⚠️ Voulez-vous vraiment supprimer votre compte ?"
      )
    )
      return;

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

      const res = await fetch(SUPABASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: authUser.id,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Erreur suppression :", err);
        alert(
          "❌ Une erreur est survenue lors de la suppression du compte"
        );
        return;
      }

      await supabase.auth.signOut({ scope: "local" });
      setAuthUser(null);
      setUser(null);

      alert("✅ Compte supprimé !");
      window.location.href = "/";
    } catch (err) {
      console.error("Erreur inattendue :", err);
      alert("❌ Impossible de supprimer le compte");
    }
  };

  // =========================================================
  // 🔐 REDIRECTIONS
  // =========================================================

  if (!authUser) return <Navigate to="/auth" replace />;

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

  const jourDuMois = new Date().getDate();

  const couleurProfil =
    couleursCatalogue[
      (jourDuMois - 1) % couleursCatalogue.length
    ];

  const notificationItems = [
    {
      key: "notif_parties",
      label: "Nouvelles parties",
      description: "Être prévenu lorsqu'une nouvelle partie est créée",
      icon: "🎲",
    },
    {
      key: "notif_jeux",
      label: "Nouveaux jeux",
      description: "Nouveaux jeux ajoutés à la ludothèque",
      icon: "🆕",
    },
    {
      key: "notif_annonces",
      label: "Annonces importantes",
      description: "Annonces importantes du président",
      icon: "📢",
    },
    {
      key: "notif_ping",
      label: "Ping",
      description: "Lorsqu'un message du tchat vous mentionne",
      icon: "🔔",
    },
    {
      key: "notif_chat",
      label: "Tous les messages du tchat",
      description: "Recevoir tous les nouveaux messages",
      icon: "💬",
    },
  ];

  const utilisateursFiltres = allUsers.filter((u) =>
  (u.nom || "")
    .toLowerCase()
    .includes(rechercheUtilisateur.toLowerCase())
  );

  const joueursFiltres = allJoueurs.filter((joueur) =>
    (joueur.nom || "")
      .toLowerCase()
      .includes(rechercheUtilisateur.toLowerCase())
  );

  const nombreUtilisateursLies = allJoueurs.filter(
    (j) => j.utilisateur_id
  ).length;

  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ===================================================== */}
        {/* HERO */}
        {/* ===================================================== */}

        <section
          className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${couleurProfil} shadow-2xl`}
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-fuchsia-500/10 blur-3xl" />

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

              <div className="self-start md:self-auto">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/20 text-white font-semibold backdrop-blur-sm">
                  <ShieldCheck className="w-4 h-4" />
                  {profil.role}
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* PROFIL */}
        {/* ===================================================== */}

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
                onChange={(e) => setNom(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition"
                placeholder="Entrez votre prénom"
              />

              <button
                onClick={updateNom}
                type="button"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
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

        {/* ===================================================== */}
        {/* NOTIFICATIONS */}
        {/* ===================================================== */}

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

            {isIOS() ? (
              <>
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🍎</div>

                    <div>
                      <p className="font-bold">
                        Notifications sur iPhone
                      </p>

                      <p className="text-sm mt-1">
                        Les notifications fonctionnent uniquement si
                        l’application est ajoutée à l’écran d’accueil.
                      </p>

                      <ul className="list-disc ml-5 mt-3 text-sm space-y-1">
                        <li>Ouvrez Safari</li>
                        <li>Ajoutez l'app à l'écran d'accueil</li>
                        <li>Ouvrez l'app installée</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {notifPermission !== "granted" ? (
                  <div className="mt-5 p-5 rounded-2xl bg-blue-50 border border-blue-200">
                    <p className="font-semibold text-blue-900 mb-3">
                      🔔 Active les notifications sur cet appareil
                    </p>

                    <button
                      onClick={async () => {
                        try {
                          alert("CLICK OK");

                          if (!("Notification" in window)) {
                            alert("Notifications non supportées");
                            return;
                          }

                          const permission = await new Promise(
                            (resolve) => {
                              Notification.requestPermission(resolve);
                            }
                          );

                          alert("Permission = " + permission);

                          if (permission !== "granted") {
                            alert("Notifications refusées");
                            return;
                          }

                          alert("Avant enablePush");

                          await enablePushForDevice(
                            authUser.id,
                            "notif_parties"
                          );

                          alert("Après enablePush");

                          await disablePushForDevice(
                            "notif_parties"
                          );

                          fetchNotifSettings();
                          fetchPushDevicesCount();

                          alert("FIN OK");
                        } catch (err) {
                          console.error(err);
                          alert("ERREUR JS (voir console)");
                        }
                      }}
                      type="button"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
                    >
                      <Smartphone className="w-5 h-5" />
                      Activer les notifications
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                    <Check className="w-5 h-5" />
                    Notifications activées sur cet appareil
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-3">
                  {notificationItems.map(
                    ({ key, label, description, icon }) => (
                      <label
                        key={key}
                        className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition ${
                          notifSettings[key]
                            ? "bg-violet-50 border-violet-200"
                            : "bg-slate-50 border-slate-200 hover:bg-white"
                        } ${
                          (key === "notif_ping" &&
                            notifSettings.notif_chat)
                            ? "opacity-60"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-11 h-11 shrink-0 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl">
                            {icon}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {label}
                            </p>

                            <p className="text-sm text-slate-500 mt-0.5">
                              {description}
                            </p>
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={!!notifSettings[key]}
                          disabled={
                            (isIOS() &&
                              notifPermission !== "granted") ||
                            (key === "notif_ping" &&
                              notifSettings.notif_chat)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;

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
                              toggleNotif(key, checked);
                            }
                          }}
                          className="w-5 h-5 accent-violet-600 shrink-0"
                        />
                      </label>
                    )
                  )}
                </div>

                <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-slate-500 mt-0.5" />

                    <p className="text-sm text-slate-600">
                      <strong>
                        {pushDevicesCount} device
                        {pushDevicesCount > 1 ? "s" : ""} actif
                        {pushDevicesCount > 1 ? "s" : ""}
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
                    (!notifSettings.notif_parties &&
                      !notifSettings.notif_chat &&
                      !notifSettings.notif_annonces &&
                      !notifSettings.notif_jeux &&
                      !notifSettings.notif_ping)
                  }
                  type="button"
                  className={`mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold shadow-lg transition ${
                    testingNotif ||
                    (!notifSettings.notif_parties &&
                      !notifSettings.notif_chat &&
                      !notifSettings.notif_annonces &&
                      !notifSettings.notif_jeux &&
                      !notifSettings.notif_ping)
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl hover:-translate-y-0.5"
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

        {/* ===================================================== */}
        {/* MESSAGE USER */}
        {/* ===================================================== */}

        {profil.role === "user" && (
          <div className="rounded-[2rem] bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 shrink-0 rounded-2xl bg-white shadow flex items-center justify-center">
                <Info className="w-5 h-5 text-violet-600" />
              </div>

              <p className="text-slate-700 leading-relaxed">
                <strong>
                  N'hésitez pas à vous manifester dans le tchat de
                  l'accueil ou sur messenger si vous souhaitez obtenir
                  des droits supplémentaire sur l'application comme
                  ceux d'organiser des parties ou d'ajouter des jeux
                  à la ludothèque
                </strong>
              </p>
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* RECAP */}
        {/* ===================================================== */}

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
            <RecapJeuxShareableStyle userId={profil.id} />
          </div>
        </section>

        {/* ===================================================== */}
        {/* JEUX FAVORIS */}
        {/* ===================================================== */}

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
              const selectedId = profil[`jeufavoris${n}`];
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition"
                  >
                    <option value="">
                      -- Choisir un jeu --
                    </option>

                    {jeux.map((j) => (
                      <option key={j.id} value={j.id}>
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

        {/* ===================================================== */}
        {/* ADMIN */}
        {/* ===================================================== */}

        {profil.role === "admin" && (
          <>
            {/* ------------------------------------------------- */}
            {/* UTILISATEURS */}
            {/* ------------------------------------------------- */}

            <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">

              {/* EN-TÊTE */}
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-violet-50 to-indigo-50">

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                  <div className="flex items-center gap-3">

                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Gestion des utilisateurs
                      </h2>

                      <p className="text-sm text-slate-500">
                        Comptes réels, faux comptes et rôles
                      </p>
                    </div>

                  </div>

                  {/* COMPTEURS */}
                  <div className="flex flex-wrap gap-2">

                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-blue-200 text-blue-700 text-sm font-semibold shadow-sm">
                      <User className="w-4 h-4" />
                      {allUsers.length} utilisateur{allUsers.length > 1 ? "s" : ""}
                    </span>

                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-amber-200 text-amber-700 text-sm font-semibold shadow-sm">
                      🎭 {allJoueurs.length} faux compte{allJoueurs.length > 1 ? "s" : ""}
                    </span>

                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-sm font-semibold shadow-sm">
                      <Link2 className="w-4 h-4" />
                      {nombreUtilisateursLies} lié
                      {nombreUtilisateursLies > 1 ? "s" : ""}
                    </span>

                  </div>

                </div>

              </div>

              <div className="p-6">

                {/* ------------------------------------------------- */}
                {/* RECHERCHE */}
                {/* ------------------------------------------------- */}

                <div className="mb-5">

                  <div className="relative">

                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                    <input
                      type="text"
                      value={rechercheUtilisateur}
                      onChange={(e) =>
                        setRechercheUtilisateur(e.target.value)
                      }
                      placeholder="Rechercher un utilisateur ou un faux compte..."
                      className="
                        w-full
                        pl-12 pr-4 py-3.5
                        rounded-2xl
                        border border-slate-200
                        bg-slate-50
                        focus:bg-white
                        focus:border-violet-500
                        focus:ring-4
                        focus:ring-violet-500/10
                        outline-none
                        transition
                      "
                    />

                    {rechercheUtilisateur && (
                      <button
                        type="button"
                        onClick={() => setRechercheUtilisateur("")}
                        className="
                          absolute right-3 top-1/2 -translate-y-1/2
                          w-8 h-8
                          rounded-xl
                          bg-slate-200
                          text-slate-500
                          flex items-center justify-center
                          hover:bg-slate-300
                          transition
                        "
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                  </div>

                </div>

                {/* ------------------------------------------------- */}
                {/* ONGLETS */}
                {/* ------------------------------------------------- */}

                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6">

                  <button
                    type="button"
                    onClick={() =>
                      setOngletGestionUsers("utilisateurs")
                    }
                    className={`
                      flex items-center justify-center gap-2
                      px-4 py-3
                      rounded-xl
                      font-semibold
                      text-sm
                      transition
                      ${
                        ongletGestionUsers === "utilisateurs"
                          ? "bg-white text-violet-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }
                    `}
                  >
                    <User className="w-4 h-4" />

                    Utilisateurs

                    <span
                      className={`
                        px-2 py-0.5 rounded-full text-xs
                        ${
                          ongletGestionUsers === "utilisateurs"
                            ? "bg-violet-100 text-violet-700"
                            : "bg-slate-200 text-slate-600"
                        }
                      `}
                    >
                      {allUsers.length}
                    </span>

                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setOngletGestionUsers("joueurs")
                    }
                    className={`
                      flex items-center justify-center gap-2
                      px-4 py-3
                      rounded-xl
                      font-semibold
                      text-sm
                      transition
                      ${
                        ongletGestionUsers === "joueurs"
                          ? "bg-white text-amber-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }
                    `}
                  >
                    <span className="text-base">
                      🎭
                    </span>

                    Faux comptes

                    <span
                      className={`
                        px-2 py-0.5 rounded-full text-xs
                        ${
                          ongletGestionUsers === "joueurs"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-200 text-slate-600"
                        }
                      `}
                    >
                      {allJoueurs.length}
                    </span>

                  </button>

                </div>

                {/* ================================================= */}
                {/* ONGLET UTILISATEURS */}
                {/* ================================================= */}

                {ongletGestionUsers === "utilisateurs" && (

                  <div className="space-y-3">

                    {utilisateursFiltres.length === 0 ? (

                      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center">

                        <User className="w-10 h-10 mx-auto mb-3 text-slate-300" />

                        <p className="font-semibold text-slate-600">
                          Aucun utilisateur trouvé
                        </p>

                        {rechercheUtilisateur && (
                          <p className="text-sm text-slate-400 mt-1">
                            Aucun résultat pour « {rechercheUtilisateur} »
                          </p>
                        )}

                      </div>

                    ) : (

                      utilisateursFiltres.map((u) => {

                        const isCurrentAdmin =
                          u.id === profil.id;

                        const isAdminUser =
                          u.role === "admin";

                        const fauxCompteLie =
                          allJoueurs.find(
                            (j) => j.utilisateur_id === u.id
                          );

                        return (

                          <div
                            key={`user-${u.id}`}
                            className="
                              group
                              rounded-2xl
                              border border-slate-200
                              bg-white
                              hover:border-violet-200
                              hover:shadow-lg
                              transition
                              overflow-hidden
                            "
                          >

                            <div className="p-4 md:p-5">

                              <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                                {/* IDENTITÉ */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">

                                  <div className="
                                    w-12 h-12
                                    shrink-0
                                    rounded-2xl
                                    bg-gradient-to-br from-violet-100 to-indigo-100
                                    flex items-center justify-center
                                  ">
                                    <User className="w-5 h-5 text-violet-600" />
                                  </div>

                                  <div className="min-w-0">

                                    <div className="flex flex-wrap items-center gap-2">

                                      <p className="font-bold text-slate-900 truncate">
                                        {u.nom || "Sans nom"}
                                      </p>

                                      {isCurrentAdmin && (
                                        <span className="
                                          px-2 py-0.5
                                          rounded-full
                                          bg-violet-100
                                          text-violet-700
                                          text-xs
                                          font-bold
                                        ">
                                          Moi
                                        </span>
                                      )}

                                    </div>

                                    <p className="text-xs text-slate-400 mt-0.5 break-all">
                                      {u.id}
                                    </p>

                                  </div>

                                </div>

                                {/* RÔLE */}
                                <div className="lg:w-56">

                                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                    Rôle
                                  </label>

                                  {isCurrentAdmin || isAdminUser ? (

                                    <div className="
                                      inline-flex items-center gap-2
                                      px-3 py-2
                                      rounded-xl
                                      bg-violet-100
                                      text-violet-700
                                      font-semibold
                                      text-sm
                                    ">
                                      <ShieldCheck className="w-4 h-4" />
                                      {u.role}
                                    </div>

                                  ) : (

                                    <select
                                      value={u.role}
                                      onChange={(e) => {

                                        const newRole =
                                          e.target.value;

                                        if (
                                          window.confirm(
                                            `Changer le rôle de ${u.nom} en "${newRole}" ?`
                                          )
                                        ) {

                                          updateUserRole(
                                            u.id,
                                            newRole
                                          );

                                        }

                                      }}
                                      className="
                                        w-full
                                        px-3 py-2.5
                                        rounded-xl
                                        border border-slate-200
                                        bg-slate-50
                                        font-medium
                                        text-slate-700
                                        focus:bg-white
                                        focus:border-violet-500
                                        focus:ring-4
                                        focus:ring-violet-500/10
                                        outline-none
                                        transition
                                      "
                                    >

                                      <option value="user">
                                        user
                                      </option>

                                      <option value="membre">
                                        membre
                                      </option>

                                      <option value="ludo">
                                        ludo
                                      </option>

                                      <option value="ludoplus">
                                        ludoplus
                                      </option>

                                      <option value="admin">
                                        admin
                                      </option>

                                    </select>

                                  )}

                                </div>

                                {/* LIAISON */}
                                <div className="lg:w-64">

                                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                    Faux compte lié
                                  </label>

                                  {fauxCompteLie ? (

                                    <div className="
                                      flex items-center gap-2
                                      px-3 py-2.5
                                      rounded-xl
                                      bg-emerald-50
                                      border border-emerald-200
                                      text-emerald-700
                                      font-semibold
                                      text-sm
                                    ">
                                      <Link2 className="w-4 h-4 shrink-0" />
                                      <span className="truncate">
                                        {fauxCompteLie.nom}
                                      </span>
                                    </div>

                                  ) : (

                                    <div className="
                                      flex items-center gap-2
                                      px-3 py-2.5
                                      rounded-xl
                                      bg-slate-50
                                      border border-slate-200
                                      text-slate-400
                                      text-sm
                                    ">
                                      <Unlink2 className="w-4 h-4" />
                                      Aucun faux compte lié
                                    </div>

                                  )}

                                </div>

                              </div>

                            </div>

                          </div>

                        );

                      })

                    )}

                  </div>

                )}

                {/* ================================================= */}
                {/* ONGLET FAUX COMPTES */}
                {/* ================================================= */}

                {ongletGestionUsers === "joueurs" && (

                  <div className="space-y-3">

                    {joueursFiltres.length === 0 ? (

                      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-8 text-center">

                        <div className="text-4xl mb-3">
                          🎭
                        </div>

                        <p className="font-semibold text-amber-800">
                          Aucun faux compte trouvé
                        </p>

                        {rechercheUtilisateur && (
                          <p className="text-sm text-amber-600 mt-1">
                            Aucun résultat pour « {rechercheUtilisateur} »
                          </p>
                        )}

                      </div>

                    ) : (

                      joueursFiltres.map((joueur) => {

                        const compteLie =
                          allUsers.find(
                            (u) =>
                              u.id === joueur.utilisateur_id
                          );

                        return (

                          <div
                            key={`joueur-${joueur.id}`}
                            className="
                              rounded-2xl
                              border border-amber-200
                              bg-gradient-to-r from-amber-50 to-orange-50
                              overflow-hidden
                              hover:shadow-lg
                              transition
                            "
                          >

                            <div className="p-4 md:p-5">

                              <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                                {/* IDENTITÉ */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">

                                  <div className="
                                    w-12 h-12
                                    shrink-0
                                    rounded-2xl
                                    bg-amber-100
                                    flex items-center justify-center
                                    text-xl
                                  ">
                                    🎭
                                  </div>

                                  <div className="min-w-0">

                                    <div className="flex flex-wrap items-center gap-2">

                                      <p className="font-bold text-amber-900 truncate">
                                        {joueur.nom}
                                      </p>

                                      <span className="
                                        px-2 py-0.5
                                        rounded-full
                                        bg-amber-200
                                        text-amber-800
                                        text-xs
                                        font-bold
                                      ">
                                        Faux compte
                                      </span>

                                    </div>

                                    <p className="text-xs text-amber-700/70 mt-1">
                                      ID : {joueur.id}
                                    </p>

                                    {!joueur.actif && (
                                      <span className="
                                        inline-flex
                                        mt-2
                                        px-2 py-1
                                        rounded-full
                                        bg-red-100
                                        text-red-700
                                        text-xs
                                        font-semibold
                                      ">
                                        Inactif
                                      </span>
                                    )}

                                  </div>

                                </div>

                                {/* COMPTE LIÉ */}
                                <div className="lg:w-80">

                                  <label className="block text-xs font-semibold text-amber-800 mb-1.5">
                                    Compte utilisateur associé
                                  </label>

                                  <select
                                    value={
                                      joueur.utilisateur_id || ""
                                    }
                                    onChange={(e) =>
                                      updateJoueurUtilisateur(
                                        joueur.id,
                                        e.target.value
                                      )
                                    }
                                    className="
                                      w-full
                                      px-3 py-2.5
                                      rounded-xl
                                      border border-amber-200
                                      bg-white
                                      text-slate-700
                                      font-medium
                                      focus:border-amber-500
                                      focus:ring-4
                                      focus:ring-amber-500/10
                                      outline-none
                                      transition
                                    "
                                  >

                                    <option value="">
                                      -- Aucun compte lié --
                                    </option>

                                    {allUsers.map((u) => (

                                      <option
                                        key={u.id}
                                        value={u.id}
                                        disabled={
                                          allJoueurs.some(
                                            (j) =>
                                              j.id !== joueur.id &&
                                              j.utilisateur_id ===
                                                u.id
                                          )
                                        }
                                      >

                                        {u.nom}

                                        {u.id === profil.id
                                          ? " (moi)"
                                          : ""}

                                        {u.id === joueur.utilisateur_id
                                          ? " ✓"
                                          : ""}

                                      </option>

                                    ))}

                                  </select>

                                </div>

                              </div>

                              {/* ÉTAT DE LA LIAISON */}
                              <div className="mt-4 pt-4 border-t border-amber-200">

                                {compteLie ? (

                                  <div className="
                                    flex flex-wrap
                                    items-center
                                    gap-2
                                    text-sm
                                    text-emerald-700
                                  ">

                                    <span className="
                                      inline-flex
                                      items-center
                                      gap-2
                                      px-3 py-1.5
                                      rounded-xl
                                      bg-emerald-50
                                      border border-emerald-200
                                      font-semibold
                                    ">
                                      <Link2 className="w-4 h-4" />
                                      Lié à {compteLie.nom}
                                    </span>

                                    <span className="text-slate-500">
                                      Les anciennes parties et statistiques
                                      sont rattachées à ce compte.
                                    </span>

                                  </div>

                                ) : (

                                  <div className="
                                    inline-flex
                                    items-center
                                    gap-2
                                    px-3 py-1.5
                                    rounded-xl
                                    bg-white/70
                                    border border-amber-200
                                    text-amber-700
                                    text-sm
                                    font-medium
                                  ">
                                    <Unlink2 className="w-4 h-4" />
                                    Ce faux compte n'est lié à aucun compte utilisateur
                                  </div>

                                )}

                              </div>

                            </div>

                          </div>

                        );

                      })

                    )}

                  </div>

                )}

                {/* ================================================= */}
                {/* ROLES */}
                {/* ================================================= */}

                <div className="mt-8 rounded-2xl bg-slate-50 border border-slate-200 p-6">

                  <div className="flex items-center gap-3 mb-5">

                    <div className="
                      w-10 h-10
                      rounded-xl
                      bg-violet-100
                      flex items-center justify-center
                    ">
                      <ShieldCheck className="w-5 h-5 text-violet-600" />
                    </div>

                    <div>

                      <h3 className="font-bold text-lg text-slate-900">
                        Rôles et permissions
                      </h3>

                      <p className="text-sm text-slate-500">
                        Fonctionnement des différents niveaux d'accès
                      </p>

                    </div>

                  </div>

                  <div className="space-y-3 text-sm">

                    <div className="p-4 rounded-xl bg-white border border-slate-200">
                      <strong className="text-slate-900">
                        User
                      </strong>
                      <span className="text-slate-600">
                        {" "} : peut uniquement s'inscrire/se désinscrire à une partie
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200">
                      <strong className="text-slate-900">
                        Membre
                      </strong>
                      <span className="text-slate-600">
                        {" "} : User + peut organiser des parties et{" "}
                      </span>
                      <strong className="text-slate-700">
                        pour ses propres parties
                      </strong>
                      <span className="text-slate-600">
                        {" "} : les modifier & supprimer (pour les parties à venir)
                        et ajouter des inscrits, gérer le classement et les scores
                        (pour les parties archivées)
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200">
                      <strong className="text-slate-900">
                        Ludo
                      </strong>
                      <span className="text-slate-600">
                        {" "} : Membre + peut ajouter des jeux à la Ludothèque et{" "}
                      </span>
                      <strong className="text-slate-700">
                        pour ses propres jeux
                      </strong>
                      <span className="text-slate-600">
                        {" "} : les modifier
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200">
                      <strong className="text-slate-900">
                        Ludoplus
                      </strong>
                      <span className="text-slate-600">
                        {" "} : Ludo + peut modifier tous les jeux de la Ludothèque
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
                      <strong className="text-violet-900">
                        Admin
                      </strong>
                      <span className="text-violet-800">
                        {" "} : Ludoplus + peut gérer les rôles des Utilisateurs +
                        peut gérer le classement et les scores de toutes les parties
                        archivées ainsi qu'y ajouter des inscrits
                      </span>
                    </div>

                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-200">

                    <p className="font-semibold text-slate-800 mb-3">
                      Tous les utilisateurs peuvent par défaut
                      (en fonction de leurs rôles) :
                    </p>

                    <ul className="space-y-2 text-sm text-slate-700">

                      <li className="flex gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        Modifier les jeux qu'ils ajoutent eux-mêmes dans la Ludothèque
                      </li>

                      <li className="flex gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        Pour les parties qu'ils organisent : modifier/supprimer les parties
                      </li>

                      <li className="flex gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        Pour les parties qu'ils organisent : ajouter de nouveaux inscrits
                        (une fois la partie archivée)
                      </li>

                      <li className="flex gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        Pour les parties qu'ils organisent : gérer le classement et les
                        scores des inscrits (une fois la partie archivée)
                      </li>

                    </ul>

                  </div>

                </div>

              </div>

            </section>

            {/* ------------------------------------------------- */}
            {/* DATES */}
            {/* ------------------------------------------------- */}

            <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Prochaines soirées et après-midi jeux
                    </h2>

                    <p className="text-sm text-slate-500">
                      Ajoute et gère les prochaines rencontres de
                      l'association
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm text-slate-500 mb-5">
                  Le type et les horaires sont automatiquement
                  préremplis selon le jour choisi, mais tu peux tout
                  modifier.
                </p>

                {/* FORMULAIRE */}
                <div
                  ref={formulaireDateRef}
                  className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 md:p-6"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center">
                      {dateEvenementEnEdition ? (
                        <Pencil className="w-5 h-5 text-violet-600" />
                      ) : (
                        <CalendarDays className="w-5 h-5 text-violet-600" />
                      )}
                    </div>

                    <h3 className="font-bold text-lg text-slate-900">
                      {dateEvenementEnEdition
                        ? "Modifier l'événement"
                        : "Ajouter une rencontre"}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Date
                      </label>

                      <input
                        type="date"
                        value={dateEvenement}
                        onChange={(e) =>
                          handleDateEvenementChange(
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Type
                      </label>

                      <select
                        value={typeEvenement}
                        onChange={(e) => {
                          const nouvelleValeur =
                            e.target.value;

                          setTypeEvenement(nouvelleValeur);

                          if (
                            nouvelleValeur ===
                            "personnalise"
                          ) {
                            setEmojiEvenement("🎲");
                            setNomTypePersonnalise("");
                          } else if (
                            estTypePersonnalise(
                              nouvelleValeur
                            )
                          ) {
                            setEmojiEvenement(
                              getEmojiTypePersonnalise(
                                nouvelleValeur
                              )
                            );

                            setNomTypePersonnalise(
                              getNomTypePersonnalise(
                                nouvelleValeur
                              )
                            );
                          }
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none"
                      >
                        <option value="soiree">
                          🌙 Soirée
                        </option>

                        <option value="apres_midi">
                          ☀️ Après-midi
                        </option>

                        {getTypesPersonnalises().length >
                          0 && (
                          <optgroup label="Types personnalisés">
                            {getTypesPersonnalises().map(
                              (type) => (
                                <option
                                  key={type}
                                  value={type}
                                >
                                  {getEmojiTypePersonnalise(
                                    type
                                  )}{" "}
                                  {getNomTypePersonnalise(
                                    type
                                  )}
                                </option>
                              )
                            )}
                          </optgroup>
                        )}

                        <option value="personnalise">
                          ✨ Créer un nouveau type...
                        </option>
                      </select>
                    </div>

                    {typeEvenement ===
                      "personnalise" && (
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white rounded-2xl border border-purple-200">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Emoji
                          </label>

                          <input
                            type="text"
                            value={emojiEvenement}
                            onChange={(e) =>
                              setEmojiEvenement(
                                e.target.value
                              )
                            }
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center text-2xl"
                            placeholder="🎲"
                            maxLength={8}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Nom du type
                          </label>

                          <input
                            type="text"
                            value={nomTypePersonnalise}
                            onChange={(e) =>
                              setNomTypePersonnalise(
                                e.target.value
                              )
                            }
                            className="w-full px-4 py-3 rounded-xl border border-slate-200"
                            placeholder="Ex. Tournoi, Halloween, Jeu de rôle..."
                            maxLength={50}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Heure de début
                      </label>

                      <input
                        type="time"
                        value={heureDebut}
                        onChange={(e) =>
                          setHeureDebut(e.target.value)
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Heure de fin
                      </label>

                      <input
                        type="time"
                        value={heureFin}
                        onChange={(e) =>
                          setHeureFin(e.target.value)
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Texte / précision{" "}
                        <span className="font-normal text-slate-400">
                          (facultatif)
                        </span>
                      </label>

                      <input
                        type="text"
                        value={texteEvenement}
                        onChange={(e) =>
                          setTexteEvenement(e.target.value)
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                        placeholder="Ex. Soirée spéciale Halloween 🎃, tournoi Ark Nova..."
                        maxLength={200}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-6">
                    <button
                      onClick={
                        ajouterOuModifierDateEvenement
                      }
                      type="button"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
                    >
                      <Save className="w-4 h-4" />

                      {dateEvenementEnEdition
                        ? "Enregistrer les modifications"
                        : "Ajouter la rencontre"}
                    </button>

                    {dateEvenementEnEdition && (
                      <button
                        onClick={resetFormDateEvenement}
                        type="button"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-600 text-white font-semibold hover:bg-slate-700 transition"
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </button>
                    )}
                  </div>
                </div>

                {/* LISTE */}
                <div className="mt-8">
                  <div className="flex items-center gap-3 mb-4">
                    <CalendarDays className="w-5 h-5 text-violet-600" />

                    <h3 className="font-bold text-lg text-slate-900">
                      Rencontres enregistrées
                    </h3>
                  </div>

                  {chargementDates ? (
                    <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                      Chargement des dates...
                    </div>
                  ) : datesEvenements.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                      Aucune rencontre enregistrée.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {datesEvenements.map((date) => {
                        const datePasse =
                          date.date_evenement <
                          new Date()
                            .toISOString()
                            .slice(0, 10);

                        return (
                          <div
                            key={date.id}
                            className={`rounded-2xl border p-5 transition ${
                              date.actif
                                ? "bg-white border-slate-200 shadow-sm hover:shadow-lg"
                                : "bg-slate-100 border-slate-200 opacity-60"
                            }`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                              <div>
                                <div className="font-bold text-lg text-slate-900">
                                  {date.type_evenement ===
                                    "soiree" && (
                                    <>🌙 Soirée</>
                                  )}

                                  {date.type_evenement ===
                                    "apres_midi" && (
                                    <>☀️ Après-midi</>
                                  )}

                                  {estTypePersonnalise(
                                    date.type_evenement
                                  ) && (
                                    <>
                                      {getEmojiTypePersonnalise(
                                        date.type_evenement
                                      )}{" "}
                                      {getNomTypePersonnalise(
                                        date.type_evenement
                                      )}
                                    </>
                                  )}
                                </div>

                                <div className="mt-2 text-sm text-slate-600">
                                  📅{" "}
                                  {formatDateEvenement(
                                    date.date_evenement
                                  )}
                                </div>

                                <div className="text-sm text-slate-600 mt-1">
                                  🕐{" "}
                                  {formatHeureEvenement(
                                    date.heure_debut
                                  )}{" "}
                                  –{" "}
                                  {formatHeureEvenement(
                                    date.heure_fin
                                  )}
                                </div>

                                {date.texte && (
                                  <div className="text-sm font-semibold text-violet-700 mt-2">
                                    ✨ {date.texte}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2 mt-3">
                                  {datePasse && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-600">
                                      Date passée
                                    </span>
                                  )}

                                  {!date.actif && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                      Désactivée
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() =>
                                    modifierDateEvenement(
                                      date
                                    )
                                  }
                                  type="button"
                                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
                                >
                                  <Pencil className="w-4 h-4" />
                                  Modifier
                                </button>

                                <button
                                  onClick={() =>
                                    toggleDateEvenement(
                                      date
                                    )
                                  }
                                  type="button"
                                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition ${
                                    date.actif
                                      ? "bg-orange-500 hover:bg-orange-600"
                                      : "bg-emerald-600 hover:bg-emerald-700"
                                  }`}
                                >
                                  <Power className="w-4 h-4" />

                                  {date.actif
                                    ? "Désactiver"
                                    : "Activer"}
                                </button>

                                <button
                                  onClick={() =>
                                    supprimerDateEvenement(
                                      date
                                    )
                                  }
                                  type="button"
                                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ------------------------------------------------- */}
            {/* DIAPORAMA */}
            {/* ------------------------------------------------- */}

            <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg">
                    <Images className="w-6 h-6 text-white" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Gestion des images du diaporama d'accueil
                    </h2>

                    <p className="text-sm text-slate-500">
                      Gère les images affichées sur la page d'accueil
                    </p>
                  </div>
                </div>

                <Link
                  to="/images"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-slate-700 to-slate-900 text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
                >
                  <Images className="w-4 h-4" />
                  Gérer le Diaporama
                </Link>
              </div>
            </section>

            {/* ------------------------------------------------- */}
            {/* PARAMÈTRES */}
            {/* ------------------------------------------------- */}

            <section>
              <div className="flex items-center gap-3 mb-5 px-1">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-violet-700 flex items-center justify-center shadow-lg">
                  <Settings className="w-5 h-5 text-white" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Paramètres de l'accueil
                  </h2>

                  <p className="text-sm text-slate-500">
                    Configure les informations affichées sur la page
                    d'accueil
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* PLANNING */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-violet-600" />
                    </div>

                    <div>
                      <h3 className="font-bold text-lg">
                        Planning des prochaines rencontres
                      </h3>
                    </div>
                  </div>

                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none"
                    placeholder="URL de l’image"
                    value={globalImageUrl}
                    onChange={(e) =>
                      setGlobalImageUrl(e.target.value)
                    }
                  />

                  <button
                    onClick={async () => {
                      const { data, error } =
                        await supabase
                          .from("settings")
                          .update({
                            global_image_url:
                              globalImageUrl,
                            updated_at: new Date(),
                          })
                          .eq("id", 1)
                          .select()
                          .single();

                      if (!error) {
                        alert("✅ Planning mis à jour !");
                      }
                    }}
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition"
                  >
                    <Save className="w-4 h-4" />
                    Mettre à jour
                  </button>

                  {globalImageUrl && (
                    <div className="mt-5 flex justify-center">
                      <img
                        src={globalImageUrl}
                        alt="Aperçu global"
                        onError={(e) => {
                          if (
                            !e.currentTarget.dataset
                              .fallback
                          ) {
                            e.currentTarget.dataset.fallback =
                              "true";

                            e.currentTarget.src =
                              "/qrcode.png";
                          }
                        }}
                        className="w-40 h-40 object-contain rounded-2xl border border-slate-200 shadow-lg bg-slate-50"
                      />
                    </div>
                  )}
                </div>

                {/* TEXTE ACCUEIL */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-indigo-600" />
                    </div>

                    <h3 className="font-bold text-lg">
                      Texte de la page d'accueil
                    </h3>
                  </div>

                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none"
                    placeholder="Texte de la page d'accueil"
                    value={globalTexte}
                    onChange={(e) =>
                      setGlobalTexte(e.target.value)
                    }
                  />

                  <button
                    onClick={async () => {
                      const { data, error } =
                        await supabase
                          .from("settings")
                          .update({
                            global_image_url:
                              globalTexte,
                            updated_at: new Date(),
                          })
                          .eq("id", 2)
                          .select()
                          .single();

                      if (!error) {
                        alert("✅ Texte mis à jour !");
                      }
                    }}
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition"
                  >
                    <Save className="w-4 h-4" />
                    Mettre à jour
                  </button>
                </div>

                {/* FACEBOOK */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>

                    <h3 className="font-bold text-lg">
                      Followers Facebook
                    </h3>
                  </div>

                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none"
                    placeholder="Nombre de followers"
                    value={globalcountFollowersFB}
                    onChange={(e) =>
                      setGlobalcountFollowersFB(
                        e.target.value
                      )
                    }
                  />

                  <button
                    onClick={async () => {
                      const { data, error } =
                        await supabase
                          .from("settings")
                          .update({
                            global_image_url:
                              globalcountFollowersFB,
                            updated_at: new Date(),
                          })
                          .eq("id", 3)
                          .select()
                          .single();

                      if (!error) {
                        alert(
                          "✅ Followers FB mis à jour !"
                        );
                      }
                    }}
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition"
                  >
                    <Save className="w-4 h-4" />
                    Mettre à jour
                  </button>
                </div>

                {/* ADHERENTS */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>

                    <h3 className="font-bold text-lg">
                      Nombre d'adhérents au total
                    </h3>
                  </div>

                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none"
                    placeholder="Nombre d'adhérents"
                    value={globalcountAdherentTotal}
                    onChange={(e) =>
                      setGlobalcountAdherentTotal(
                        e.target.value
                      )
                    }
                  />

                  <button
                    onClick={async () => {
                      const { data, error } =
                        await supabase
                          .from("settings")
                          .update({
                            global_image_url:
                              globalcountAdherentTotal,
                            updated_at: new Date(),
                          })
                          .eq("id", 4)
                          .select()
                          .single();

                      if (!error) {
                        alert(
                          "✅ Nombre d'adhérent Total mis à jour !"
                        );
                      }
                    }}
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition"
                  >
                    <Save className="w-4 h-4" />
                    Mettre à jour
                  </button>
                </div>

                {/* SEANCES */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center">
                      <Gamepad2 className="w-5 h-5 text-orange-600" />
                    </div>

                    <h3 className="font-bold text-lg">
                      Séances avant le 12 septembre 2025
                    </h3>
                  </div>

                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none"
                    placeholder="Nombre de séances"
                    value={
                      globalcountSeanceavantdouzeS
                    }
                    onChange={(e) =>
                      setGlobalcountSeanceavantdouzeS(
                        e.target.value
                      )
                    }
                  />

                  <button
                    onClick={async () => {
                      const { data, error } =
                        await supabase
                          .from("settings")
                          .update({
                            global_image_url:
                              globalcountSeanceavantdouzeS,
                            updated_at: new Date(),
                          })
                          .eq("id", 5)
                          .select()
                          .single();

                      if (!error) {
                        alert(
                          "✅ Nombre de séances totales mis à jour !"
                        );
                      }
                    }}
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition"
                  >
                    <Save className="w-4 h-4" />
                    Mettre à jour
                  </button>
                </div>

                {/* ANNONCE */}
                <div className="bg-white rounded-[2rem] border border-red-200 shadow-xl p-6 lg:col-span-2">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-red-600" />
                    </div>

                    <div>
                      <h3 className="font-bold text-lg">
                        Envoyer une notification d'annonce importante
                      </h3>

                      <p className="text-sm text-slate-500">
                        L'annonce sera également envoyée par notification
                      </p>
                    </div>
                  </div>

                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none"
                    placeholder="Annonce importante"
                    value={globalAnnonce}
                    onChange={(e) =>
                      setGlobalAnnonce(e.target.value)
                    }
                  />

                  <button
                    onClick={async () => {
                      const { data, error } =
                        await supabase
                          .from("settings")
                          .update({
                            global_image_url:
                              globalAnnonce,
                            updated_at: new Date(),
                          })
                          .eq("id", 6)
                          .select()
                          .single();

                      if (!error) {
                        alert("✅ Annonce envoyée !");
                      }

                      const {
                        data: { session },
                      } =
                        await supabase.auth.getSession();

                      await fetch(
                        "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/notify-game",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type":
                              "application/json",
                            Authorization: `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({
                            type: "notif_annonces",
                            title:
                              "📢 Nouvelle annonce du Président",
                            body: `${globalAnnonce}`,
                            url: "/parties",
                          }),
                        }
                      );
                    }}
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
                  >
                    <Send className="w-4 h-4" />
                    Envoyer la notification
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ===================================================== */}
        {/* SUPPRESSION COMPTE */}
        {/* ===================================================== */}

        <section className="rounded-[2rem] border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-red-100 flex items-center justify-center">
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
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer mon compte
            </button>
          </div>
        </section>

      </div>

      {/* ===================================================== */}
      {/* ZOOM IMAGE */}
      {/* ===================================================== */}

      {zoomOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-5">
          <button
            onClick={() => setZoomOpen(false)}
            type="button"
            className="absolute top-5 right-5 w-12 h-12 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition"
          >
            <X className="w-7 h-7" />
          </button>

          <img
            src={globalImageUrl}
            alt="Zoom"
            className="max-w-[90%] max-h-[90%] rounded-2xl shadow-2xl animate-zoom"
          />
        </div>
      )}
    </div>
  );
}