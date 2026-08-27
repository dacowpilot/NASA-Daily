const API_KEY = import.meta.env.VITE_NASA_API_KEY;
const app = document.querySelector("#app");

app.innerHTML = `
  <article class="space-card">
    <div class="status-row">
      <span class="eyebrow">NASA daily</span>
      <span class="meta">Loading</span>
    </div>
    <div class="loading-block"></div>
  </article>
`;

fetch(`https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    const date = new Date().toLocaleDateString("en-US", {
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
        <h1>${data.title}</h1>
        <div class="image-panel">
          <img src="${data.url}" alt="${data.title}" />
        </div>
        <p>${data.explanation}</p>
      </article>
    `;
  })
  .catch((error) => {
    console.error("Error fetching NASA data:", error);
    app.innerHTML = `
      <article class="space-card">
        <div class="status-row">
          <span class="eyebrow">NASA daily</span>
          <span class="meta">Offline</span>
        </div>
        <h1>Signal lost</h1>
        <p>Failed to load the latest space image. Please refresh the page or try again shortly.</p>
      </article>
    `;
  });
