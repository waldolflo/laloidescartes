import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function Statistiques() {
const [monthlyStats, setMonthlyStats] = useState([]);
const [yearlyStats, setYearlyStats] = useState([]);
const [generalStats, setGeneralStats] = useState({ totalParties: 0, mostPlayedGame: "" });
const [generalRanking, setGeneralRanking] = useState([]);

useEffect(() => {
async function fetchStats() {
const { data: parties, error: partiesError } = await supabase.from("parties").select("id, jeu_id, utilisateur_id, date_partie, heure_partie");

if (partiesError) return console.error(partiesError);

  const { data: jeux, error: jeuxError } = await supabase.from("jeux").select("id, nom");  
  if (jeuxError) return console.error(jeuxError);  

  const { data: users, error: userError } = await supabase.from("profils").select("id, nom");  
  if (userError) return console.error(userError);  

  const { data: inscriptions, error: inscriptionsError } = await supabase.from("inscriptions").select("partie_id, utilisateur_id, rank");  
  if (inscriptionsError) return console.error(inscriptionsError);  

  const now = new Date();  
  const currentMonth = now.getMonth() + 1;  
  const currentYear = now.getFullYear();  

  const calculatePoints = (userParties) => {  
    return userParties.reduce((acc, p) => {  
      const ins = inscriptions.find(i => i.partie_id === p.id && i.utilisateur_id === p.utilisateur_id);  
      if (!ins) return acc;  
      if (ins.rank === 1) return acc + 3;  
      if (ins.rank === 2) return acc + 2;  
      if (ins.rank === 3) return acc + 1;  
      return acc;  
    }, 0);  
  };  

  // --- Statistiques mensuelles ---  
  const statsByMonth = users.map(user => {  
    const userParties = parties.filter(p => p.utilisateur_id === user.id && new Date(p.date_partie).getMonth() + 1 === currentMonth && new Date(p.date_partie).getFullYear() === currentYear);  
    const points = calculatePoints(userParties);  
    return { nom: user.nom, points };  
  });  

  // --- Statistiques annuelles ---  
  const statsByYear = users.map(user => {  
    const userParties = parties.filter(p => p.utilisateur_id === user.id && new Date(p.date_partie).getFullYear() === currentYear);  
    const points = calculatePoints(userParties);  
    return { nom: user.nom, points };  
  });  

  setMonthlyStats(statsByMonth.sort((a, b) => b.points - a.points));  
  setYearlyStats(statsByYear.sort((a, b) => b.points - a.points));  

  // --- Statistiques générales ---  
  const totalParties = parties.length;  
  const gameCounts = parties.reduce((acc, p) => { acc[p.jeu_id] = (acc[p.jeu_id] || 0) + 1; return acc; }, {});  
  const mostPlayedGameId = Object.keys(gameCounts).reduce((a, b) => gameCounts[a] > gameCounts[b] ? a : b, null);  
  const mostPlayedGame = jeux.find(j => j.id === mostPlayedGameId)?.nom || "";  
  setGeneralStats({ totalParties, mostPlayedGame });  

  // --- Classement général par points de rank ---  
  const pointsByUser = {};  
  inscriptions.forEach(ins => {  
    if (!pointsByUser[ins.utilisateur_id]) pointsByUser[ins.utilisateur_id] = 0;  
    if (ins.rank === 1) pointsByUser[ins.utilisateur_id] += 3;  
    else if (ins.rank === 2) pointsByUser[ins.utilisateur_id] += 2;  
    else if (ins.rank === 3) pointsByUser[ins.utilisateur_id] += 1;  
  });  

  const ranking = users.map(user => ({ nom: user.nom, points: pointsByUser[user.id] || 0 }));  
  setGeneralRanking(ranking.sort((a, b) => b.points - a.points));  
}  

fetchStats();  

}, []);

const renderBars = (data) => {
  const maxValue = Math.max(...data.map(d => d.points), 1);
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.nom} className="flex items-center space-x-2">
          <span className="w-32">{d.nom}</span>
          <div className="bg-gray-300 h-6 flex-1 rounded overflow-hidden">
            <div
              className="bg-green-500 h-6 rounded"
              style={{ width: `${(d.points / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="w-12 text-right">{d.points}</span>
        </div>
      ))}
    </div>
  );
};

return (
  <div>
    <h2 className="text-2xl font-bold mt-10">Statistiques Générales</h2>
    <p>Nombre total de parties : {generalStats.totalParties}</p>
    <p>Jeu le plus joué : {generalStats.mostPlayedGame}</p>

        <h2 className="text-2xl font-bold mt-10">Classement Général (points par rank)</h2>  
        {renderBars(generalRanking)}  

        <h2 className="text-2xl font-bold mt-10">Statistiques Mensuelles (points par rank)</h2>  
        {renderBars(monthlyStats)}  

        <h2 className="text-2xl font-bold mt-10">Statistiques Année (points par rank)</h2>  
        {renderBars(yearlyStats)}  
      </div>

);
}