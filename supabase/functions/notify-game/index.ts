import { serve } from "https://deno.land/std/http/server.ts";
import webpush from "npm:web-push";

webpush.setVapidDetails(
  "mailto:contact@lebusmagique.fr",
  Deno.env.get("BFVHMHeoDyi581VvSfov-OkpyFmvFAC2VAjt7_AAvcBnwENNrLQ-fFNZjXZ8KBMlW3a7A4P_pys-xoS8IunF2WE")!,
  Deno.env.get("kwZBY36-WjsteMn9nITQApni0sm9uYik2ngbIWC11Gk")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const { userIds, title, body, url } = await req.json();

  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token")
    .in("user_id", userIds);

  for (const t of tokens || []) {
    await webpush.sendNotification(
      JSON.parse(t.token),
      JSON.stringify({ title, body, url })
    );
  }

  return new Response("ok");
});
