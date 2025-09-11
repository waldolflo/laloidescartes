// /api/session.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method === "POST") {
    // Login
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(401).json({ error: error.message });

    // Créer profil si inexistant
    const { data: profilData, error: fetchError } = await supabase
      .from("profils")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      await supabase.from("profils").insert([
        {
          id: data.user.id,
          nom: "",
          role: "user",
          created_at: new Date().toISOString(),
        },
      ]);
    }

    // Obtenir le JWT
    const session = data.session;
    if (session) {
      res.setHeader("Set-Cookie", `sb-access-token=${session.access_token}; HttpOnly; Path=/; Max-Age=604800; Secure; SameSite=Lax`);
      return res.status(200).json({ user: data.user });
    }

    return res.status(500).json({ error: "Impossible de créer la session." });
  }

  if (req.method === "GET") {
    // Check session
    const token = req.cookies["sb-access-token"];
    if (!token) return res.status(401).json({ error: "Non connecté" });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) return res.status(401).json({ error: error.message });

    return res.status(200).json({ user });
  }

  if (req.method === "DELETE") {
    // Logout
    res.setHeader("Set-Cookie", `sb-access-token=; HttpOnly; Path=/; Max-Age=0; Secure; SameSite=Lax`);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Méthode non autorisée" });
}
