import React from "react";
import CountUp from "react-countup";
import { Phone, Mail } from "lucide-react";
import FacebookWidget from "./FacebookWidget";
import DiaporamaSwiper from "./DiaporamaSwiper";

export default function HomePublicContent({
  stats,
  countSeanceTotal,
  countAdherentTotal,
  countFollowersFB,
  messagePresident,
  planningImageUrl,
  setZoomOpen,
}) {
  return (
    <>
      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Création de l'asso", value: "2021", color: "text-black-600" },
          { label: "Jeux", value: stats.jeux, color: "text-yellow-600" },
          ...(countSeanceTotal > 0
            ? [{ label: "Après-midi et soirées jeux", value: countSeanceTotal, color: "text-purple-600" }]
            : []),
          ...(countAdherentTotal > 0
            ? [{ label: "Adhérents de l'asso de 7 à 73 ans", value: countAdherentTotal, color: "text-pink-600" }]
            : []),
          //{ label: "Après-midi et soirées jeux", value: stats.rencontres, color: "text-teal-600" },
          { label: "Parties organisées via l'App", value: stats.parties, color: "text-green-600" },
          { label: "Heures de jeu organisées via l'App", value: stats.heures, color: "text-orange-600" },
          { label: "Adhérents sur l'App", value: stats.membres, color: "text-rose-600" },
          ...(countFollowersFB > 0
            ? [{ label: "Followers Facebook", value: countFollowersFB, color: "text-blue-600" }]
            : [])
        ].map((stat) => (
          <div key={stat.label} className="p-6 bg-white rounded shadow hover:shadow-lg transition text-center">
            <h2 className={`text-3xl font-bold ${stat.color}`}>
              <CountUp end={stat.value} duration={1.5} separator="" />
            </h2>
            <p className="text-gray-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* MOT DU PRESIDENT + PLANNING + FACEBOOK */}
      {(messagePresident || planningImageUrl ) && (
        <section className="mb-12 p-6 bg-blue-50 rounded shadow">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* COLONNE GAUCHE — Président */}
            {messagePresident && (
              <div className="flex flex-col">
                <p className="text-gray-700 text-center">{messagePresident}</p>

                {/* Boutons d'action */}
                <div className="mt-4 flex flex-wrap gap-3 justify-center">
                  <a
                    href="https://www.facebook.com/LaLoidesCartes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition text-center"
                  >
                    Nos actualités sur Facebook
                  </a>

                  <a
                    href="https://www.helloasso.com/associations/la-loi-des-cartes/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition text-center"
                  >
                    Adhérer en ligne sur HelloAsso
                  </a>
                </div>
                <div className="text-center mt-6">
                  <img
                  src="https://laloidescartes.my.canva.site/_assets/media/40f2fc69c9e39fdbb5063c9d0f32cab8.jpg"
                  alt="partenaires"
                  className="rounded-xl shadow-md max-h-80 object-contain"
                  />
                </div>
              </div>
            )}

            {/* COLONNE CENTRALE — Planning */}
            {planningImageUrl && (
              <div className="flex justify-center">
                <img
                  src={planningImageUrl}
                  alt="Planning des prochaines rencontres"
                  onClick={() => setZoomOpen(true)}
                  className="max-h-80 object-contain rounded cursor-pointer hover:scale-105 transition-transform"
                />
              </div>
            )}

            {/* COLONNE DROITE — Facebook */}
            <div className="w-full flex justify-center">
              <FacebookWidget />
            </div>

          </div>
        </section>
      )}

      {/* --- Section TARIFS --- */}
      <section className="mt-12 bg-white rounded-xl shadow-md p-6 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
          TARIFS & ADHÉSION
        </h2>
        <p className="text-center text-gray-600 mb-6">
          🎟️ Venez découvrir gratuitement, puis <strong>2€ / séance</strong> pour les non-adhérents.
        </p>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Texte */}
          <div className="space-y-4 text-gray-700">
            <h3 className="text-xl font-semibold">Adhésion à l’année</h3>


            <ul className="space-y-2">
              <li>🎲 <strong>Individuelle</strong> : 20€</li>
              <li>🎲 <strong>Duo</strong> : 35€</li>
              <li>🎲 <strong>Famille</strong> (min. 4) : 60€</li>
            </ul>

            <p className="mt-4">
              💸 <strong>10% de remise</strong> sur les jeux de société dans les boutiques partenaires.
            </p>

            <div className="mt-4">
              <a
                href="https://www.lantre.eu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 hover:opacity-80 transition"
              >
                <img
                  src="https://www.lantre.eu/wp-content/uploads/2017/06/logo-lantre-07-1.png"
                  alt="L’Antre du Jouet"
                  className="h-12 object-contain"
                />
                <span className="text-sm text-gray-600">Boutique partenaire</span>
              </a>
            </div>

            <p className="mt-6">
              ✅ <strong>Accès illimité</strong> aux séances du club
            </p>
          </div>

          {/* Illustration */}
          <div className="flex justify-center">
            <img
              src="https://laloidescartes.my.canva.site/_assets/media/5f69b9aa7a56910fe6138d919c8214ee.jpg"
              alt="Illustration jeux de société"
              className="rounded-xl shadow-md max-h-80 object-contain"
            />
          </div>
        </div>
      </section>
      {/* DiaporamaSwiper */}
      <section className="mt-12 bg-white rounded-xl shadow-md">
        <DiaporamaSwiper />
      </section>
      {/* --- Section ADRESSE & CARTE --- */}
      <section className="mt-12 bg-slate-800 text-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 md:p-10">
          <h2 className="text-2xl font-bold text-center mb-8">Nous trouver</h2>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="space-y-6">
              <div>
                <p className="text-lg font-semibold">📍 Adresse</p>
                <p className="text-gray-300 mt-1">
                  2 Rue Albert Leroy<br />
                  62170 Neuville-sous-Montreuil
                </p>
              </div>

              <img
                src="https://laloidescartes.my.canva.site/_assets/media/e330db1ce4e0a769721d6668a95d40f4.png"
                alt="Lieu de l'association"
                className="rounded-lg shadow-md max-h-64 object-contain"
              />
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone size={20} className="text-rose-400" />
                  <span className="text-lg">06 44 17 10 82</span>
                </div>

                <div className="flex items-center gap-3">
                  <Mail size={20} className="text-rose-400" />
                  <a
                    href="mailto:laloidescartes@gmail.com"
                    className="text-lg hover:underline"
                  >
                    laloidescartes@gmail.com
                  </a>
                </div>
                <div className="w-full h-[300px] rounded-lg overflow-hidden">
                  <iframe
                    title="Carte Google Maps"
                    src="https://www.google.com/maps?q=2%20Rue%20Albert%20Leroy%2062170%20Neuville-sous-Montreuil&output=embed"
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
