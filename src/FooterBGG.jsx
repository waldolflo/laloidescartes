import React from "react";

function FooterBGG() {
  return (
    <div className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-600">
      <a
        href="https://boardgamegeek.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:opacity-80 transition"
      >
        <img
          src="https://cf.geekdo-images.com/HZy35cmzmmyV9BarSuk6ug__small/img/gbE7sulIurZE_Tx8EQJXnZSKI6w=/fit-in/200x150/filters:strip_icc()/pic7779581.png"
          alt="BoardGameGeek logo"
          className="h-6"
        />
        <span>Données issues de BoardGameGeek</span>
      </a>
    </div>
  );
}

export default FooterBGG;