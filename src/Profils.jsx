import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; 
import { supabase } from "./supabaseClient";
import { Navigate } from "react-router-dom";
import {
  enablePushForDevice,
  disablePushForDevice,
} from "./push";

export default function Profils({ authUser, user, setProfilGlobal, setAuthUser, setUser }) {
  const [profil, setProfil] = useState(null);
  const [nom, setNom] = useState("");
  const [jeux, setJeux] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const SUPABASE_URL = "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/delete-user";
  const [globalImageUrl, setGlobalImageUrl] = useState("");
  const [globalTexte, setGlobalTexte] = useState("");
  const [globalcountFollowersFB, setGlobalcountFollowersFB] = useState("");
  const [globalcountAdherentTotal, setGlobalcountAdherentTotal] = useState("");
  const [globalcountSeanceavantdouzeS, setGlobalcountSeanceavantdouzeS] = useState("");
  const [zoomOpen, setZoomOpen] = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    notif_parties: false,
    notif_chat: false,
    notif_annonces: false,
    notif_jeux: false,
  });
  const [pushDevicesCount, setPushDevicesCount] = useState(0);
  const [testingNotif, setTestingNotif] = useState(false);

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

  const toggleNotif = async (key, value) => {
    if (!authUser) return;

    if (value === true) {
      // ✅ Création du token si nécessaire
      await enablePushForDevice(authUser.id, key);
    } else {
      // 🔥 Désactivation + suppression si tout est off
      await disablePushForDevice(key);
    }

    // 🔄 Rafraîchit l’état UI
    fetchNotifSettings();
    fetchPushDevicesCount();
  };

  const fetchNotifSettings = async () => {
    if (!authUser) return;

    // 🔑 récupérer la subscription du device courant
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    // 🧼 Aucun token pour ce device → tout à false
    if (!subscription) {
      setNotifSettings({
        notif_parties: false,
        notif_chat: false,
        notif_annonces: false,
        notif_jeux: false,
      });
      return;
    }

    const token = JSON.stringify(subscription);

    const { data, error } = await supabase
      .from("push_tokens")
      .select("notif_parties, notif_chat, notif_annonces, notif_jeux")
      .eq("token", token)
      .single();

    if (error || !data) {
      // 🧼 token inconnu → device non encore enregistré
      setNotifSettings({
        notif_parties: false,
        notif_chat: false,
        notif_annonces: false,
        notif_jeux: false,
      });
      return;
    }

    // ✅ préférences DU DEVICE
    setNotifSettings({
      notif_parties: !!data.notif_parties,
      notif_chat: !!data.notif_chat,
      notif_annonces: !!data.notif_annonces,
      notif_jeux: !!data.notif_jeux,
    });
  };

  // ✅ Hooks toujours au même niveau
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
          const adjectives = ["Rapide", "Mystique", "Épique", "Fougueux", "Sombre", "Lumineux", "Vaillant", "Astucieux"];
          const creatures = ["Dragon", "Licorne", "Phoenix", "Ninja", "Pirate", "Viking", "Samouraï", "Gobelin"];
          const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomCreature = creatures[Math.floor(Math.random() * creatures.length)];
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
        // setGlobalImageUrl(updatedData.global_image_url || "");
        setNom(updatedData.nom);
        setProfilGlobal?.(updatedData);

        if (updatedData.role === "admin") {
          const { data: usersData } = await supabase
            .from("profils")
            .select("id, nom, role")
            .order("nom", { ascending: true });
          if (usersData) setAllUsers(usersData);
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
    fetchGlobalcountFollowersFB();
    fetchGlobalcountAdherentTotal();
    fetchGlobalcountSeanceavantdouzeS();
    fetchPushDevicesCount();
    fetchNotifSettings();
  }, [authUser, setProfilGlobal]);

  const testNotification = async () => {
    try {
      setTestingNotif(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

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
            tokens: [token], // 👈 device courant uniquement
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
    if (!error) setAllUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
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

  // ✅ Redirections après les hooks
  if (!authUser) return <Navigate to="/auth" replace />;
  if (!profil) return <div className="text-center mt-10">Chargement du profil...</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        {/* Bloc Nom + Rôle */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">Mon profil</h2>

          {/* Prénom */}
          <div className="mb-3">
            <label className="block font-medium mb-1">Prénom :</label>
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

          <p className="font-medium mt-1"><strong>Rôle :</strong> {profil.role}</p>
        </div>
      </div>

      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">🔔 Notifications</h3>

        {[
          { key: "notif_parties", label: "🎲 Nouvelles parties" },
          { key: "notif_chat", label: "💬 Messages du chat" },
          { key: "notif_annonces", label: "📢 Annonces importantes" },
          { key: "notif_jeux", label: "🆕 Nouveaux jeux ajoutés à la ludothèque" },
        ].map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center justify-between py-2 cursor-pointer"
          >
            <span>{label}</span>
            <input
              type="checkbox"
              checked={notifSettings[key]}
              onChange={(e) => toggleNotif(key, e.target.checked)}
              className="w-5 h-5"
            />
          </label>
        ))}

        <p className="text-sm text-gray-600 mt-3">
          {pushDevicesCount} device
          {pushDevicesCount > 1 ? "s" : ""} actif
          {pushDevicesCount > 1 ? "s" : ""}.  
          <br />
          Chaque appareil peut avoir ses propres préférences.
        </p>

        <button
          onClick={testNotification}
          disabled={!notifSettings.notif_parties || testingNotif}
          className={`mt-3 px-4 py-2 rounded text-white ${
            testingNotif || !notifSettings.notif_parties
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {testingNotif ? "Envoi en cours..." : "Tester la notification"}
        </button>
      </div>

      {profil.role === "user" && (
        <p><strong>N'hésitez pas à vous manifester dans le tchat de l'accueil ou sur messenger si vous souhaitez obtenir des droits supplémentaire sur l'application comme ceux d'organiser des parties ou d'ajouter des jeux à la ludothèque</strong></p>
      )}

      {/* Jeux favoris */}
      <h3 className="text-xl font-semibold mt-6 mb-2">
        🎲 Les jeux auxquels j'aimerais jouer
      </h3>

      {[1, 2].map((n) => {
        const selectedId = profil[`jeufavoris${n}`];
        const jeu = jeux.find((j) => j.id === selectedId);

        return (
          <div key={n} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <label className="block font-medium mb-1">
              Jeu favori {n} :
            </label>

            <select
              value={selectedId || ""}
              onChange={(e) =>
                updateFavoris(`jeufavoris${n}`, e.target.value)
              }
              className="border p-2 rounded w-full"
            >
              <option value="">-- Choisir un jeu --</option>
              {jeux.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nom}
                </option>
              ))}
            </select>

            {jeu && (
              <div className="border rounded p-2 bg-white shadow sm:col-span-2">
                <p className="font-semibold">{jeu.nom}</p>
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

      {/* Gestion des utilisateurs pour admin */}
      {profil.role === "admin" && (
        <div className="mt-10">
          <h3 className="text-xl font-semibold mb-4">Gestion des utilisateurs</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-2">Nom</th>
                <th className="border border-gray-300 p-2">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u) => {
                const isCurrentAdmin = u.id === profil.id;
                const isAdminUser = u.role === "admin";
                return (
                  <tr key={u.id} className="text-center">
                    <td className="border border-gray-300 p-2">{u.nom}</td>
                    <td className="border border-gray-300 p-2">
                      {isCurrentAdmin || isAdminUser ? (
                        <span className="px-2 py-1 bg-gray-200 rounded">{u.role}</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            if (window.confirm(`Changer le rôle de ${u.nom} en "${newRole}" ?`)) {
                              updateUserRole(u.id, newRole);
                            } else e.target.value = u.role;
                          }}
                          className="border p-1 rounded"
                        >
                          <option value="fauxcompte">fauxcompte</option>
                          <option value="user">user</option>
                          <option value="membre">membre</option>
                          <option value="ludo">ludo</option>
                          <option value="ludoplus">ludoplus</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <h3 className="text-xl font-semibold mb-4">Rôles :</h3>
          <ul className="list-disc pl-5 mt-2">
            <li><span className="font-bold">User</span> : peut uniquement s'inscrire/se désinscrire à une partie</li>
            <li><span className="font-bold">Membre</span> : User + peut organiser des parties et <span className="font-semibold">pour ses propres parties</span> : les modifier & supprimer (pour les parties à venir) et ajouter des inscrits, gérer le classement et les scores (pour les parties archivées)</li>
            <li><span className="font-bold">Ludo</span> : Membre + peut ajouter des jeux à la Ludothèque et <span className="font-semibold">pour ses propres jeux</span> : les modifier</li>
            <li><span className="font-bold">Ludoplus</span> : Ludo + peut modifier tous les jeux de la Ludothèque</li>
            <li><span className="font-bold">Admin</span> : Ludoplus + peut gérer les rôles des Utilisateurs + peut gérer le classement et les scores de toutes les parties archivées ainsi qu'y ajouter des inscrits</li>
          </ul>
          <p className="mt-2">Tous les utilisateurs peuvent par défaut (en fonction de leurs rôles) :</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Modifier les jeux qu'ils ajoutent eux-mêmes dans la Ludothèque</li>
            <li>Pour les parties qu'ils organisent : Modifier/supprimer les parties</li>
            <li>Pour les parties qu'ils organisent : Ajouter de nouveaux inscrits (une fois la partie archivée)</li>
            <li>Pour les parties qu'ils organisent : Gérer le classement et les scores des inscrits (une fois la partie archivée)</li>
          </ul>
        </div>
      )}

      {profil.role === "admin" && (
        <div className="mt-10 p-4 border rounded bg-gray-50 flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold mb-2">🖼️ Gestion des images du diaporama d'accueil</h3>
            <Link
              to="/images"
              className="ml-4 bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300"
            >
              Gérer le Diaporama
            </Link>
          </div>
        </div>
      )}

      {profil.role === "admin" && (
        <div className="mt-10 p-4 border rounded bg-gray-50 flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2">🖼️ Planning des prochaines rencontres</h3>

            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="URL de l’image"
              value={globalImageUrl}
              onChange={(e) => setGlobalImageUrl(e.target.value)}
            />

            <button
              onClick={async () => {
                const { data, error } = await supabase
                  .from("settings")
                  .update({
                    global_image_url: globalImageUrl,
                    updated_at: new Date(),
                  })
                  .eq("id", 1)
                  .select()
                  .single();
                if (!error) {
                  alert("✅ Planning mis à jour !");
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
                className="w-32 h-32 object-contain border rounded shadow"
              />
            </div>
          )}
        </div>
      )}

      {profil.role === "admin" && (
        <div className="mt-10 p-4 border rounded bg-gray-50">
          <h3 className="text-xl font-semibold mb-2">🏛️ Texte de la page d'accueil</h3>

          <input
            type="text"
            className="border p-2 rounded w-full"
            placeholder="Texte de la page d'accueil"
            value={globalTexte}
            onChange={(e) => setGlobalTexte(e.target.value)}
          />

          <button
            onClick={async () => {
              const { data, error } = await supabase
                .from("settings")
                .update({
                  global_image_url: globalTexte,
                  updated_at: new Date(),
                })
                .eq("id", 2)
                .select()
                .single();
              if (!error) {
                alert("✅ Texte mis à jour !");
              }
            }}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Mettre à jour
          </button>
        </div>
      )}

      {profil.role === "admin" && (
        <div className="mt-10 p-4 border rounded bg-gray-50">
          <h3 className="text-xl font-semibold mb-2">✨ Followers FB</h3>

          <input
            type="text"
            className="border p-2 rounded w-full"
            placeholder="Texte de la page d'accueil"
            value={globalcountFollowersFB}
            onChange={(e) => setGlobalcountFollowersFB(e.target.value)}
          />

          <button
            onClick={async () => {
              const { data, error } = await supabase
                .from("settings")
                .update({
                  global_image_url: globalcountFollowersFB,
                  updated_at: new Date(),
                })
                .eq("id", 3)
                .select()
                .single();
              if (!error) {
                alert("✅ Followers FB mis à jour !");
              }
            }}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Mettre à jour
          </button>
        </div>
      )}

      {profil.role === "admin" && (
        <div className="mt-10 p-4 border rounded bg-gray-50">
          <h3 className="text-xl font-semibold mb-2">✨ Nombre d'adhérent au total</h3>

          <input
            type="text"
            className="border p-2 rounded w-full"
            placeholder="Texte de la page d'accueil"
            value={globalcountAdherentTotal}
            onChange={(e) => setGlobalcountAdherentTotal(e.target.value)}
          />

          <button
            onClick={async () => {
              const { data, error } = await supabase
                .from("settings")
                .update({
                  global_image_url: globalcountAdherentTotal,
                  updated_at: new Date(),
                })
                .eq("id", 4)
                .select()
                .single();
              if (!error) {
                alert("✅ Nombre d'adhérent Total mis à jour !");
              }
            }}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Mettre à jour
          </button>
        </div>
      )}

      {profil.role === "admin" && (
        <div className="mt-10 p-4 border rounded bg-gray-50">
          <h3 className="text-xl font-semibold mb-2">✨ Séances avant le 12 septembre 2025</h3>

          <input
            type="text"
            className="border p-2 rounded w-full"
            placeholder="Texte de la page d'accueil"
            value={globalcountSeanceavantdouzeS}
            onChange={(e) => setGlobalcountSeanceavantdouzeS(e.target.value)}
          />

          <button
            onClick={async () => {
              const { data, error } = await supabase
                .from("settings")
                .update({
                  global_image_url: globalcountSeanceavantdouzeS,
                  updated_at: new Date(),
                })
                .eq("id", 5)
                .select()
                .single();
              if (!error) {
                alert("✅ Nombre d'adhérent Total mis à jour !");
              }
            }}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Mettre à jour
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
            onClick={() => setZoomOpen(false)}
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
