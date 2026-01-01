// push.jsx
import { supabase } from "./supabaseClient";

export const VAPID_PUBLIC_KEY =
  "BFVHMHeoDyi581VvSfov-OkpyFmvFAC2VAjt7_AAvcBnwENNrLQ-fFNZjXZ8KBMlW3a7A4P_pys-xoS8IunF2WE";

/**
 * Récupère ou crée la subscription du device courant
 */
export async function getOrCreatePushSubscription() {
  if (!("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY,
    });
  }

  return subscription;
}

/**
 * Active les notifications pour CE DEVICE
 */
export async function enablePushForUser(userId) {
  if (!("Notification" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const subscription = await getOrCreatePushSubscription();
  if (!subscription) return false;

  // 1️⃣ Sauvegarde du token device
  await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      token: JSON.stringify(subscription),
      platform: "web",
    },
    { onConflict: "token" }
  );

  // 2️⃣ Active notif_parties
  await supabase
    .from("profils")
    .update({ notif_parties: true })
    .eq("id", userId);

  return true;
}

/**
 * Désactive les notifications pour CE DEVICE
 */
export async function disablePushForUser(userId) {
  if (!("serviceWorker" in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await supabase
      .from("push_tokens")
      .delete()
      .eq("token", JSON.stringify(subscription));
  }

  await supabase
    .from("profils")
    .update({ notif_parties: false })
    .eq("id", userId);

  return true;
}
