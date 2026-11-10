// scripts/services.js – Loads from API
const API_BASE = "/api";
const IMG_BASE = "../assets/images/services/";
const IMG_PLACEHOLDER = "placeholder.jpg";

document.addEventListener("DOMContentLoaded", initServices);

async function initServices() {
  const list = document.getElementById("services-list");
  if (!list) return;

  try {
    const res = await fetch(`${API_BASE}/servicios`);
    const servicios = await res.json();

    // Also save to localStorage for turnos.js compatibility
    const catalog = servicios.map((s) => ({
      id: s.id,
      name: s.nombre,
      duracionMin: s.duracion_min,
      precio: s.precio,
      image: s.imagen,
    }));
    localStorage.setItem("services_catalog", JSON.stringify(catalog));

    renderServicios(servicios, list);
    wireEvents(list);
  } catch (err) {
    console.error(err);
    list.innerHTML = `<p style="color:#ef4444;text-align:center;">No se pudieron cargar los servicios. ¿Está corriendo el servidor?</p>`;
  }
}

function renderServicios(servicios, container) {
  container.innerHTML = servicios
    .map((s) => {
      const imgSrc = `${IMG_BASE}${s.imagen || "placeholder.jpg"}`;
      const precio =
        s.precio != null ? `$${Number(s.precio).toLocaleString("es-AR")}` : "";
      const duracion = s.duracion_min != null ? `${s.duracion_min} min` : "";

      return `
      <article class="service-card">
        <div class="service-media">
          <img src="${imgSrc}" alt="${escapeHtml(s.nombre)}"
               onerror="this.onerror=null;this.src='${IMG_BASE}${IMG_PLACEHOLDER}';">
        </div>
        <div class="service-body">
          <h3 class="service-title">${escapeHtml(s.nombre)}</h3>
          <p class="service-meta">
            ${duracion ? `<span>${duracion}</span>` : ""}
            ${precio ? `<span>${precio}</span>` : ""}
          </p>
          <p class="service-desc">${escapeHtml(s.descripcion || "")}</p>
          <button class="reservar-btn" data-id="${s.id}">Reservar</button>
        </div>
      </article>
    `;
    })
    .join("");
}

function wireEvents(container) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".reservar-btn");
    if (!btn) return;
    const id = Number(btn.dataset.id);

    localStorage.setItem("selectedServiceId", String(id));
    window.location.href = "turnos.html";
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
