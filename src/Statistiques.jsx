import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Statistiques() {
const [monthlyStats, setMonthlyStats] = useState([]);
const [yearlyStats, setYearlyStats] = useState([]);

useEffect(() => {
async function fetchStats() {
// 1️⃣ Récupérer tous les utilisateurs
const { data: users, error: userError } = await supabase
.from("profils")
.select("id, nom");
if (userError) { console.error(userError); return; }

  // 2️⃣ Récupérer toutes les parties  
  const { data: parties, error: partiesError } = await supabase  
    .from("parties")  
    .select("id, jeu_id, utilisateur_id, date_partie, heure_partie");  
  if (partiesError) { console.error(partiesError); return; }  

  // 3️⃣ Récupérer toutes les inscriptions  
  const { data: inscriptions, error: inscriptionsError } = await supabase  
    .from("inscription")  
    .select("id, partie_id, utilisateur_id, created_at, rank, score");  
  if (inscriptionsError) { console.error(inscriptionsError); return; }  

  const now = new Date();  
  const currentMonth = now.getMonth() + 1;  
  const currentYear = now.getFullYear();  

  function computeStats(filterFn) {  
    return users.map(user => {  
      // filtrer les inscriptions de cet utilisateur selon la période  
      const userInscriptions = inscriptions.filter(i =>  
        i.utilisateur_id === user.id && filterFn(i)  
      );  
      const totalScore = userInscriptions.reduce((acc, i) => acc + i.score, 0);  
      const totalRank = userInscriptions.reduce((acc, i) => acc + i.rank, 0);  
      return {  
        nom: user.nom,  
        score: totalScore,  
        rank: totalRank,  
        parties: userInscriptions.length  
      };  
    }).sort((a, b) => b.score - a.score);  
  }  

  // Stats par mois  
  const statsByMonth = computeStats(i => {  
    const date = new Date(i.created_at);  
    return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;  
  });  

  // Stats par année  
  const statsByYear = computeStats(i => {  
    const date = new Date(i.created_at);  
    return date.getFullYear() === currentYear;  
  });  

  setMonthlyStats(statsByMonth);  
  setYearlyStats(statsByYear);  
}  

fetchStats();

}, []);

const renderBars = (data) => {
const maxScore = Math.max(...data.map(d => d.score), 1);
return ( <div className="space-y-2">
{data.map(d => ( <div key={d.nom} className="flex items-center space-x-2"> <span className="w-32">{d.nom}</span> <div className="bg-gray-300 h-6 flex-1 rounded overflow-hidden">
<div className="bg-green-500 h-6 rounded" style={{ width: `${(d.score / maxScore) * 100}%` }}></div> </div> <span className="w-12 text-right">{d.score}</span> <span className="w-12 text-right text-gray-600">{d.parties} parties</span> </div>
))} </div>
);
};

return ( <div className="p-6 space-y-10"> <h2 className="text-2xl font-bold">Statistiques Mensuelles</h2>
{renderBars(monthlyStats)}

```
  <h2 className="text-2xl font-bold mt-10">Statistiques Année</h2>  
  {renderBars(yearlyStats)}  
</div> 

);
}
