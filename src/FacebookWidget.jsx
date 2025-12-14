// src/FacebookWidget.jsx
import React, { useEffect, useRef, useState } from "react";

export default function FacebookWidget() {
  const containerRef = useRef(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const FB_APP_ID = "1273958468100855"; // <-- Remplace par ton App ID si besoin

  useEffect(() => {
    // Vérifie si le SDK est déjà présent
    if (!window.FB) {
      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.src = `https://connect.facebook.net/fr_FR/sdk.js#xfbml=1&version=v18.0&appId=${FB_APP_ID}&autoLogAppEvents=1`;
      document.body.appendChild(script);

      script.onload = () => {
        if (window.FB) {
          window.FB.XFBML.parse(containerRef.current);
          setSdkLoaded(true);
        }
      };
    } else {
      // Parse uniquement si le SDK est déjà chargé
      window.FB.XFBML.parse(containerRef.current);
      setSdkLoaded(true);
    }
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", maxWidth: "500px", margin: "0 auto" }}>
      {sdkLoaded ? (
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
          style={{ width: "100%" }}
        />
      ) : (
        <p className="text-gray-500 text-center">Chargement du widget Facebook...</p>
      )}
    </div>
  );
}
