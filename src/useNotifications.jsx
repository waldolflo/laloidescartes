import { useEffect, useRef, useState } from "react";

export default function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const originalTitle = useRef(document.title);

  // Ajouter une notification browser
  const notifyBrowser = (title, body) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification(title, { body });
        }
      });
    }
  };

  // Quand on reçoit un nouveau message hors focus
  const newMessage = (message, isMention = false) => {
    if (document.hidden || isMention) {
      setUnreadCount((c) => c + 1);
      notifyBrowser(
        isMention ? `Mention @${message.user_name}` : "Nouveau message",
        message.content
      );
    }
  };

  // Reset badge quand focus
  useEffect(() => {
    const handleFocus = () => {
      setUnreadCount(0);
      document.title = originalTitle.current;
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Mettre à jour le titre
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitle.current}`;
    }
  }, [unreadCount]);

  return { newMessage };
}
