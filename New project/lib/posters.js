const staticPosters = {
  "dune-part-two": "https://upload.wikimedia.org/wikipedia/en/5/52/Dune_Part_Two_poster.jpeg",
  "fall-guy": "https://upload.wikimedia.org/wikipedia/en/1/1f/The_Fall_Guy_%282024%29_poster.jpg",
  "inside-out-2": "https://upload.wikimedia.org/wikipedia/en/f/f7/Inside_Out_2_poster.jpg",
  furiosa: "https://upload.wikimedia.org/wikipedia/en/3/34/Furiosa_A_Mad_Max_Saga.jpg",
  "poor-things": "https://upload.wikimedia.org/wikipedia/en/f/f3/Poor_Things_poster.jpg",
  interstellar: "https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg",
  "knives-out": "https://upload.wikimedia.org/wikipedia/en/1/1f/Knives_Out_poster.jpeg",
  "past-lives": "https://upload.wikimedia.org/wikipedia/en/d/da/Past_Lives_film_poster.png",
  "spider-verse": "https://upload.wikimedia.org/wikipedia/en/a/a0/Spider-Man_Beyond_the_Spider-Verse_logo.jpg",
  "laapataa-ladies": "https://upload.wikimedia.org/wikipedia/en/5/52/Laapataa_Ladies_poster.jpg",
  "12th-fail": "https://upload.wikimedia.org/wikipedia/en/f/f2/12th_Fail_poster.jpeg",
  "zindagi-na-milegi-dobara": "https://upload.wikimedia.org/wikipedia/en/1/17/Zindagi_Na_Milegi_Dobara.jpg",
  "yeh-jawaani-hai-deewani": "https://upload.wikimedia.org/wikipedia/en/1/15/Yeh_jawani_hai_deewani.jpg",
  andhadhun: "https://upload.wikimedia.org/wikipedia/en/4/47/Andhadhun_poster.jpg",
  kahaani: "https://upload.wikimedia.org/wikipedia/en/f/f2/Kahaani_poster.jpg",
  "3-idiots": "https://upload.wikimedia.org/wikipedia/en/d/df/3_idiots_poster.jpg",
  "rocky-aur-rani": "https://upload.wikimedia.org/wikipedia/en/6/65/Rocky_Aur_Rani_Ki_Prem_Kahani.jpg",
  kill: "https://upload.wikimedia.org/wikipedia/en/7/7b/Kill_poster.jpeg",
  "queen-gambit": "https://upload.wikimedia.org/wikipedia/en/1/12/The_Queen%27s_Gambit_%28miniseries%29.png",
  "stranger-things": "https://upload.wikimedia.org/wikipedia/en/b/be/Stranger_Things_season_5.jpeg",
  bridgerton: "https://upload.wikimedia.org/wikipedia/en/3/3d/Bridgerton_Title_Card.png",
  "three-body-problem": "https://upload.wikimedia.org/wikipedia/commons/0/0a/3_Body_Problem_title_card.png",
  "the-bear": "https://upload.wikimedia.org/wikipedia/commons/d/d7/The_Bear_Title_Card.jpg",
  shogun: "https://upload.wikimedia.org/wikipedia/en/b/b6/Sh%C5%8Dgun_%282024_miniseries%29_poster.jpg",
  "sacred-games": "https://upload.wikimedia.org/wikipedia/en/7/7a/Sacred_Games_Title.png"
};

function buildFallbackPoster(item) {
  const colors = item.palette || ["#1f2f46", "#7aa7ff", "#10151d"];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${colors[0]}"/>
          <stop offset="50%" stop-color="${colors[1]}"/>
          <stop offset="100%" stop-color="${colors[2]}"/>
        </linearGradient>
      </defs>
      <rect width="600" height="900" fill="url(#g)"/>
      <rect x="36" y="36" width="528" height="828" rx="28" fill="rgba(0,0,0,0.16)" stroke="rgba(255,255,255,0.2)"/>
      <text x="60" y="120" fill="white" font-size="28" font-family="Segoe UI, Arial, sans-serif" letter-spacing="4">${item.industry || "CineMotion"}</text>
      <foreignObject x="60" y="180" width="480" height="500">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Segoe UI, Arial, sans-serif;color:white;font-size:56px;line-height:1.06;font-weight:700;">
          ${item.title}
        </div>
      </foreignObject>
      <text x="60" y="760" fill="rgba(255,255,255,0.88)" font-size="30" font-family="Segoe UI, Arial, sans-serif">${String(item.type || "").toLowerCase().includes("series") ? "WEB SERIES" : "MOVIE"}</text>
      <text x="60" y="810" fill="rgba(255,255,255,0.76)" font-size="24" font-family="Segoe UI, Arial, sans-serif">${item.year} • ${item.language}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function enrichItemsWithPosters(items) {
  return items.map((item) => ({
    ...item,
    poster: staticPosters[item.id] || buildFallbackPoster(item)
  }));
}

module.exports = {
  enrichItemsWithPosters
};
