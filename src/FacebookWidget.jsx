// src/FacebookWidget.jsx
import React, { useEffect, useRef } from "react";

export default function FacebookWidget() {
  const containerRef = useRef(null);

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
        if (window.FB && containerRef.current) {
          window.FB.XFBML.parse(containerRef.current);
        }
      };
    } else if (containerRef.current) {
      window.FB.XFBML.parse(containerRef.current);
    }
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", maxWidth: "500px", margin: "0 auto" }}>
      <div
        className="fb-page"
        data-href="https://www.facebook.com/LaLoidesCartes"
        data-tabs="timeline"
        data-width="500"
        data-height=""
        data-small-header="false"
        data-adapt-container-width="true"
        data-hide-cover="false"
        data-show-facepile="true"
        style={{ width: "100%" }}
      />
    </div>
  );
}
