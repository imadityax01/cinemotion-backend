const chatLog = document.getElementById("chatLog");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const promptRail = document.getElementById("promptRail");
const latestLane = document.getElementById("latestLane");
const trendingLane = document.getElementById("trendingLane");
const template = document.getElementById("messageTemplate");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const history = [];

function autoResize() {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 200)}px`;
}

function scrollToBottom(animate = true) {
  requestAnimationFrame(() => {
    chatLog.scrollTo({
      top: chatLog.scrollHeight,
      behavior: animate && !prefersReducedMotion.matches ? "smooth" : "auto"
    });
  });
}

function createMessage(role, contentNode, animate = true) {
  const fragment = template.content.cloneNode(true);
  const message = fragment.querySelector(".message");
  const body = fragment.querySelector(".message-body");

  message.classList.add(role);
  body.append(contentNode);
  chatLog.append(fragment);
  scrollToBottom(animate);
}

function textNode(text) {
  const paragraph = document.createElement("p");
  paragraph.className = "message-text";
  paragraph.textContent = text;
  return paragraph;
}

function makeChip(label, onClick, className = "suggestion-chip") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", () => onClick(label));
  return button;
}

function buildPosterTile(item, compact = false) {
  const tile = document.createElement("article");
  tile.className = compact ? "poster-tile compact" : "poster-tile";
  tile.innerHTML = `
    <img src="${item.poster}" alt="${item.title} poster" loading="lazy" decoding="async" width="320" height="480" />
    <div class="poster-overlay">
      <div class="poster-badge">${item.industry || item.type}</div>
      <h4>${item.title}</h4>
      <p>${item.year} • ${item.type}</p>
    </div>
  `;
  return tile;
}

function renderHeroLane(target, title, items) {
  const strip = document.createElement("div");
  strip.className = "poster-strip compact-strip";

  items.slice(0, 4).forEach((item) => {
    strip.append(buildPosterTile(item, true));
  });

  target.innerHTML = `<div class="lane-heading">${title}</div>`;
  target.append(strip);
}

function renderFeatured(featured) {
  if (!featured) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "featured-showcase";
  section.style.setProperty("--featured-accent", featured.palette?.[1] || "#7ae2ff");
  section.style.background = `linear-gradient(135deg, ${featured.palette?.[2] || "#111926"} 0%, ${featured.palette?.[0] || "#1e324a"} 52%, ${featured.palette?.[1] || "#7ae2ff"} 100%)`;
  section.innerHTML = `
    <div class="featured-gradient"></div>
    <div class="featured-poster-wrap">
      <img class="featured-poster" src="${featured.poster}" alt="${featured.title} poster" loading="eager" decoding="async" width="320" height="480" />
    </div>
    <div class="featured-copy">
      <span class="featured-kicker">${featured.industry} • ${featured.type}</span>
      <h3>${featured.title}</h3>
      <div class="featured-meta">
        <span>${featured.year}</span>
        <span>${featured.runtime}</span>
        <span>${featured.rating.toFixed(1)} rating</span>
        <span>${featured.language}</span>
      </div>
      <p class="featured-synopsis">${featured.synopsis}</p>
      <p class="featured-why">${featured.why}</p>
      <div class="pills">
        ${featured.genres.map((genre) => `<span class="pill">${genre}</span>`).join("")}
        ${featured.platforms.map((platform) => `<span class="pill subtle-pill">${platform}</span>`).join("")}
      </div>
    </div>
  `;

  return section;
}

function renderPosterRail(title, items) {
  const section = document.createElement("section");
  section.className = "content-rail";

  const heading = document.createElement("div");
  heading.className = "rail-heading";
  heading.textContent = title;
  section.append(heading);

  const strip = document.createElement("div");
  strip.className = "poster-strip";
  items.forEach((item) => {
    strip.append(buildPosterTile(item));
  });

  section.append(strip);
  return section;
}

function renderSuggestions(suggestions) {
  if (!suggestions?.length) {
    return null;
  }

  const wrap = document.createElement("div");
  wrap.className = "suggestions";

  suggestions.forEach((suggestion) => {
    wrap.append(makeChip(suggestion, handlePrompt));
  });

  return wrap;
}

function renderAssistantResponse(payload) {
  const container = document.createElement("div");
  container.className = "response-layout";
  container.append(textNode(payload.reply));

  const featured = renderFeatured(payload.featured);
  if (featured) {
    container.append(featured);
  }

  const rails = Array.isArray(payload.rails) && payload.rails.length
    ? payload.rails
    : [{ title: "Top picks for you", items: payload.recommendations || [] }];

  rails.forEach((rail) => {
    if (rail.items?.length) {
      container.append(renderPosterRail(rail.title, rail.items));
    }
  });

  const suggestionWrap = renderSuggestions(payload.suggestions);
  if (suggestionWrap) {
    container.append(suggestionWrap);
  }

  createMessage("assistant", container);
}

function renderTyping() {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="typing" aria-label="Assistant is typing">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  const fragment = template.content.cloneNode(true);
  const message = fragment.querySelector(".message");
  const body = fragment.querySelector(".message-body");

  message.classList.add("assistant");
  message.dataset.typing = "true";
  body.append(container);
  chatLog.append(fragment);
  scrollToBottom();
}

function clearTyping() {
  const typing = chatLog.querySelector('[data-typing="true"]');
  if (typing) {
    typing.remove();
  }
}

async function askAssistant(prompt) {
  createMessage("user", textNode(prompt));
  history.push({ role: "user", content: prompt });
  renderTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: prompt,
        history: history.slice(-8)
      })
    });

    if (!response.ok) {
      throw new Error("Unable to fetch recommendations.");
    }

    const payload = await response.json();
    clearTyping();
    history.push({ role: "assistant", content: payload.reply });
    renderAssistantResponse(payload);
  } catch (error) {
    clearTyping();
    createMessage(
      "assistant",
      textNode("I hit a small glitch while building your lineup. Try the request again with a slightly different phrase.")
    );
  }
}

function handlePrompt(prompt) {
  chatInput.value = "";
  autoResize();
  askAssistant(prompt);
}

async function bootstrap() {
  try {
    const response = await fetch("/api/highlights");
    const payload = await response.json();

    payload.prompts.forEach((item) => {
      promptRail.append(makeChip(item.label, () => handlePrompt(item.prompt), "hero-chip"));
    });

    renderHeroLane(latestLane, "Latest on Stream", payload.latest || []);
    renderHeroLane(trendingLane, "Trending Now", payload.trending || []);
  } catch (error) {
    promptRail.append(
      makeChip("Latest premium picks", () => handlePrompt("Show me the latest premium movie and web series picks."), "hero-chip")
    );
  }

  const welcome = document.createElement("div");
  welcome.append(
    textNode(
      "Tell me your mood, platform, or genre mix and I will shape a cinematic watchlist. Ask for Bollywood gems, Netflix web series, latest releases, dark thrillers, comfort rom-coms, or mixed-genre combinations."
    )
  );
  createMessage("assistant", welcome, false);
}

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => handlePrompt(button.dataset.prompt));
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = chatInput.value.trim();
  if (!value) {
    return;
  }

  handlePrompt(value);
});

chatInput.addEventListener("input", autoResize);
autoResize();
bootstrap();
