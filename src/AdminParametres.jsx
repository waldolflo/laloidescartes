import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import AdminMenu from "./AdminMenu";

import {
  CalendarDays,
  Settings,
  Users,
  Gamepad2,
  Megaphone,
  Save,
  Send,
} from "lucide-react";

export default function AdminParametres({
  profil,
}) {
  const [globalImageUrl, setGlobalImageUrl] =
    useState("");

  const [globalTexte, setGlobalTexte] =
    useState("");

  const [globalAnnonce, setGlobalAnnonce] =
    useState("");

  const [
    globalcountFollowersFB,
    setGlobalcountFollowersFB,
  ] = useState("");

  const [
    globalcountAdherentTotal,
    setGlobalcountAdherentTotal,
  ] = useState("");

  const [
    globalcountSeanceavantdouzeS,
    setGlobalcountSeanceavantdouzeS,
  ] = useState("");

  useEffect(() => {
    if (!profil || profil.role !== "admin") return;

    fetchSettings();
  }, [profil]);

  const fetchSetting = async (id) => {
    const { data, error } =
      await supabase
        .from("settings")
        .select("global_image_url")
        .eq("id", id)
        .single();

    if (error || !data) {
      return "";
    }

    return data.global_image_url || "";
  };

  const fetchSettings = async () => {
    const [
      image,
      texte,
      annonce,
      followers,
      adherents,
      seances,
    ] = await Promise.all([
      fetchSetting(1),
      fetchSetting(2),
      fetchSetting(6),
      fetchSetting(3),
      fetchSetting(4),
      fetchSetting(5),
    ]);

    setGlobalImageUrl(image);
    setGlobalTexte(texte);
    setGlobalAnnonce(annonce);
    setGlobalcountFollowersFB(
      followers
    );
    setGlobalcountAdherentTotal(
      adherents
    );
    setGlobalcountSeanceavantdouzeS(
      seances
    );
  };

  const updateSetting = async (
    id,
    value,
    message
  ) => {
    const { error } = await supabase
      .from("settings")
      .update({
        global_image_url: value,
        updated_at: new Date(),
      })
      .eq("id", id);

    if (error) {
      alert(
        `❌ Impossible de mettre à jour : ${error.message}`
      );
      return false;
    }

    alert(`✅ ${message}`);

    return true;
  };

  const envoyerAnnonce = async () => {
    if (!globalAnnonce.trim()) {
      alert(
        "❌ Veuillez renseigner une annonce."
      );
      return;
    }

    const updated =
      await updateSetting(
        6,
        globalAnnonce,
        "Annonce enregistrée !"
      );

    if (!updated) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      alert(
        "❌ Impossible de récupérer la session."
      );
      return;
    }

    try {
      await fetch(
        "https://jahbkwrftliquqziwwva.supabase.co/functions/v1/notify-game",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type: "notif_annonces",
            title:
              "📢 Nouvelle annonce du Président",
            body: globalAnnonce,
            url: "/parties",
          }),
        }
      );

      alert(
        "✅ Notification envoyée !"
      );
    } catch (error) {
      console.error(error);

      alert(
        "⚠️ L'annonce est enregistrée mais l'envoi de la notification a échoué."
      );
    }
  };

  if (!profil || profil.role !== "admin") {
    return (
      <Navigate
        to="/profil"
        replace
      />
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        <AdminMenu profil={profil} />

        <div className="flex items-center gap-3 px-1">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-violet-700 flex items-center justify-center shadow-lg">
            <Settings className="w-5 h-5 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Paramètres de l'accueil
            </h1>

            <p className="text-sm text-slate-500">
              Configure les informations affichées sur la page d'accueil
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

              <h2 className="font-bold text-lg">
                Planning des prochaines rencontres
              </h2>
            </div>

            <input
              type="text"
              value={globalImageUrl}
              onChange={(e) =>
                setGlobalImageUrl(
                  e.target.value
                )
              }
              placeholder="URL de l’image"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-500 outline-none"
            />

            <button
              onClick={() =>
                updateSetting(
                  1,
                  globalImageUrl,
                  "Planning mis à jour !"
                )
              }
              type="button"
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold"
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
                      !e.currentTarget
                        .dataset
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

          {/* TEXTE */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>

              <h2 className="font-bold text-lg">
                Texte de la page d'accueil
              </h2>
            </div>

            <input
              type="text"
              value={globalTexte}
              onChange={(e) =>
                setGlobalTexte(
                  e.target.value
                )
              }
              placeholder="Texte de la page d'accueil"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50"
            />

            <button
              onClick={() =>
                updateSetting(
                  2,
                  globalTexte,
                  "Texte mis à jour !"
                )
              }
              type="button"
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold"
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

              <h2 className="font-bold text-lg">
                Followers Facebook
              </h2>
            </div>

            <input
              type="text"
              value={
                globalcountFollowersFB
              }
              onChange={(e) =>
                setGlobalcountFollowersFB(
                  e.target.value
                )
              }
              placeholder="Nombre de followers"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50"
            />

            <button
              onClick={() =>
                updateSetting(
                  3,
                  globalcountFollowersFB,
                  "Followers FB mis à jour !"
                )
              }
              type="button"
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold"
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

              <h2 className="font-bold text-lg">
                Nombre d'adhérents au total
              </h2>
            </div>

            <input
              type="text"
              value={
                globalcountAdherentTotal
              }
              onChange={(e) =>
                setGlobalcountAdherentTotal(
                  e.target.value
                )
              }
              placeholder="Nombre d'adhérents"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50"
            />

            <button
              onClick={() =>
                updateSetting(
                  4,
                  globalcountAdherentTotal,
                  "Nombre d'adhérents mis à jour !"
                )
              }
              type="button"
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold"
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

              <h2 className="font-bold text-lg">
                Séances avant le 12 septembre 2025
              </h2>
            </div>

            <input
              type="text"
              value={
                globalcountSeanceavantdouzeS
              }
              onChange={(e) =>
                setGlobalcountSeanceavantdouzeS(
                  e.target.value
                )
              }
              placeholder="Nombre de séances"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50"
            />

            <button
              onClick={() =>
                updateSetting(
                  5,
                  globalcountSeanceavantdouzeS,
                  "Nombre de séances mis à jour !"
                )
              }
              type="button"
              className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold"
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
                <h2 className="font-bold text-lg">
                  Envoyer une notification d'annonce importante
                </h2>

                <p className="text-sm text-slate-500">
                  L'annonce sera également envoyée par notification
                </p>
              </div>
            </div>

            <input
              type="text"
              value={globalAnnonce}
              onChange={(e) =>
                setGlobalAnnonce(
                  e.target.value
                )
              }
              placeholder="Annonce importante"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-red-500 outline-none"
            />

            <button
              onClick={envoyerAnnonce}
              type="button"
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold shadow-lg"
            >
              <Send className="w-4 h-4" />
              Envoyer la notification
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}