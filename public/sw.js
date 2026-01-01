self.addEventListener("push", function (event) {
  const data = event.data?.json() || {};

  const title = data.title || "Nouvelle notification";
  const options = {
    body: data.body,
    icon: "/notif-icon.png",
    badge: "/notif-badge.png",
    data: data.url || "/",
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
  console.log("[SW] Notification affichée avec options:", options);
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
