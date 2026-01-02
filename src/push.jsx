// push.jsx
import { supabase } from "./supabaseClient";

/**
 * Clé VAPID publique
 */
export const VAPID_PUBLIC_KEY =
  "BFVHMHeoDyi581VvSfov-OkpyFmvFAC2VAjt7_AAvcBnwENNrLQ-fFNZjXZ8KBMlW3a7A4P_pys-xoS8IunF2WE";

/**
 * Types de notifications disponibles
 * ➜ extensible facilement
 */
export const NOTIFICATION_TYPES = {
  parties: "notif_parties",
  chat: "notif_chat",
  annonces: "notif_annonces",
  jeux: "notif_jeux",
};

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
 * Active un type de notification pour CE DEVICE
 */
export async function enablePushForDevice(userId, type) {
  if (!("Notification" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const subscription = await getOrCreatePushSubscription();
  if (!subscription) return false;

  const token = JSON.stringify(subscription);

  await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform: "web",
      [type]: true,
    },
    { onConflict: "token" }
  );

  return true;
}

/**
 * Désactive un type de notification pour CE DEVICE
 * ➜ supprime le token uniquement si TOUT est désactivé
 */
export async function disablePushForDevice(type) {
  if (!("serviceWorker" in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return true;

  const token = JSON.stringify(subscription);

  // Récupération de l’état actuel du device
  const { data: device, error } = await supabase
    .from("push_tokens")
    .select(
      "notif_parties, notif_chat, notif_annonces, notif_jeux"
    )
    .eq("token", token)
    .single();

  if (error || !device) return true;

  const updatedState = {
    notif_parties: device.notif_parties,
    notif_chat: device.notif_chat,
    notif_annonces: device.notif_annonces,
    notif_jeux: device.notif_jeux,
    [type]: false,
  };

  const allDisabled =
    !updatedState.notif_parties &&
    !updatedState.notif_chat &&
    !updatedState.notif_annonces &&
    !updatedState.notif_jeux;

  if (allDisabled) {
    // 🔥 plus aucune notification active → suppression du device
    await supabase
      .from("push_tokens")
      .delete()
      .eq("token", token);
  } else {
    // ✅ on garde le device avec les autres notifications
    await supabase
      .from("push_tokens")
      .update(updatedState)
      .eq("token", token);
  }

  return true;
}

/**
 * --- Wrappers pour compatibilité avec ton code actuel ---
 * (notifications de parties)
 */

export function enablePushForUser(userId) {
  return enablePushForDevice(userId, NOTIFICATION_TYPES.parties);
}

export function disablePushForUser() {
  return disablePushForDevice(NOTIFICATION_TYPES.parties);
}
