import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { motion } from "framer-motion";
import "./Statistiques.css"; // ton fichier de styles

// Mock data
const monthlyData = [
{ id: 1, name: "Alice", score: 1200, change: +3 },
{ id: 2, name: "Bob", score: 1100, change: -1 },
{ id: 3, name: "Charlie", score: 950, change: +2 },
{ id: 4, name: "David", score: 900, change: 0 },
{ id: 5, name: "Eve", score: 850, change: -2 },
];

const yearlyData = [
{ id: 1, name: "Alice", score: 14500, change: +1 },
{ id: 2, name: "Charlie", score: 14000, change: +2 },
{ id: 3, name: "Bob", score: 13500, change: -1 },
{ id: 4, name: "Eve", score: 12500, change: 0 },
{ id: 5, name: "David", score: 12000, change: -2 },
];

// Graph data
const monthlyScores = monthlyData.map(u => ({ name: u.name, score: u.score }));
const yearlyScores = yearlyData.map(u => ({ name: u.name, score: u.score }));

const Statistiques = () => {
const [period, setPeriod] = useState("monthly"); // monthly or yearly

const displayedData = period === "monthly" ? monthlyData : yearlyData;
const chartData = period === "monthly" ? monthlyScores : yearlyScores;

return ( <div className="stats-container"> <h1>Statistiques des utilisateurs</h1>

  <div className="period-buttons">
    <button className={period === "monthly" ? "active" : ""} onClick={() => setPeriod("monthly")}>Mois</button>
    <button className={period === "yearly" ? "active" : ""} onClick={() => setPeriod("yearly")}>Année</button>
  </div>

  <div className="leaderboard">
    <h2>Top 5 {period === "monthly" ? "du mois" : "de l'année"}</h2>
    {displayedData.map((user, index) => (
      <motion.div 
        key={user.id} 
        className={`leaderboard-item rank-${index+1}`}
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <span className="rank">{index + 1}</span>
        <span className="name">{user.name}</span>
        <span className="score">{user.score} pts</span>
        <span className={`change ${user.change > 0 ? "up" : user.change < 0 ? "down" : "neutral"}`}>
          {user.change > 0 ? `↑ ${user.change}` : user.change < 0 ? `↓ ${Math.abs(user.change)}` : "-"}
        </span>
      </motion.div>
    ))}
  </div>

  <div className="charts">
    <h2>Graphiques {period === "monthly" ? "mensuels" : "annuels"}</h2>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="score" fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>

    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>
);
};

export default Statistiques;