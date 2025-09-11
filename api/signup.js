// /api/signup.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  const { email, password } = req.body;
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ message: "Email de confirmation envoyé." });
}
