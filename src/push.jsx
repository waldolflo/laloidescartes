const VAPID_PUBLIC_KEY = "BFVHMHeoDyi581VvSfov-OkpyFmvFAC2VAjt7_AAvcBnwENNrLQ-fFNZjXZ8KBMlW3a7A4P_pys-xoS8IunF2WE";
export async function getPushToken() {
  if (!("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY,
  });

  return JSON.stringify(subscription);
}
