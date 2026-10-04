import React from "react";
import { Link, NavLink } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  CalendarDays,
  Images,
  Settings,
  User,
} from "lucide-react";

export default function AdminMenu({ profil }) {
  if (!profil || profil.role !== "admin") return null;

  const liens = [
    {
      to: "/admin/utilisateurs",
      label: "Utilisateurs",
      icon: Users,
    },
    {
      to: "/admin/evenements",
      label: "Événements",
      icon: CalendarDays,
    },
    {
      to: "/admin/diaporama",
      label: "Diaporama",
      icon: Images,
    },
    {
      to: "/admin/parametres",
      label: "Paramètres",
      icon: Settings,
    },
  ];

  return (
    <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-violet-950 via-indigo-900 to-blue-950">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-white/60">
              Administration
            </p>

            <h2 className="text-lg font-bold text-white">
              Gestion de l'application
            </h2>
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {liens.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-2">
          <Link
            to="/profil"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition"
          >
            <User className="w-4 h-4" />
            Retour à mon profil
          </Link>
        </div>
      </div>
    </section>
  );
}