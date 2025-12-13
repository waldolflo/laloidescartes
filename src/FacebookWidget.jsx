// src/FacebookWidget.jsx
import { useEffect } from "react";

export default function FacebookWidget() {
  useEffect(() => {
    // Charger le SDK si nécessaire
    if (!window.FB) {
      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.src = "https://connect.facebook.net/fr_FR/sdk.js#xfbml=1&version=v18.0";
      document.body.appendChild(script);

      script.onload = () => {
        if (window.FB) {
          window.FB.XFBML.parse();
        }
      };
    } else {
      window.FB.XFBML.parse();
    }
  }, []);

  return (
    <div
      className="fb-page"
      data-href="https://www.facebook.com/LaLoidesCartes"
      data-tabs="timeline"
      data-width="500"
      data-height="600"
      data-small-header="false"
      data-adapt-container-width="true"
      data-hide-cover="false"
      data-show-facepile="true"
    />
  );
}
