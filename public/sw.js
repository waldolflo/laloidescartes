self.addEventListener("push", function (event) {
  const data = event.data?.json() || {};

  const title = data.title || "Nouvelle notification";
  const options = {
    body: data.body,
    icon: "/logo_loidc.png",
    badge: "/logo_loidc_complet.png",
    data: data.url || "/",
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
