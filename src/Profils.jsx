import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; 
import { supabase } from "./supabaseClient";
import { Navigate } from "react-router-dom";
import {
  enablePushForDevice,
  disablePushForDevice,
} from "./push";
import RecapJeuxShareableStyle from "./RecapJeuxShareableStyle";

export default function Profils({ authUser, user, setProfilGlobal, setAuthUser, setUser }) {
  const [profil, setProfil] = useState(null);
  const [nom, setNom] = useState("");
  const [jeux, setJeux] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allJoueurs, setAllJoueurs] = useState([]);
  const [datesEvenements, setDatesEvenements] = useState([]);

  const SUPABASE_URL = "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/delete-user";

  const [globalImageUrl, setGlobalImageUrl] = useState("");
  const [globalTexte, setGlobalTexte] = useState("");
  const [globalAnnonce, setGlobalAnnonce] = useState("");
  const [globalcountFollowersFB, setGlobalcountFollowersFB] = useState("");
  const [globalcountAdherentTotal, setGlobalcountAdherentTotal] = useState("");
  const [globalcountSeanceavantdouzeS, setGlobalcountSeanceavantdouzeS] = useState("");
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

  // =========================================================
  // 📅 GESTION DES DATES D'ÉVÉNEMENTS
  // =========================================================

  const [dateEvenement, setDateEvenement] = useState("");
  const [typeEvenement, setTypeEvenement] = useState("soiree");
  const [heureDebut, setHeureDebut] = useState("20:00");
  const [heureFin, setHeureFin] = useState("23:00");
  const [dateEvenementEnEdition, setDateEvenementEnEdition] = useState(null);
  const [chargementDates, setChargementDates] = useState(false);
  const [texteEvenement, setTexteEvenement] = useState("");

  // Type personnalisé
  const [emojiEvenement, setEmojiEvenement] = useState("🎲");
  const [nomTypePersonnalise, setNomTypePersonnalise] = useState("");

  // Préremplissage selon le jour choisi
  const getDefaultsFromDate = (date) => {
    if (!date) {
      return {
        type_evenement: "soiree",
        heure_debut: "20:00",
        heure_fin: "23:00",
      };
    }

    // On utilise midi pour éviter les problèmes de décalage horaire
    const jour = new Date(`${date}T12:00:00`).getDay();

    // 0 = dimanche / 6 = samedi
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

  // =========================================================
  // 🎨 TYPES D'ÉVÉNEMENTS PERSONNALISÉS
  // =========================================================

  // Transforme un type personnalisé en valeur stockable
  const creerTypePersonnalise = (emoji, nom) => {
    return `custom|${emoji}|${nom}`;
  };

  // Permet de savoir si un type est personnalisé
  const estTypePersonnalise = (type) => {
    return typeof type === "string" && type.startsWith("custom|");
  };

  // Récupère l'emoji d'un type personnalisé
  const getEmojiTypePersonnalise = (type) => {
    if (!estTypePersonnalise(type)) return "";
    const morceaux = type.split("|");
    return morceaux[1] || "";
  };

  // Récupère le nom d'un type personnalisé
  const getNomTypePersonnalise = (type) => {
    if (!estTypePersonnalise(type)) return "";
    const morceaux = type.split("|");
    return morceaux.slice(2).join("|") || "";
  };

  // Récupère tous les types personnalisés déjà utilisés
  const getTypesPersonnalises = () => {
    const types = datesEvenements
      .filter((date) => estTypePersonnalise(date.type_evenement))
      .map((date) => date.type_evenement);

    return [...new Set(types)];
  };

  // Quand on choisit une nouvelle date, on applique les horaires par défaut.
  // En mode modification, on conserve les horaires existants.
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
      .select("id, date_evenement, type_evenement, heure_debut, heure_fin, texte, actif, created_at")
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
      setEmojiEvenement(
        getEmojiTypePersonnalise(date.type_evenement)
      );

      setNomTypePersonnalise(
        getNomTypePersonnalise(date.type_evenement)
      );
    } else {
      setEmojiEvenement("🎲");
      setNomTypePersonnalise("");
    }

    setHeureDebut(
      date.heure_debut
        ? date.heure_debut.slice(0, 5)
        : ""
    );

    setHeureFin(
      date.heure_fin
        ? date.heure_fin.slice(0, 5)
        : ""
    );

    setTexteEvenement(date.texte || "");
    setDateEvenementEnEdition(date.id);

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
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

  // Détecte si on est sur iOS
  const isIOS = () => {
    if (typeof window === "undefined") return false;

    const iOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    return iOSDevice;
  };

  // Détecte si on est en PWA
  const isPWA = () => {
    if (typeof window === "undefined") return false;

    if (window.navigator.standalone) return true;

    if (window.matchMedia("(display-mode: standalone)").matches) return true;

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

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

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

        // Génération d’un pseudo fun si nom vide
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
            adjectives[Math.floor(Math.random() * adjectives.length)];

          const randomCreature =
            creatures[Math.floor(Math.random() * creatures.length)];

          const randomNum = Math.floor(100 + Math.random() * 900);

          const defaultName = `${randomAdj}${randomCreature}${randomNum}`;

          const { data: newData, error: updateError } = await supabase
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
          // 👤 Vrais utilisateurs
          const { data: usersData, error: usersError } = await supabase
            .from("profils")
            .select("id, nom, role")
            .order("nom", { ascending: true });

          if (!usersError && usersData) {
            setAllUsers(usersData);
          }

          // 👤 Faux comptes / joueurs
          const { data: joueursData, error: joueursError } = await supabase
            .from("joueurs")
            .select("id, nom, actif, utilisateur_id")
            .order("nom", { ascending: true });

          if (!joueursError && joueursData) {
            setAllJoueurs(joueursData);
          }

          // 📅 Dates des événements
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
        setGlobalcountFollowersFB(data.global_image_url || "");
      }
    };

    const fetchGlobalcountAdherentTotal = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 4)
        .single();

      if (!error && data) {
        setGlobalcountAdherentTotal(data.global_image_url || "");
      }
    };

    const fetchGlobalcountSeanceavantdouzeS = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", 5)
        .single();

      if (!error && data) {
        setGlobalcountSeanceavantdouzeS(data.global_image_url || "");
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

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        alert("❌ Les notifications ne sont pas activées sur cet appareil");
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
          .update({ fav: Math.max((oldJeu.fav || 0) - 1, 0) })
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
          .update({ fav: (newJeu.fav || 0) + 1 })
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

  const updateJoueurUtilisateur = async (joueurId, utilisateurId) => {
    const nouveauUtilisateurId = utilisateurId || null;

    const joueur = allJoueurs.find((j) => j.id === joueurId);

    if (!joueur) return;

    if (
      nouveauUtilisateurId &&
      allJoueurs.some(
        (j) =>
          j.id !== joueurId &&
          j.utilisateur_id === nouveauUtilisateurId
      )
    ) {
      alert("❌ Ce vrai compte est déjà lié à un faux compte.");
      return;
    }

    const nomUtilisateur =
      allUsers.find((u) => u.id === nouveauUtilisateurId)?.nom ||
      "";

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
      console.error("Erreur liaison faux compte :", error);
      alert(`❌ Impossible de modifier la liaison : ${error.message}`);
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
    if (!window.confirm("⚠️ Voulez-vous vraiment supprimer votre compte ?")) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("❌ Impossible de récupérer la session utilisateur");
        return;
      }

      const res = await fetch(SUPABASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: authUser.id }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Erreur suppression :", err);
        alert("❌ Une erreur est survenue lors de la suppression du compte");
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
      <div className="text-center mt-10">
        Chargement du profil...
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">

        {/* Bloc Nom + Rôle */}
        <div className="flex-1">

          <h2 className="text-2xl font-bold mb-2">
            Mon profil
          </h2>

          {/* Prénom */}
          <div className="mb-3">

            <label className="block font-medium mb-1">
              Prénom :
            </label>

            <div className="flex gap-2">

              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="border p-2 rounded w-full"
                placeholder="Entrez votre prénom"
              />

              <button
                onClick={updateNom}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Valider
              </button>

            </div>
          </div>

          <p className="font-medium mt-1">
            <strong>Rôle :</strong> {profil.role}
          </p>

        </div>
      </div>

      {/* Notifications */}
      <div className="mt-6 p-4 border rounded bg-gray-50">

        <h3 className="text-lg font-semibold mb-3">
          🔔 Notifications
        </h3>

        {/* 🍎 CAS iOS */}
        {isIOS() ? (
          <>

            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">

              🍎 <strong>Notifications sur iPhone</strong>

              <br />

              Les notifications fonctionnent uniquement si l’application est
              ajoutée à l’écran d’accueil.

              <ul className="list-disc ml-4 mt-2">

                <li>Ouvrez Safari</li>
                <li>Ajoutez l’app à l’écran d’accueil</li>
                <li>Ouvrez l’app installée</li>

              </ul>

            </div>

            {notifPermission !== "granted" ? (

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">

                <p className="text-sm mb-2">
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

                      const permission = await new Promise((resolve) => {
                        Notification.requestPermission(resolve);
                      });

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
                  className="
                    relative z-50
                    bg-blue-600 text-white
                    px-6 py-3
                    rounded-lg
                    transform translate-z-0
                    active:scale-95
                  "
                >
                  Activer les notifications
                </button>

              </div>

            ) : (

              <p className="text-sm text-green-700 mb-2">
                ✅ Notifications activées sur cet appareil
              </p>

            )}

          </>

        ) : (

          <>

            {[

              {
                key: "notif_parties",
                label: "🎲 Nouvelles parties"
              },

              {
                key: "notif_jeux",
                label: "🆕 Nouveaux jeux ajoutés à la ludothèque"
              },

              {
                key: "notif_annonces",
                label: "📢 Annonces importantes (du président)"
              },

              {
                key: "notif_ping",
                label: "🔔 Ping (Message du tchat @votrepseudo)"
              },

              {
                key: "notif_chat",
                label: "💬 Tous les Messages du tchat"
              },

            ].map(({ key, label }) => (

              <label
                key={key}
                className="flex items-center justify-between py-2 cursor-pointer"
              >

                <span>{label}</span>

                <input
                  type="checkbox"
                  checked={!!notifSettings[key]}
                  disabled={
                    (isIOS() && notifPermission !== "granted") ||
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

                      toggleNotif(
                        key,
                        checked
                      );

                    }

                  }}
                  className="w-5 h-5"
                />

              </label>

            ))}

            <p className="text-sm text-gray-600 mt-3">

              {pushDevicesCount} device
              {pushDevicesCount > 1 ? "s" : ""}
              {" "}actif
              {pushDevicesCount > 1 ? "s" : ""}.

              <br />

              Chaque appareil peut avoir ses propres préférences.

            </p>

            <button
              onClick={testNotification}
              disabled={
                testingNotif ||
                (
                  !notifSettings.notif_parties &&
                  !notifSettings.notif_chat &&
                  !notifSettings.notif_annonces &&
                  !notifSettings.notif_jeux &&
                  !notifSettings.notif_ping
                )
              }
              className={`mt-3 px-4 py-2 rounded text-white ${
                testingNotif ||
                (
                  !notifSettings.notif_parties &&
                  !notifSettings.notif_chat &&
                  !notifSettings.notif_annonces &&
                  !notifSettings.notif_jeux &&
                  !notifSettings.notif_ping
                )
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {testingNotif
                ? "Envoi en cours..."
                : "Tester la notification"}
            </button>

          </>

        )}

      </div>

      {profil.role === "user" && (
        <p>
          <strong>
            N'hésitez pas à vous manifester dans le tchat de l'accueil ou sur messenger
            si vous souhaitez obtenir des droits supplémentaire sur l'application comme
            ceux d'organiser des parties ou d'ajouter des jeux à la ludothèque
          </strong>
        </p>
      )}

      {/* Récapitulatif des jeux joués */}
      <h3 className="text-xl font-semibold mt-6 mb-2">
        🎲 Le récap' partageable de mes parties
      </h3>

      <RecapJeuxShareableStyle userId={profil.id} />

      {/* Jeux favoris */}
      <h3 className="text-xl font-semibold mt-6 mb-2">
        🎲 Les jeux auxquels j'aimerais jouer
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">

        {[1, 2].map((n) => {

          const selectedId = profil[`jeufavoris${n}`];
          const jeu = jeux.find((j) => j.id === selectedId);

          return (

            <div key={n}>

              <label className="block font-medium mb-1">
                Jeu favori {n} :
              </label>

              <select
                value={selectedId || ""}
                onChange={(e) =>
                  updateFavoris(
                    `jeufavoris${n}`,
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
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

                <div className="mt-2 border rounded p-2 bg-white shadow sm:col-span-2">

                  <p className="font-semibold">
                    {jeu.nom}
                  </p>

                  {jeu.couverture_url && (

                    <img
                      src={jeu.couverture_url}
                      alt={jeu.nom}
                      className="w-full h-32 object-contain mt-2"
                    />

                  )}

                </div>

              )}

            </div>

          );

        })}

      </div>

      {/* ========================================================= */}
      {/* 👥 GESTION DES UTILISATEURS POUR ADMIN */}
      {/* ========================================================= */}

      {profil.role === "admin" && (

        <div className="mt-10">

          <h3 className="text-xl font-semibold mb-4">
            Gestion des utilisateurs
          </h3>

          <table className="w-full border-collapse border border-gray-300">

            <thead className="bg-gray-100">

              <tr>

                <th className="border border-gray-300 p-2">
                  Nom
                </th>

                <th className="border border-gray-300 p-2">
                  Rôle
                </th>

                <th className="border border-gray-300 p-2">
                  Lier à un compte
                </th>

              </tr>

            </thead>

            <tbody>

              {/* VRAIS UTILISATEURS */}

              {allUsers.map((u) => {

                const isCurrentAdmin =
                  u.id === profil.id;

                const isAdminUser =
                  u.role === "admin";

                const fauxCompteLie =
                  allJoueurs.find(
                    (j) => j.utilisateur_id === u.id
                  );

                return (

                  <tr
                    key={`user-${u.id}`}
                    className="text-center"
                  >

                    <td className="border border-gray-300 p-2">
                      {u.nom}
                    </td>

                    <td className="border border-gray-300 p-2">

                      {isCurrentAdmin || isAdminUser ? (

                        <span className="px-2 py-1 bg-gray-200 rounded">
                          {u.role}
                        </span>

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
                          className="border p-1 rounded"
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

                    </td>

                    <td className="border border-gray-300 p-2">

                      {fauxCompteLie ? (

                        <span className="text-sm">
                          🎭 {fauxCompteLie.nom}
                        </span>

                      ) : (

                        <span className="text-gray-400">
                          —
                        </span>

                      )}

                    </td>

                  </tr>

                );

              })}

              {/* FAUX COMPTES */}

              {allJoueurs.map((joueur) => (

                <tr
                  key={`joueur-${joueur.id}`}
                  className="text-center bg-yellow-50"
                >

                  <td className="border border-gray-300 p-2 font-medium">
                    🎭 {joueur.nom}
                  </td>

                  <td className="border border-gray-300 p-2">

                    <span className="px-2 py-1 bg-yellow-200 rounded">
                      Faux compte
                    </span>

                  </td>

                  <td className="border border-gray-300 p-2">

                    <select
                      value={joueur.utilisateur_id || ""}
                      onChange={(e) =>
                        updateJoueurUtilisateur(
                          joueur.id,
                          e.target.value
                        )
                      }
                      className="border p-1 rounded w-full"
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
                                j.utilisateur_id === u.id
                            )
                          }
                        >

                          {u.nom}

                          {u.id === profil.id
                            ? " (moi)"
                            : ""}

                        </option>

                      ))}

                    </select>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          <h3 className="text-xl font-semibold mb-4 mt-6">
            Rôles :
          </h3>

          <ul className="list-disc pl-5 mt-2">

            <li>
              <span className="font-bold">User</span> :
              peut uniquement s'inscrire/se désinscrire à une partie
            </li>

            <li>
              <span className="font-bold">Membre</span> :
              User + peut organiser des parties et{" "}
              <span className="font-semibold">
                pour ses propres parties
              </span>
              : les modifier & supprimer
              (pour les parties à venir) et ajouter des inscrits,
              gérer le classement et les scores
              (pour les parties archivées)
            </li>

            <li>
              <span className="font-bold">Ludo</span> :
              Membre + peut ajouter des jeux à la Ludothèque et{" "}
              <span className="font-semibold">
                pour ses propres jeux
              </span>
              : les modifier
            </li>

            <li>
              <span className="font-bold">Ludoplus</span> :
              Ludo + peut modifier tous les jeux de la Ludothèque
            </li>

            <li>
              <span className="font-bold">Admin</span> :
              Ludoplus + peut gérer les rôles des Utilisateurs +
              peut gérer le classement et les scores de toutes les
              parties archivées ainsi qu'y ajouter des inscrits
            </li>

          </ul>

          <p className="mt-2">
            Tous les utilisateurs peuvent par défaut
            (en fonction de leurs rôles) :
          </p>

          <ul className="list-disc pl-5 mt-2">

            <li>
              Modifier les jeux qu'ils ajoutent eux-mêmes dans la Ludothèque
            </li>

            <li>
              Pour les parties qu'ils organisent :
              Modifier/supprimer les parties
            </li>

            <li>
              Pour les parties qu'ils organisent :
              Ajouter de nouveaux inscrits
              (une fois la partie archivée)
            </li>

            <li>
              Pour les parties qu'ils organisent :
              Gérer le classement et les scores des inscrits
              (une fois la partie archivée)
            </li>

          </ul>

        </div>

      )}

      {/* ========================================================= */}
      {/* 📅 GESTION DES DATES DE SOIRÉES / APRÈS-MIDI */}
      {/* ========================================================= */}

      {profil.role === "admin" && (

        <div className="mt-10 p-4 border rounded bg-gray-50">

          <h3 className="text-xl font-semibold mb-2">
            📅 Prochaines soirées et après-midi jeux
          </h3>

          <p className="text-sm text-gray-600 mb-4">
            Ajoute ici les prochaines rencontres de l'association.
            Le type et les horaires sont automatiquement préremplis
            selon le jour choisi, mais tu peux tout modifier.
          </p>

          {/* FORMULAIRE */}

          <div className="bg-white border rounded-lg p-4 shadow-sm">

            <h4 className="font-semibold mb-4">
              {dateEvenementEnEdition
                ? "✏️ Modifier l'événement"
                : "➕ Ajouter une rencontre"}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* DATE */}

              <div>

                <label className="block font-medium mb-1">
                  Date :
                </label>

                <input
                  type="date"
                  value={dateEvenement}
                  onChange={(e) =>
                    handleDateEvenementChange(
                      e.target.value
                    )
                  }
                  className="border p-2 rounded w-full"
                />

              </div>

              {/* TYPE */}

              <div>

                <label className="block font-medium mb-1">
                  Type :
                </label>

                <select
                  value={typeEvenement}
                  onChange={(e) => {
                    const nouvelleValeur = e.target.value;

                    setTypeEvenement(nouvelleValeur);

                    if (nouvelleValeur === "personnalise") {
                      setEmojiEvenement("🎲");
                      setNomTypePersonnalise("");
                    } else if (estTypePersonnalise(nouvelleValeur)) {
                      setEmojiEvenement(
                        getEmojiTypePersonnalise(nouvelleValeur)
                      );

                      setNomTypePersonnalise(
                        getNomTypePersonnalise(nouvelleValeur)
                      );
                    }
                  }}
                  className="border p-2 rounded w-full"
                >

                  <option value="soiree">
                    🌙 Soirée
                  </option>

                  <option value="apres_midi">
                    ☀️ Après-midi
                  </option>

                  {getTypesPersonnalises().length > 0 && (
                    <optgroup label="Types personnalisés">

                      {getTypesPersonnalises().map((type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {getEmojiTypePersonnalise(type)}{" "}
                          {getNomTypePersonnalise(type)}
                        </option>
                      ))}

                    </optgroup>
                  )}

                  <option value="personnalise">
                    ✨ Créer un nouveau type...
                  </option>

                </select>

              </div>
              {/* TYPE PERSONNALISÉ */}

              {typeEvenement === "personnalise" && (

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">

                  <div>

                    <label className="block font-medium mb-1">
                      Emoji :
                    </label>

                    <input
                      type="text"
                      value={emojiEvenement}
                      onChange={(e) =>
                        setEmojiEvenement(e.target.value)
                      }
                      className="border p-2 rounded w-full text-center text-2xl"
                      placeholder="🎲"
                      maxLength={8}
                    />

                  </div>

                  <div className="md:col-span-2">

                    <label className="block font-medium mb-1">
                      Nom du type :
                    </label>

                    <input
                      type="text"
                      value={nomTypePersonnalise}
                      onChange={(e) =>
                        setNomTypePersonnalise(e.target.value)
                      }
                      className="border p-2 rounded w-full"
                      placeholder="Ex. Tournoi, Halloween, Jeu de rôle..."
                      maxLength={50}
                    />

                  </div>

                </div>

              )}

              {/* HEURE DEBUT */}

              <div>

                <label className="block font-medium mb-1">
                  Heure de début :
                </label>

                <input
                  type="time"
                  value={heureDebut}
                  onChange={(e) =>
                    setHeureDebut(
                      e.target.value
                    )
                  }
                  className="border p-2 rounded w-full"
                />

              </div>

              {/* HEURE FIN */}

              <div>

                <label className="block font-medium mb-1">
                  Heure de fin :
                </label>

                <input
                  type="time"
                  value={heureFin}
                  onChange={(e) =>
                    setHeureFin(
                      e.target.value
                    )
                  }
                  className="border p-2 rounded w-full"
                />

              </div>

              {/* TEXTE FACULTATIF */}

              <div className="md:col-span-2">

                <label className="block font-medium mb-1">
                  Texte / précision <span className="text-gray-500 font-normal">(facultatif)</span> :
                </label>

                <input
                  type="text"
                  value={texteEvenement}
                  onChange={(e) => setTexteEvenement(e.target.value)}
                  className="border p-2 rounded w-full"
                  placeholder="Ex. Soirée spéciale Halloween 🎃, tournoi Ark Nova..."
                  maxLength={200}
                />

              </div>

            </div>

            {/* BOUTONS */}

            <div className="flex flex-wrap gap-2 mt-4">

              <button
                onClick={
                  ajouterOuModifierDateEvenement
                }
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                {dateEvenementEnEdition
                  ? "💾 Enregistrer les modifications"
                  : "➕ Ajouter la rencontre"}
              </button>

              {dateEvenementEnEdition && (

                <button
                  onClick={
                    resetFormDateEvenement
                  }
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Annuler
                </button>

              )}

            </div>

          </div>

          {/* LISTE DES DATES */}

          <div className="mt-6">

            <h4 className="font-semibold mb-3">
              📋 Rencontres enregistrées
            </h4>

            {chargementDates ? (

              <p className="text-gray-500">
                Chargement des dates...
              </p>

            ) : datesEvenements.length === 0 ? (

              <p className="text-gray-500">
                Aucune rencontre enregistrée.
              </p>

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
                      className={`border rounded-lg p-3 ${
                        date.actif
                          ? "bg-white"
                          : "bg-gray-100 opacity-60"
                      }`}
                    >

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

                        {/* INFOS */}

                        <div>

                          <div className="font-semibold">

                            {date.type_evenement === "soiree" && (
                              <>🌙 Soirée</>
                            )}

                            {date.type_evenement === "apres_midi" && (
                              <>☀️ Après-midi</>
                            )}

                            {estTypePersonnalise(date.type_evenement) && (
                              <>
                                {getEmojiTypePersonnalise(date.type_evenement)}{" "}
                                {getNomTypePersonnalise(date.type_evenement)}
                              </>
                            )}

                          </div>

                          <div className="text-sm text-gray-700">

                            📅{" "}
                            {formatDateEvenement(
                              date.date_evenement
                            )}

                          </div>

                          <div className="text-sm text-gray-700">

                            🕐{" "}
                            {formatHeureEvenement(
                              date.heure_debut
                            )}
                            {" – "}
                            {formatHeureEvenement(
                              date.heure_fin
                            )}

                          </div>

                          {date.texte && (
                            <div className="text-sm font-medium text-blue-700 mt-1">
                              ✨ {date.texte}
                            </div>
                          )}

                          {datePasse && (

                            <span className="inline-block mt-1 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                              Date passée
                            </span>

                          )}

                          {!date.actif && (

                            <span className="inline-block mt-1 ml-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                              Désactivée
                            </span>

                          )}

                        </div>

                        {/* ACTIONS */}

                        <div className="flex flex-wrap gap-2">

                          <button
                            onClick={() =>
                              modifierDateEvenement(
                                date
                              )
                            }
                            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                          >
                            ✏️ Modifier
                          </button>

                          <button
                            onClick={() =>
                              toggleDateEvenement(
                                date
                              )
                            }
                            className={`px-3 py-2 rounded text-sm text-white ${
                              date.actif
                                ? "bg-orange-500 hover:bg-orange-600"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
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
                            className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm"
                          >
                            🗑️ Supprimer
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

      )}

      {/* ========================================================= */}
      {/* 🖼️ GESTION DU DIAPORAMA */}
      {/* ========================================================= */}

      {profil.role === "admin" && (

        <div className="mt-10 p-4 border rounded bg-gray-50 flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">

          <div className="flex items-center justify-between mb-4">

            <h3 className="text-xl font-semibold mb-2">
              🖼️ Gestion des images du diaporama d'accueil
            </h3>

            <Link
              to="/images"
              className="ml-4 bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300"
            >
              Gérer le Diaporama
            </Link>

          </div>

        </div>

      )}

      {/* Planning */}
      {profil.role === "admin" && (

        <div className="mt-10 p-4 border rounded bg-gray-50 flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">

          <div className="flex-1">

            <h3 className="text-xl font-semibold mb-2">
              🖼️ Planning des prochaines rencontres
            </h3>

            <input
              type="text"
              className="border p-2 rounded w-full"
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
                      updated_at:
                        new Date(),
                    })
                    .eq("id", 1)
                    .select()
                    .single();

                if (!error) {
                  alert(
                    "✅ Planning mis à jour !"
                  );
                }

              }}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Mettre à jour
            </button>

          </div>

          {globalImageUrl && (

            <div className="mt-4 lg:mt-0 lg:ml-6 flex justify-center lg:justify-end">

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
                className="w-32 h-32 object-contain border rounded shadow"
              />

            </div>

          )}

        </div>

      )}

      {/* Texte accueil */}
      {profil.role === "admin" && (

        <div className="mt-10 p-4 border rounded bg-gray-50">

          <h3 className="text-xl font-semibold mb-2">
            🏛️ Texte de la page d'accueil
          </h3>

          <input
            type="text"
            className="border p-2 rounded w-full"
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
                    updated_at:
                      new Date(),
                  })
                  .eq("id", 2)
                  .select()
                  .single();

              if (!error) {
                alert(
                  "✅ Texte mis à jour !"
                );
              }

            }}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Mettre à jour
          </button>

        </div>

      )}

      {/* Followers FB */}
      {profil.role === "admin" && (

        <div className="mt-10 p-4 border rounded bg-gray-50">

          <h3 className="text-xl font-semibold mb-2">
            ✨ Followers FB
          </h3>

          <input
            type="text"
            className="border p-2 rounded w-full"
            placeholder="Texte de la page d'accueil"
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
                    updated_at:
                      new Date(),
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
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Mettre à jour
          </button>

        </div>

      )}

      {/* Nombre adhérents */}
      {profil.role === "admin" && (

        <div className="mt-10 p-4 border rounded bg-gray-50">

          <h3 className="text-xl font-semibold mb-2">
            ✨ Nombre d'adhérent au total
          </h3>

          <input
            type="text"
            className="border p-2 rounded w-full"
            placeholder="Texte de la page d'accueil"
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
                    updated_at:
                      new Date(),
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
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Mettre à jour
          </button>

        </div>

      )}

      {/* Séances avant le 12 septembre 2025 */}
      {profil.role === "admin" && (

        <div className="mt-10 p-4 border rounded bg-gray-50">

          <h3 className="text-xl font-semibold mb-2">
            ✨ Séances avant le 12 septembre 2025
          </h3>

          <input
            type="text"
            className="border p-2 rounded w-full"
            placeholder="Texte de la page d'accueil"
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
                    updated_at:
                      new Date(),
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
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Mettre à jour
          </button>

        </div>

      )}

      {/* Annonce */}
      {profil.role === "admin" && (

        <div className="mt-10 p-4 border rounded bg-gray-50">

          <h3 className="text-xl font-semibold mb-2">
            📢 Envoyer une notification d'annonce importante (du président)
          </h3>

          <input
            type="text"
            className="border p-2 rounded w-full"
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
                    updated_at:
                      new Date(),
                  })
                  .eq("id", 6)
                  .select()
                  .single();

              if (!error) {
                alert(
                  "✅ Annonce envoyée !"
                );
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
                      `📢 Nouvelle annonce du Président`,
                    body: `${globalAnnonce}`,
                    url: "/parties",
                  }),
                }
              );

            }}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Envoyer la notification
          </button>

        </div>

      )}

      {/* Supprimer mon compte */}
      <div className="mt-10 border-t pt-6">

        <button
          onClick={handleDeleteAccount}
          className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Supprimer mon compte
        </button>

      </div>

      {zoomOpen && (

        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">

          {/* Bouton X pour fermer */}
          <button
            onClick={() =>
              setZoomOpen(false)
            }
            className="absolute top-5 right-5 text-white text-3xl font-bold cursor-pointer hover:scale-110 transition"
          >
            ×
          </button>

          {/* Image zoomée */}
          <img
            src={globalImageUrl}
            alt="Zoom"
            className="max-w-[90%] max-h-[90%] rounded-lg shadow-lg animate-zoom"
          />

        </div>

      )}

    </div>
  );
}