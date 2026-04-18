const { catalog, highlightPrompts } = require("./catalog");
const { enrichItemsWithPosters } = require("./posters");

const moodSignals = {
  "feel-good": ["feel good", "feel-good", "uplifting", "uplift", "happy", "light", "warm", "cheerful"],
  funny: ["funny", "laugh", "humor", "humour"],
  romantic: ["romantic", "romance", "love", "date night", "chemistry"],
  sad: ["sad", "cry", "tearjerker", "heartbreak", "melancholy"],
  dark: ["dark", "gritty", "serious", "moody", "raw"],
  spooky: ["spooky", "horror", "scary", "haunted", "creepy"],
  intense: ["intense", "high stakes", "adrenaline", "explosive", "tense"],
  cozy: ["cozy", "comfort", "soft", "easy watch", "relaxing"],
  inspirational: ["inspiring", "motivational", "hopeful", "motivating"],
  adventurous: ["adventure", "adventurous", "journey", "quest", "epic"],
  "mind-bending": ["mind bending", "mind-bending", "smart", "twist", "twisty", "cerebral", "complex"],
  stylish: ["stylish", "cool", "visual", "beautiful", "aesthetic"],
  nostalgic: ["nostalgic", "retro", "classic", "throwback"],
  family: ["family", "kids", "everyone", "all ages", "children"]
};

const genreSignals = {
  action: ["action"],
  adventure: ["adventure", "adventurous"],
  animation: ["animation", "animated", "anime"],
  comedy: ["comedy", "funny"],
  crime: ["crime", "gangster", "mafia"],
  drama: ["drama", "dramatic"],
  fantasy: ["fantasy", "magical"],
  history: ["history", "historical", "period"],
  horror: ["horror", "scary", "spooky"],
  mystery: ["mystery", "detective", "whodunit"],
  romance: ["romance", "romantic"],
  "sci-fi": ["sci fi", "sci-fi", "science fiction"],
  thriller: ["thriller", "thrilling", "suspense"],
  war: ["war", "battle"],
  sports: ["sports", "sport"]
};

const platformSignals = {
  netflix: ["netflix"],
  "prime video": ["prime video", "amazon prime", "prime"],
  "disney+": ["disney+", "disney plus", "hotstar"],
  "apple tv+": ["apple tv+", "apple tv"],
  hulu: ["hulu"],
  max: ["max", "hbo", "hbo max"]
};

const typeSignals = {
  movie: ["movie", "movies", "film", "films"],
  series: ["series", "show", "shows", "webseries", "web series", "tv series", "tv show"]
};

const industrySignals = {
  Bollywood: ["bollywood", "indian movie", "indian movies", "hindi movie", "hindi movies"],
  Indian: ["indian", "desi", "hindi"],
  Hollywood: ["hollywood", "english movie", "english movies"]
};

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMatches(text, signalMap) {
  const hits = [];

  for (const [key, signals] of Object.entries(signalMap)) {
    if (signals.some((signal) => text.includes(signal))) {
      hits.push(key);
    }
  }

  return hits;
}

function unique(values) {
  return [...new Set(values)];
}

function extractPreferences(input, history = []) {
  const text = normalize(input);
  const previousUserMessages = history
    .filter((entry) => entry.role === "user")
    .slice(-4)
    .map((entry) => normalize(entry.content))
    .join(" ");

  const genericFollowUp = /^(more|more please|another|another one|give me more|something else|next|more like that|show more)$/i.test(
    text
  );

  const effectiveText = genericFollowUp && previousUserMessages ? `${previousUserMessages} ${text}` : text;
  const industries = extractMatches(effectiveText, industrySignals);

  if (industries.includes("Bollywood") && !industries.includes("Indian")) {
    industries.push("Indian");
  }

  return {
    text: effectiveText,
    moods: extractMatches(effectiveText, moodSignals),
    genres: extractMatches(effectiveText, genreSignals),
    platforms: extractMatches(effectiveText, platformSignals),
    types: extractMatches(effectiveText, typeSignals),
    industries: unique(industries),
    latest: /\b(latest|new|recent|fresh)\b/.test(effectiveText),
    trending: /\b(trending|popular|best)\b/.test(effectiveText),
    shortRuntime: /\b(short|quick|not too long|under 2 hours|under two hours)\b/.test(effectiveText),
    longRuntime: /\b(long|epic length|long watch)\b/.test(effectiveText),
    yearMin: /\b(20\d{2}|19\d{2})\b/.test(effectiveText)
      ? Number(effectiveText.match(/\b(20\d{2}|19\d{2})\b/)[1])
      : /\b(latest|new|recent|fresh)\b/.test(effectiveText)
        ? 2023
        : null
  };
}

function scoreItem(item, preferences) {
  let score = item.rating;

  if (preferences.types.length) {
    if (preferences.types.includes("movie") && item.type === "movie") {
      score += 18;
    }
    if (preferences.types.includes("series") && item.type === "series") {
      score += 18;
    }
    if (preferences.types.includes("movie") && item.type === "series") {
      score -= 6;
    }
    if (preferences.types.includes("series") && item.type === "movie") {
      score -= 6;
    }
  }

  const genreHits = item.genres.filter((genre) => preferences.genres.includes(genre));
  const moodHits = item.moods.filter((mood) => preferences.moods.includes(mood));
  const platformHits = item.platforms.filter((platform) => preferences.platforms.includes(platform));
  const industryHits = preferences.industries.filter(
    (industry) => item.industry === industry || (industry === "Indian" && item.industry === "Bollywood")
  );

  score += genreHits.length * 14;
  score += moodHits.length * 12;
  score += platformHits.length * 14;
  score += industryHits.length * 16;

  if (preferences.genres.length > 1 && genreHits.length > 1) {
    score += 10;
  }

  if (preferences.latest && item.isLatest) {
    score += 16;
  }
  if (preferences.latest && !item.isLatest) {
    score -= 4;
  }

  if (preferences.trending && item.isTrending) {
    score += 8;
  }

  if (preferences.yearMin && item.year >= preferences.yearMin) {
    score += 10;
  }

  if (preferences.shortRuntime) {
    if (item.type === "movie" && item.runtime <= 120) {
      score += 12;
    }
    if (item.type === "series" && item.runtime <= 45) {
      score += 12;
    }
  }

  if (preferences.longRuntime && item.type === "movie" && item.runtime >= 140) {
    score += 8;
  }

  if (!preferences.moods.length && !preferences.genres.length && !preferences.platforms.length && !preferences.types.length) {
    score += item.isTrending ? 10 : 0;
    score += item.isLatest ? 8 : 0;
  }

  return {
    score,
    genreHits,
    moodHits,
    platformHits,
    industryHits
  };
}

function titleCase(values) {
  return values.map((value) => value.charAt(0).toUpperCase() + value.slice(1));
}

function humanizeType(type) {
  return type === "series" ? "Web Series" : "Movie";
}

function buildWhy(item, meta, preferences) {
  const reasons = [];

  if (meta.genreHits.length) {
    reasons.push(`leans into ${meta.genreHits.join(" + ")}`);
  }
  if (meta.moodHits.length) {
    reasons.push(`matches a ${meta.moodHits[0]} mood`);
  }
  if (meta.platformHits.length) {
    reasons.push(`fits your ${meta.platformHits[0]} request`);
  }
  if (meta.industryHits.length) {
    reasons.push(`brings in a ${item.industry.toLowerCase()} flavor`);
  }
  if (preferences.latest && item.isLatest) {
    reasons.push("keeps the lineup feeling current");
  }
  if (!reasons.length) {
    reasons.push("stands out as a premium pick from the catalog");
  }

  return `${item.hook} It ${reasons.join(", ")}.`;
}

function buildIntro(preferences, recommendations) {
  const parts = [];
  const industryParts = preferences.industries.includes("Bollywood")
    ? ["Bollywood"]
    : preferences.industries.includes("Indian")
      ? ["Indian"]
      : [];

  if (preferences.latest) {
    parts.push("fresh picks");
  }
  if (preferences.platforms.length) {
    parts.push(`from ${titleCase(preferences.platforms).join(" and ")}`);
  }
  if (preferences.genres.length) {
    parts.push(titleCase(preferences.genres).join(" + "));
  }
  if (preferences.moods.length) {
    parts.push(`${preferences.moods[0]} mood`);
  }
  if (preferences.types.length) {
    parts.push(preferences.types.includes("series") && !preferences.types.includes("movie") ? "web series" : "movies");
  }
  if (industryParts.length) {
    parts.push(`${industryParts.join(" and ")} picks`);
  }
  if (!preferences.industries.length && recommendations.some((item) => item.industry === "Bollywood")) {
    parts.push("including Bollywood picks");
  }

  if (!parts.length) {
    return "I pulled together a polished mix of standout movies and web series for you.";
  }

  return `I found a strong mix: ${parts.join(" | ")}.`;
}

function buildSuggestions(preferences, recommendations) {
  const suggestions = [];

  if (!preferences.platforms.length) {
    suggestions.push("Only show Netflix web series");
  }
  if (!preferences.latest) {
    suggestions.push("Give me the latest premium releases");
  }
  if (!preferences.industries.includes("Bollywood") && !recommendations.some((item) => item.industry === "Bollywood")) {
    suggestions.push("Add Bollywood movie picks too");
  }
  if (!preferences.genres.includes("sci-fi")) {
    suggestions.push("Mix sci-fi and mystery");
  }
  if (!preferences.moods.includes("feel-good")) {
    suggestions.push("Switch to feel-good comfort picks");
  }

  return suggestions.slice(0, 4);
}

function mapRecommendation(item, meta) {
  return {
    id: item.id,
    title: item.title,
    type: humanizeType(item.type),
    year: item.year,
    rating: item.rating,
    runtime: item.type === "series" ? `${item.runtime} min episodes` : `${item.runtime} min`,
    language: item.language,
    genres: item.genres,
    platforms: item.platforms,
    palette: item.palette,
    isLatest: item.isLatest,
    isTrending: item.isTrending,
    industry: item.industry,
    synopsis: item.synopsis,
    cardStyle: item.type === "movie" ? "poster" : "spotlight",
    why: meta ? buildWhy(item, meta, meta.preferences || {}) : item.hook
  };
}

function selectRecommendations(scored, preferences) {
  const base = scored.slice(0, 14);
  const selected = [];

  for (const candidate of base) {
    if (selected.length >= 8) {
      break;
    }

    selected.push(candidate);
  }

  const wantsMovieSpace =
    (!preferences.types.length || preferences.types.includes("movie")) &&
    !preferences.industries.length &&
    !selected.some(({ item }) => item.type === "movie" && item.industry === "Bollywood");

  if (wantsMovieSpace) {
    const bollywoodCandidate = base.find(({ item }) => item.type === "movie" && item.industry === "Bollywood");
    const replaceIndex = selected
      .map(({ item }, index) => ({ item, index }))
      .reverse()
      .find(({ item }) => item.type === "movie" && item.industry !== "Bollywood");

    if (bollywoodCandidate && replaceIndex) {
      selected[replaceIndex.index] = bollywoodCandidate;
    }
  }

  return unique(selected.map(({ item }) => item.id))
    .map((id) => selected.find((entry) => entry.item.id === id))
    .filter(Boolean)
    .sort((left, right) => right.meta.score - left.meta.score || right.item.year - left.item.year)
    .slice(0, 8);
}

function buildRails(recommendations, preferences) {
  const rails = [];

  if (recommendations.length) {
    rails.push({
      title: preferences.types.includes("series") && !preferences.types.includes("movie") ? "Binge-worthy for you" : "Top picks for you",
      items: recommendations.slice(0, 8)
    });
  }

  const movieItems = recommendations.filter((item) => item.type === "Movie");
  const seriesItems = recommendations.filter((item) => item.type === "Web Series");
  const bollywoodItems = recommendations.filter((item) => item.industry === "Bollywood");
  const netflixItems = recommendations.filter((item) => item.platforms.includes("netflix"));

  if (movieItems.length > 2) {
    rails.push({
      title: "Movie night lineup",
      items: movieItems.slice(0, 6)
    });
  }

  if (seriesItems.length > 2) {
    rails.push({
      title: "Series to binge next",
      items: seriesItems.slice(0, 6)
    });
  }

  if (bollywoodItems.length > 1) {
    rails.push({
      title: "Bollywood spotlight",
      items: bollywoodItems.slice(0, 6)
    });
  }

  if (netflixItems.length > 1) {
    rails.push({
      title: "On Netflix tonight",
      items: netflixItems.slice(0, 6)
    });
  }

  return unique(rails.map((rail) => rail.title))
    .map((title) => rails.find((rail) => rail.title === title))
    .filter(Boolean)
    .slice(0, 4);
}

async function recommend(query, history = []) {
  const preferences = extractPreferences(query, history);

  const scored = catalog
    .map((item) => ({
      item,
      meta: {
        ...scoreItem(item, preferences),
        preferences
      }
    }))
    .sort((left, right) => right.meta.score - left.meta.score || right.item.year - left.item.year);

  const picked = selectRecommendations(scored, preferences);
  const mapped = picked.map(({ item, meta }) => mapRecommendation(item, meta));
  const recommendations = await enrichItemsWithPosters(mapped);
  const featured = recommendations[0] || null;

  return {
    reply: `${buildIntro(preferences, recommendations)} Here are the ones I would put in front of you first.`,
    featured,
    recommendations,
    rails: buildRails(recommendations, preferences),
    suggestions: buildSuggestions(preferences, recommendations),
    context: {
      moods: preferences.moods,
      genres: preferences.genres,
      platforms: preferences.platforms,
      types: preferences.types,
      industries: preferences.industries,
      latest: preferences.latest
    }
  };
}

async function getHighlights() {
  const latest = await enrichItemsWithPosters(
    catalog
      .filter((item) => item.isLatest)
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        title: item.title,
        type: humanizeType(item.type),
        year: item.year,
        poster: null,
        palette: item.palette,
        industry: item.industry,
        platforms: item.platforms
      }))
  );

  const trending = await enrichItemsWithPosters(
    catalog
      .filter((item) => item.isTrending)
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        title: item.title,
        type: humanizeType(item.type),
        year: item.year,
        poster: null,
        palette: item.palette,
        industry: item.industry,
        platforms: item.platforms
      }))
  );

  return {
    prompts: highlightPrompts,
    latest,
    trending
  };
}

module.exports = {
  recommend,
  getHighlights
};
