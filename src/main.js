const API_KEY = import.meta.env.VITE_NASA_API_KEY;
const app = document.querySelector("#app");

const escapeHtml = (value) =>
  String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  })[character]);

const renderDailyLoading = () => {
  app.innerHTML = `
    <article class="space-card">
      <div class="status-row">
        <span class="eyebrow">NASA daily</span>
        <span class="meta">Loading</span>
      </div>
      <div class="loading-block"></div>
    </article>
  `;
}

const renderDaily = (data) => {
  const date = new Date(`${data.date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  app.innerHTML = `
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
      <button class="gallery-button" type="button" data-action="gallery">View picture gallery</button>
    </article>
  `;
};

const renderGalleryLoading = () => {
  app.innerHTML = `
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
  `;
};

const renderGallery = (pictures) => {
  app.innerHTML = `
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
  `;
};

const showDaily = () => {
  renderDailyLoading();
  fetch(`https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`)
    .then((response) => {
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return response.json();
    })
    .then(renderDaily)
    .catch((error) => {
      console.error("Error fetching NASA data:", error);
      app.innerHTML = `
        <article class="space-card">
          <div class="status-row"><span class="eyebrow">NASA daily</span><span class="meta">Offline</span></div>
          <h1>Signal lost</h1>
          <p>Failed to load the latest space image. Please refresh the page or try again shortly.</p>
          <button class="gallery-button" type="button" data-action="gallery">Try the gallery</button>
        </article>
      `;
    });
};

const showGallery = () => {
  renderGalleryLoading();
  fetch(`https://api.nasa.gov/planetary/apod?api_key=${API_KEY}&count=12`)
    .then((response) => {
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return response.json();
    })
    .then(renderGallery)
    .catch((error) => {
      console.error("Error fetching NASA gallery:", error);
      app.innerHTML = `
        <section class="gallery-view">
          <div class="gallery-heading">
            <div><span class="eyebrow">NASA archive</span><h1>Picture gallery</h1></div>
            <button class="back-button" type="button" data-action="daily">Back to today</button>
          </div>
          <p>Unable to load the gallery right now. Please try again shortly.</p>
        </section>
      `;
    });
};

app.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "gallery") showGallery();
  if (action === "daily") showDaily();
});

showDaily();
