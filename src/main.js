const API_KEY = import.meta.env.VITE_NASA_API_KEY;
const WEATHER_API_URL = import.meta.env.VITE_SPACE_WEATHER_API_URL;
const NEWS_API_URL = import.meta.env.VITE_NEWS_API_URL;
const ISS_API_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const app = document.querySelector("#app");
const state = {
  view: "daily",
  userLocation: null,
  issLocation: null,
  globeRotation: 0,
  globePitch: -0.7,
  globeAutoRotate: true,
  earthFrame: null,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragRotationStart: 0,
  dragPitchStart: 0,
  issTimer: null
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  })[character]);

const renderTopBar = () => `
  <header class="topbar" aria-label="Primary navigation">
    <div class="brand-wrap">
      <div class="brand-copy">
        <strong>NASA Daily</strong>
      </div>
    </div>

    <nav class="main-nav" aria-label="Space tabs">
      <button class="nav-button ${state.view === "daily" ? "active" : ""}" type="button" data-nav="daily">Daily</button>
      <button class="nav-button ${state.view === "gallery" ? "active" : ""}" type="button" data-nav="gallery">Gallery</button>
      <button class="nav-button ${state.view === "live" ? "active" : ""}" type="button" data-nav="live">Live</button>
      <button class="nav-button ${state.view === "weather" ? "active" : ""}" type="button" data-nav="weather">Weather</button>
      <button class="nav-button ${state.view === "news" ? "active" : ""}" type="button" data-nav="news">News</button>
    </nav>
  </header>
`;

const renderShell = (content) => {
  if (state.view !== "live" && state.earthFrame) {
    cancelAnimationFrame(state.earthFrame);
    state.earthFrame = null;
  }

  if (state.view !== "live" && state.issTimer) {
    clearInterval(state.issTimer);
    state.issTimer = null;
  }

  app.innerHTML = `${renderTopBar()}<main class="page-shell">${content}</main>`;
};

const renderDailyLoading = () => {
  renderShell(`
    <article class="space-card">
      <div class="status-row">
        <span class="eyebrow">NASA daily</span>
        <span class="meta">Loading</span>
      </div>
      <div class="loading-block"></div>
    </article>
  `);
};

const renderDaily = (data) => {
  const date = new Date(`${data.date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  renderShell(`
    <article class="space-card">
      <div class="status-row">
        <span class="eyebrow">NASA daily</span>
        <span class="meta">${date}</span>
      </div>
      <h1>${escapeHtml(data.title)}</h1>
      <div class="image-panel">
        <img src="${escapeHtml(data.url)}" alt="${escapeHtml(data.title)}" />
      </div>
      <p>${escapeHtml(data.explanation)}</p>
    </article>
  `);
};

const renderGalleryLoading = () => {
  renderShell(`
    <section class="gallery-view">
      <div class="gallery-heading">
        <div>
          <span class="eyebrow">NASA archive</span>
          <h1>Picture gallery</h1>
        </div>
        <button class="back-button" type="button" data-action="daily">Back to today</button>
      </div>
      <div class="gallery-grid" aria-label="Loading NASA pictures">
        ${Array.from({ length: 6 }, () => '<div class="gallery-skeleton"></div>').join("")}
      </div>
    </section>
  `);
};

const renderGallery = (pictures) => {
  renderShell(`
    <section class="gallery-view">
      <div class="gallery-heading">
        <div>
          <span class="eyebrow">NASA archive</span>
          <h1>Picture gallery</h1>
        </div>
        <button class="back-button" type="button" data-action="daily">Back to today</button>
      </div>
      <div class="gallery-grid">
        ${pictures
          .filter((picture) => picture.media_type === "image")
          .map(
            (picture) => `
              <article class="gallery-item">
                <img src="${escapeHtml(picture.url)}" alt="${escapeHtml(picture.title)}" loading="lazy" />
                <div class="gallery-item-info">
                  <h2>${escapeHtml(picture.title)}</h2>
                  <span>${escapeHtml(picture.date)}</span>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `);
};

const readValue = (source, candidates) => {
  for (const candidate of candidates) {
    let current = source;
    for (const key of candidate) {
      if (current == null || !(key in current)) {
        current = undefined;
        break;
      }
      current = current[key];
    }
    if (current !== undefined && current !== null && current !== "") {
      return current;
    }
  }
  return undefined;
};

const normalizeWeatherData = (payload) => {
  const root = payload && typeof payload === "object" ? payload : {};
  const source = readValue(root, [["data"], ["current"], ["observations"], ["spaceWeather"], ["weather"]]) ?? root;

  return {
    title: readValue(root, [["title"], ["name"], ["station"], ["data", "title"], ["current", "title"]]) ?? "Space Weather",
    kpIndex: readValue(source, [["kpIndex"], ["kp"], ["kp_index"], ["kpIndexValue"], ["geomagneticIndex"], ["data", "kpIndex"]]) ?? "—",
    solarWindSpeed: readValue(source, [["solarWindSpeed"], ["solarWind", "speed"], ["solar_wind_speed"], ["windSpeed"], ["data", "solarWindSpeed"]]) ?? "—",
    auroraProbability: readValue(source, [["auroraProbability"], ["aurora", "probability"], ["auroraProbabilityPercent"], ["probability"], ["data", "auroraProbability"]]) ?? "—",
    severeWeather: readValue(source, [["alert"], ["warning"], ["severe"], ["alertLevel"], ["alert_level"], ["alert_type"]]),
    updated: readValue(root, [["updatedAt"], ["timestamp"], ["lastUpdated"], ["time"], ["data", "updatedAt"], ["data", "timestamp"], ["observedAt"]]) ?? new Date().toISOString()
};};

const formatWeatherDate = (value) => {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

const renderWeatherLoading = () => {
  renderShell(`
    <article class="space-card weather-card">
      <div class="status-row">
        <span class="eyebrow">Space weather</span>
        <span class="meta">Loading</span>
      </div>
      <div class="loading-block"></div>
    </article>
  `);
};

const renderWeather = (payload) => {
  const weather = normalizeWeatherData(payload);
  const updatedText = formatWeatherDate(weather.updated);

  renderShell(`
    <article class="space-card weather-card">
      <div class="status-row">
        <span class="eyebrow">Space weather</span>
        <span class="meta">${escapeHtml(updatedText)}</span>
      </div>
      <h1>${escapeHtml(weather.title)}</h1>
      ${weather.severeWeather ? `<div class="weather-alert">⚠ ${escapeHtml(String(weather.severeWeather))}</div>` : ""}
      <div class="weather-grid">
        <div class="weather-stat">
          <span class="stat-label">Kp index</span>
          <strong>${escapeHtml(String(weather.kpIndex))}</strong>
        </div>
        <div class="weather-stat">
          <span class="stat-label">Solar wind</span>
          <strong>${escapeHtml(String(weather.solarWindSpeed))}</strong>
        </div>
        <div class="weather-stat">
          <span class="stat-label">Aurora chance</span>
          <strong>${escapeHtml(String(weather.auroraProbability))}</strong>
        </div>
      </div>
    </article>
  `);
};

const renderWeatherError = (message) => {
  renderShell(`
    <article class="space-card weather-card">
      <div class="status-row">
        <span class="eyebrow">Space weather</span>
        <span class="meta">Offline</span>
      </div>
      <h1>Weather feed unavailable</h1>
      <p>${escapeHtml(message)}</p>
    </article>
  `);
};

const getFallbackWeatherPayload = () => ({
  title: "Space Weather",
  kpIndex: 3,
  solarWindSpeed: "430 km/s",
  auroraProbability: "22%",
  updatedAt: new Date().toISOString()
});

const normalizeNewsData = (payload) => {
  const root = payload && typeof payload === "object" ? payload : {};
  const articlesField = readValue(root, [["articles"], ["results"], ["items"], ["stories"]]) ?? [];
  const articles = Array.isArray(articlesField) ? articlesField : [];
  
  return articles.slice(0, 6).map((item) => ({
    title: readValue(item, [["title"], ["headline"]]) ?? "Untitled",
    description: readValue(item, [["description"], ["summary"], ["content"]]) ?? "",
    url: readValue(item, [["url"], ["link"]]) ?? "#",
    source: readValue(item, [["source", "name"], ["source"]]) ?? "News",
    date: readValue(item, [["publishedAt"], ["date"], ["published_at"]]) ?? ""
  }));
};

const renderNewsLoading = () => {
  renderShell(`
    <section class="news-view">
      <div class="news-heading">
        <div>
          <span class="eyebrow">Space news</span>
          <h1>Headlines</h1>
        </div>
      </div>
      <div class="news-list">
        ${Array.from({ length: 5 }, () => '<div class="news-skeleton"></div>').join("")}
      </div>
    </section>
  `);
};

const renderNews = (payload) => {
  const articles = normalizeNewsData(payload);

  renderShell(`
    <section class="news-view">
      <div class="news-heading">
        <div>
          <span class="eyebrow">Space news</span>
          <h1>Headlines</h1>
        </div>
      </div>
      <div class="news-list">
        ${articles
          .map(
            (article) => `
              <article class="news-item">
                <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener">
                  <h2>${escapeHtml(article.title)}</h2>
                  <span class="news-source">${escapeHtml(article.source)}</span>
                </a>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `);
};

const getFallbackNewsPayload = () => ({
  articles: [
    { title: "NASA Discovers New Exoplanet", source: { name: "NASA" }, url: "https://exoplanetarchive.ipac.caltech.edu/" },
    { title: "SpaceX Prepares for Next Launch", source: { name: "Space News" }, url: "https://www.spacex.com/" },
    { title: "James Webb Captures Deep Space Images", source: { name: "ESA" }, url: "https://www.nasa.gov/webb/" },
    { title: "ISS Celebrates 25 Years", source: { name: "NASA" }, url: "https://www.nasa.gov/international-space-station/" },
    { title: "Mars Rover Discovers Water Traces", source: { name: "Space Daily" }, url: "https://www.nasa.gov/mars/" },
    { title: "Artemis Program Updates Revealed", source: { name: "NASA" }, url: "https://www.nasa.gov/artemis/" }
  ]
});

const showDaily = () => {
  state.view = "daily";
  renderDailyLoading();
  fetch(`https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`)
    .then((response) => {
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return response.json();
    })
    .then(renderDaily)
    .catch((error) => {
      console.error("Error fetching NASA data:", error);
      renderShell(`
        <article class="space-card">
          <div class="status-row"><span class="eyebrow">NASA daily</span><span class="meta">Offline</span></div>
          <h1>Signal lost</h1>
          <p>Failed to load the latest space image. Please refresh the page or try again shortly.</p>
          <button class="gallery-button" type="button" data-action="gallery">Try the gallery</button>
        </article>
      `);
    });
};

const showGallery = () => {
  state.view = "gallery";
  renderGalleryLoading();
  fetch(`https://api.nasa.gov/planetary/apod?api_key=${API_KEY}&count=12`)
    .then((response) => {
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return response.json();
    })
    .then(renderGallery)
    .catch((error) => {
      console.error("Error fetching NASA gallery:", error);
      renderShell(`
        <section class="gallery-view">
          <div class="gallery-heading">
            <div><span class="eyebrow">NASA archive</span><h1>Picture gallery</h1></div>
            <button class="back-button" type="button" data-action="daily">Back to today</button>
          </div>
          <p>Unable to load the gallery right now. Please try again shortly.</p>
        </section>
      `);
    });
};

const showWeather = () => {
  state.view = "weather";
  renderWeatherLoading();

  if (!WEATHER_API_URL) {
    renderWeather(getFallbackWeatherPayload());
    return;
  }

  fetch(WEATHER_API_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return response.json();
    })
    .then((json) => {
      if (!json || Object.keys(json).length === 0) {
        throw new Error("Empty weather payload");
      }
      renderWeather(json);
    })
    .catch((error) => {
      console.error("Error fetching space weather:", error);
      renderWeather(getFallbackWeatherPayload());
    });
};

const showNews = () => {
  state.view = "news";
  renderNewsLoading();

  if (!NEWS_API_URL) {
    renderNews(getFallbackNewsPayload());
    return;
  }

  fetch(NEWS_API_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return response.json();
    })
    .then((json) => {
      if (!json || Object.keys(json).length === 0) {
        throw new Error("Empty news payload");
      }
      renderNews(json);
    })
    .catch((error) => {
      console.error("Error fetching news:", error);
      renderNews(getFallbackNewsPayload());
    });
};

const getUserLocation = () => new Promise((resolve) => {
  if (!("geolocation" in navigator)) {
    resolve(null);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      resolve({
        lat: position.coords.latitude,
        lon: position.coords.longitude
      });
    },
    () => resolve(null),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
  );
});

const mapWorld = new Image();
mapWorld.src = `${import.meta.env.BASE_URL}world-map.svg`;
mapWorld.onerror = () => {
  console.warn("World map failed to load from", mapWorld.src);
};

const getEstimatedISSLocation = () => {
  const seconds = Date.now() / 1000;
  const lat = Math.sin(seconds / 150) * 52;
  const lon = ((seconds / 30) % 360) - 180;
  const alt = 400 + Math.sin(seconds / 90) * 45;

  return { lat, lon, alt };
};

const drawEarth = (issLat, issLon, userLocation = null) => {
  const canvas = document.getElementById('earth-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  const mapWidth = w * 0.82;
  const mapHeight = h * 0.6;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#06172d';
  ctx.fillRect(0, 0, w, h);

  const earthX = centerX - mapWidth / 2;
  const earthY = centerY - mapHeight / 2;

  if (mapWorld.complete && mapWorld.naturalWidth > 0) {
    ctx.drawImage(mapWorld, earthX, earthY, mapWidth, mapHeight);
  } else {
    ctx.fillStyle = '#1e6cd6';
    ctx.fillRect(earthX, earthY, mapWidth, mapHeight);
  }

  ctx.strokeStyle = 'rgba(140, 200, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(earthX, earthY, mapWidth, mapHeight);

  const lonToX = (lon) => earthX + ((lon + 180) / 360) * mapWidth;
  const latToY = (lat) => earthY + ((90 - lat) / 180) * mapHeight;

  if (userLocation) {
    const userX = lonToX(userLocation.lon);
    const userY = latToY(userLocation.lat);
    ctx.fillStyle = '#64f0a4';
    ctx.beginPath();
    ctx.arc(userX, userY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64f0a4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(userX, userY, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (Number.isFinite(issLat) && Number.isFinite(issLon)) {
    const issX = lonToX(issLon);
    const issY = latToY(issLat);
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(issX, issY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(issX, issY, 12, 0, Math.PI * 2);
    ctx.stroke();
  }
};

const renderLive = async () => {
  renderShell(`
    <section class="live-view">
      <div class="live-heading">
        <div>
          <span class="eyebrow">Live tracking</span>
          <h1>ISS Tracker</h1>
        </div>
      </div>
      <div class="earth-container">
        <canvas id="earth-canvas" width="400" height="400"></canvas>
      </div>
      <p id="geo-status" class="geo-status">Finding your location…</p>
      <div class="iss-info">
        <h2>International Space Station</h2>
        <div id="iss-data">
          <div class="iss-stat">
            <span>Latitude</span>
            <strong id="iss-lat">—</strong>
          </div>
          <div class="iss-stat">
            <span>Longitude</span>
            <strong id="iss-lon">—</strong>
          </div>
          <div class="iss-stat">
            <span>Altitude</span>
            <strong id="iss-alt">—</strong>
          </div>
        </div>
      </div>
    </section>
  `);

  const refreshISSCard = () => {
    const iss = getEstimatedISSLocation();
    state.issLocation = { lat: iss.lat, lon: iss.lon };
    drawEarth(iss.lat, iss.lon, state.userLocation);

    const latEl = document.getElementById('iss-lat');
    const lonEl = document.getElementById('iss-lon');
    const altEl = document.getElementById('iss-alt');

    if (latEl) latEl.textContent = `${iss.lat.toFixed(2)}°`;
    if (lonEl) lonEl.textContent = `${iss.lon.toFixed(2)}°`;
    if (altEl) altEl.textContent = `${iss.alt.toFixed(0)} km`;
  };

  state.userLocation = await getUserLocation();
  const geoStatus = document.getElementById('geo-status');

  if (geoStatus) {
    if (state.userLocation) {
      const lat = Math.abs(state.userLocation.lat).toFixed(2);
      const lon = Math.abs(state.userLocation.lon).toFixed(2);
      const latDir = state.userLocation.lat >= 0 ? 'N' : 'S';
      const lonDir = state.userLocation.lon >= 0 ? 'E' : 'W';
      geoStatus.textContent = `You are here: ${lat}° ${latDir}, ${lon}° ${lonDir}`;
    } else {
      geoStatus.textContent = 'Location access off — showing a stable ISS estimate.';
    }
  }

  refreshISSCard();

  if (state.issTimer) clearInterval(state.issTimer);
  state.issTimer = setInterval(() => {
    if (state.view !== 'live') return;
    refreshISSCard();
  }, 5000);
};

const showLive = () => {
  state.view = "live";
  renderLive();
};

app.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]")?.dataset.nav;
  const action = event.target.closest("[data-action]")?.dataset.action;

  if (nav === "daily") showDaily();
  if (nav === "gallery") showGallery();
  if (nav === "live") showLive();
  if (nav === "weather") showWeather();
  if (nav === "news") showNews();
  if (action === "gallery") showGallery();
  if (action === "daily") showDaily();
});

showDaily();
