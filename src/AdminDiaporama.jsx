import React from "react";
import { Navigate, Link } from "react-router-dom";
import {
  Images,
  ArrowRight,
} from "lucide-react";

import AdminMenu from "./AdminMenu";

export default function AdminDiaporama({
  profil,
}) {
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

        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Images className="w-6 h-6 text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  Gestion du diaporama
                </h1>

                <p className="text-sm text-slate-500">
                  Gère les images affichées sur la page d'accueil
                </p>
              </div>
            </div>

            <Link
              to="/images"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-slate-700 to-slate-900 text-white font-semibold shadow-lg hover:shadow-xl transition"
            >
              <Images className="w-4 h-4" />
              Gérer le Diaporama
              <ArrowRight className="w-4 h-4" />
            </Link>

          </div>
        </section>

      </div>
    </div>
  );
}