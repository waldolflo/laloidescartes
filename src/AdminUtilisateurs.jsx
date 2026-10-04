import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import AdminMenu from "./AdminMenu";

import {
  User,
  Users,
  ShieldCheck,
  Link2,
  Unlink2,
  X,
  RefreshCw,
  Check,
} from "lucide-react";

export default function AdminUtilisateurs({
  profil,
}) {
  const [allUsers, setAllUsers] = useState([]);
  const [allJoueurs, setAllJoueurs] = useState([]);

  const [rechercheUtilisateur, setRechercheUtilisateur] =
    useState("");

  const [ongletGestionUsers, setOngletGestionUsers] =
    useState("utilisateurs");

  const [chargement, setChargement] =
    useState(true);

  useEffect(() => {
    if (!profil || profil.role !== "admin") return;

    fetchUsers();
    fetchJoueurs();
  }, [profil]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profils")
      .select("id, nom, role")
      .order("nom", {
        ascending: true,
      });

    if (!error && data) {
      setAllUsers(data);
    }

    setChargement(false);
  };

  const fetchJoueurs = async () => {
    const { data, error } = await supabase
      .from("joueurs")
      .select(
        "id, nom, actif, utilisateur_id"
      )
      .order("nom", {
        ascending: true,
      });

    if (!error && data) {
      setAllJoueurs(data);
    }
  };

  const updateUserRole = async (
    userId,
    newRole
  ) => {
    const { data, error } = await supabase
      .from("profils")
      .update({
        role: newRole,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      alert(
        `❌ Impossible de modifier le rôle : ${error.message}`
      );
      return;
    }

    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? data : u
      )
    );
  };

  const updateJoueurUtilisateur = async (
    joueurId,
    utilisateurId
  ) => {
    const nouveauUtilisateurId =
      utilisateurId || null;

    const joueur = allJoueurs.find(
      (j) => j.id === joueurId
    );

    if (!joueur) return;

    if (
      nouveauUtilisateurId &&
      allJoueurs.some(
        (j) =>
          j.id !== joueurId &&
          j.utilisateur_id ===
            nouveauUtilisateurId
      )
    ) {
      alert(
        "❌ Ce vrai compte est déjà lié à un faux compte."
      );
      return;
    }

    const nomUtilisateur =
      allUsers.find(
        (u) =>
          u.id === nouveauUtilisateurId
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
        utilisateur_id:
          nouveauUtilisateurId,
      })
      .eq("id", joueurId)
      .select(
        "id, nom, actif, utilisateur_id"
      )
      .single();

    if (error) {
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

  if (!profil || profil.role !== "admin") {
    return <Navigate to="/profil" replace />;
  }

  if (chargement) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="max-w-[1600px] mx-auto">
          <AdminMenu profil={profil} />

          <div className="mt-6 flex justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        </div>
      </div>
    );
  }

  const utilisateursFiltres =
    allUsers.filter((u) =>
      (u.nom || "")
        .toLowerCase()
        .includes(
          rechercheUtilisateur.toLowerCase()
        )
    );

  const joueursFiltres =
    allJoueurs.filter((joueur) =>
      (joueur.nom || "")
        .toLowerCase()
        .includes(
          rechercheUtilisateur.toLowerCase()
        )
    );

  const nombreUtilisateursLies =
    allJoueurs.filter(
      (j) => j.utilisateur_id
    ).length;

  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        <AdminMenu profil={profil} />

        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-violet-50 to-indigo-50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>

                <div>
                  <h1 className="text-2xl font-black text-slate-900">
                    Gestion des utilisateurs
                  </h1>

                  <p className="text-sm text-slate-500">
                    Comptes réels, faux comptes et rôles
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-2 rounded-xl bg-white border border-blue-200 text-blue-700 text-sm font-semibold">
                  👤 {allUsers.length} utilisateur
                  {allUsers.length > 1 ? "s" : ""}
                </span>

                <span className="px-3 py-2 rounded-xl bg-white border border-amber-200 text-amber-700 text-sm font-semibold">
                  🎭 {allJoueurs.length} faux compte
                  {allJoueurs.length > 1 ? "s" : ""}
                </span>

                <span className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-sm font-semibold">
                  🔗 {nombreUtilisateursLies} lié
                  {nombreUtilisateursLies > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">

            {/* RECHERCHE */}
            <div className="mb-5 relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

              <input
                type="text"
                value={rechercheUtilisateur}
                onChange={(e) =>
                  setRechercheUtilisateur(
                    e.target.value
                  )
                }
                placeholder="Rechercher un utilisateur ou un faux compte..."
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition"
              />

              {rechercheUtilisateur && (
                <button
                  type="button"
                  onClick={() =>
                    setRechercheUtilisateur("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ONGLETS */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6">

              <button
                type="button"
                onClick={() =>
                  setOngletGestionUsers(
                    "utilisateurs"
                  )
                }
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                  ongletGestionUsers ===
                  "utilisateurs"
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                <User className="w-4 h-4" />

                Utilisateurs

                <span className="px-2 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700">
                  {allUsers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setOngletGestionUsers(
                    "joueurs"
                  )
                }
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                  ongletGestionUsers === "joueurs"
                    ? "bg-white text-amber-700 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                🎭

                Faux comptes

                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                  {allJoueurs.length}
                </span>
              </button>
            </div>

            {/* UTILISATEURS */}
            {ongletGestionUsers ===
              "utilisateurs" && (
              <div className="space-y-3">

                {utilisateursFiltres.length ===
                0 ? (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center">
                    <User className="w-10 h-10 mx-auto mb-3 text-slate-300" />

                    <p className="font-semibold text-slate-600">
                      Aucun utilisateur trouvé
                    </p>
                  </div>
                ) : (
                  utilisateursFiltres.map((u) => {
                    const isCurrentAdmin =
                      u.id === profil.id;

                    const isAdminUser =
                      u.role === "admin";

                    const fauxCompteLie =
                      allJoueurs.find(
                        (j) =>
                          j.utilisateur_id ===
                          u.id
                      );

                    return (
                      <div
                        key={u.id}
                        className="rounded-2xl border border-slate-200 bg-white hover:border-violet-200 hover:shadow-lg transition overflow-hidden"
                      >
                        <div className="p-4 md:p-5">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                                <User className="w-5 h-5 text-violet-600" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-bold text-slate-900 truncate">
                                    {u.nom ||
                                      "Sans nom"}
                                  </p>

                                  {isCurrentAdmin && (
                                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                                      Moi
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-400 mt-0.5 break-all">
                                  {u.id}
                                </p>
                              </div>
                            </div>

                            <div className="lg:w-56">
                              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Rôle
                              </label>

                              {isCurrentAdmin ||
                              isAdminUser ? (
                                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-100 text-violet-700 font-semibold text-sm">
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
                                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700"
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

                            <div className="lg:w-64">
                              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Faux compte lié
                              </label>

                              {fauxCompteLie ? (
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-sm">
                                  <Link2 className="w-4 h-4" />

                                  <span className="truncate">
                                    {
                                      fauxCompteLie.nom
                                    }
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-sm">
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

            {/* FAUX COMPTES */}
            {ongletGestionUsers ===
              "joueurs" && (
              <div className="space-y-3">

                {joueursFiltres.map(
                  (joueur) => {
                    const compteLie =
                      allUsers.find(
                        (u) =>
                          u.id ===
                          joueur.utilisateur_id
                      );

                    return (
                      <div
                        key={joueur.id}
                        className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 overflow-hidden"
                      >
                        <div className="p-4 md:p-5">

                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-xl">
                                🎭
                              </div>

                              <div>
                                <p className="font-bold text-amber-900">
                                  {joueur.nom}
                                </p>

                                <p className="text-xs text-amber-700/70 mt-1">
                                  ID : {joueur.id}
                                </p>

                                {!joueur.actif && (
                                  <span className="inline-flex mt-2 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                                    Inactif
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="lg:w-80">
                              <label className="block text-xs font-semibold text-amber-800 mb-1.5">
                                Compte utilisateur associé
                              </label>

                              <select
                                value={
                                  joueur.utilisateur_id ||
                                  ""
                                }
                                onChange={(e) =>
                                  updateJoueurUtilisateur(
                                    joueur.id,
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2.5 rounded-xl border border-amber-200 bg-white text-slate-700 font-medium"
                              >
                                <option value="">
                                  -- Aucun compte lié --
                                </option>

                                {allUsers.map(
                                  (u) => (
                                    <option
                                      key={u.id}
                                      value={u.id}
                                      disabled={allJoueurs.some(
                                        (j) =>
                                          j.id !==
                                            joueur.id &&
                                          j.utilisateur_id ===
                                            u.id
                                      )}
                                    >
                                      {u.nom}
                                      {u.id ===
                                      profil.id
                                        ? " (moi)"
                                        : ""}
                                      {u.id ===
                                      joueur.utilisateur_id
                                        ? " ✓"
                                        : ""}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                          </div>

                          <div className="mt-4 pt-4 border-t border-amber-200">
                            {compteLie ? (
                              <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-700">
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 font-semibold">
                                  <Link2 className="w-4 h-4" />
                                  Lié à {compteLie.nom}
                                </span>

                                <span className="text-slate-500">
                                  Les anciennes parties et statistiques sont rattachées à ce compte.
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 border border-amber-200 text-amber-700 text-sm">
                                <Unlink2 className="w-4 h-4" />
                                Ce faux compte n'est lié à aucun compte utilisateur
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {/* ROLES */}
            <div className="mt-8 rounded-2xl bg-slate-50 border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-5">
                <ShieldCheck className="w-5 h-5 text-violet-600" />

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
                  <strong>User</strong>
                  <span className="text-slate-600">
                    {" "} : peut uniquement s'inscrire/se désinscrire à une partie
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <strong>Membre</strong>
                  <span className="text-slate-600">
                    {" "} : User + peut organiser des parties et pour ses propres parties : les modifier & supprimer et ajouter des inscrits, gérer le classement et les scores
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <strong>Ludo</strong>
                  <span className="text-slate-600">
                    {" "} : Membre + peut ajouter des jeux à la Ludothèque et pour ses propres jeux : les modifier
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <strong>Ludoplus</strong>
                  <span className="text-slate-600">
                    {" "} : Ludo + peut modifier tous les jeux de la Ludothèque
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
                  <strong className="text-violet-900">
                    Admin
                  </strong>

                  <span className="text-violet-800">
                    {" "} : Ludoplus + peut gérer les rôles des Utilisateurs + peut gérer le classement et les scores de toutes les parties archivées ainsi qu'y ajouter des inscrits
                  </span>
                </div>

              </div>

              <div className="mt-6 pt-5 border-t border-slate-200">
                <p className="font-semibold text-slate-800 mb-3">
                  Tous les utilisateurs peuvent par défaut (en fonction de leurs rôles) :
                </p>

                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    Modifier les jeux qu'ils ajoutent eux-mêmes dans la Ludothèque
                  </li>

                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    Pour les parties qu'ils organisent : modifier/supprimer les parties
                  </li>

                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    Pour les parties qu'ils organisent : ajouter de nouveaux inscrits
                  </li>

                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    Pour les parties qu'ils organisent : gérer le classement et les scores
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}