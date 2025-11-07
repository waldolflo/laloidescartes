import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Statistiques() {
const [monthlyStats, setMonthlyStats] = useState([]);
const [yearlyStats, setYearlyStats] = useState([]);

// Récupération des données depuis Supabase
useEffect(() => {
async function fetchStats() {
// Exemple : récupérer les utilisateurs + score/parties
const { data: users, error: userError } = await supabase
.from("profils")
.select("id, nom");
  if (userError) {  
    console.error(userError);  
    return;  
  }  

  const { data: parties, error: partiesError } = await supabase  
    .from("partie")  
    .select("id, user_id, score, rank, created_at");  

  if (partiesError) {  
    console.error(partiesError);  
    return;  
  }  

  // Transformation des données
  const now = new Date();  
  const currentMonth = now.getMonth() + 1;  
  const currentYear = now.getFullYear();  

  const statsByMonth = users.map(user => {  
    const userParties = parties.filter(p => p.user_id === user.id && new Date(p.created_at).getMonth() + 1 === currentMonth && new Date(p.created_at).getFullYear() === currentYear);  
    const totalScore = userParties.reduce((acc, p) => acc + p.score, 0);  
    const totalRank = userParties.reduce((acc, p) => acc + p.rank, 0);  
    return { nom: user.nom, score: totalScore, rank: totalRank, parties: userParties.length };  
  });  

  const statsByYear = users.map(user => {  
    const userParties = parties.filter(p => p.user_id === user.id && new Date(p.created_at).getFullYear() === currentYear);  
    const totalScore = userParties.reduce((acc, p) => acc + p.score, 0);  
    const totalRank = userParties.reduce((acc, p) => acc + p.rank, 0);  
    return { nom: user.nom, score: totalScore, rank: totalRank, parties: userParties.length };  
  });  

  setMonthlyStats(statsByMonth.sort((a, b) => b.score - a.score));  
  setYearlyStats(statsByYear.sort((a, b) => b.score - a.score));  
}  

fetchStats();

}, []);

const renderBars = (data) => {
const maxScore = Math.max(...data.map(d => d.score), 1);
return ( <div className="space-y-2">
{data.map(d => ( <div key={d.nom} className="flex items-center space-x-2"> <span className="w-32">{d.nom}</span> <div className="bg-gray-300 h-6 flex-1 rounded overflow-hidden">
<div className="bg-green-500 h-6 rounded" style={{ width: `${(d.score / maxScore) * 100}%` }}></div> </div> <span className="w-12 text-right">{d.score}</span> </div>
))} </div>
);
};

return ( <div className="p-6 space-y-10"> <h2 className="text-2xl font-bold">Statistiques Mensuelles</h2>
{renderBars(monthlyStats)}
  <h2 className="text-2xl font-bold mt-10">Statistiques Année</h2>  
  {renderBars(yearlyStats)}  
</div>  

);
}
