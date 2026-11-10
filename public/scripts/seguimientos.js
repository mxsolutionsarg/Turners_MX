// scripts/seguimientos.js – Role-aware tracking by dominio
const API_BASE = "/api";

document.addEventListener("DOMContentLoaded", () => {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("activeUser"));
    } catch {
      return null;
    }
  })();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const isAdmin = user.rol === "admin";

  const searchInput = document.getElementById("searchDominio");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnVerTodos = document.getElementById("btnVerTodos");
  const btnNuevoSeg = document.getElementById("btnNuevoSeg");
  const vehiculoInfo = document.getElementById("vehiculoInfo");
  const resultInfo = document.getElementById("resultInfo");
  const container = document.getElementById("seguimientosContainer");
  const modal = document.getElementById("modalSeg");
  const form = document.getElementById("formSeg");
  const btnCancel = document.getElementById("btnCancelSeg");
  const selServicio = document.getElementById("sServicio");

  // Update page title for clients
  const h1 = document.querySelector(".container h1");
  if (h1 && !isAdmin) h1.textContent = "Mi Historial de Mantenimientos";

  // Only admin can create new seguimientos
  if (!isAdmin && btnNuevoSeg) btnNuevoSeg.style.display = "none";

  // Load servicios for modal
  async function loadServicios() {
    try {
      const res = await fetch(`${API_BASE}/servicios`);
      const servicios = await res.json();
      selServicio.innerHTML = '<option value="">Seleccionar...</option>';
      servicios.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.nombre;
        selServicio.appendChild(opt);
      });
    } catch (err) {
      console.error(err);
    }
  }

  function renderTimeline(items) {
    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center; padding:40px;">
          <p style="color:var(--text-muted); font-size:1.1rem;">No se encontraron seguimientos.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items
      .map(
        (s) => `
      <div class="timeline-item card" style="margin-bottom:12px;">
        <div class="timeline-header">
          <span class="badge badge-done">${esc(s.servicio_nombre || "Servicio")}</span>
          <span class="muted">${s.fecha?.slice(0, 10) || "-"}</span>
        </div>
        <div class="timeline-body">
          <div class="timeline-vehicle">
            <strong style="color:var(--accent);">${esc(s.dominio || "-")}</strong>
            <span class="muted"> — ${esc(s.marca || "")} ${esc(s.modelo || "")}</span>
          </div>
          ${s.kilometraje ? `<p class="muted">📏 ${Number(s.kilometraje).toLocaleString("es-AR")} km</p>` : ""}
          ${s.observaciones ? `<p style="margin-top:6px;">${esc(s.observaciones)}</p>` : ""}
        </div>
        ${
          isAdmin
            ? `<div style="margin-top:8px;">
          <button class="btn btn-danger sm" data-del="${s.id}">Eliminar</button>
        </div>`
            : ""
        }
      </div>
    `,
      )
      .join("");
  }

  // Load all (admin) or user's vehicles only (client)
  async function loadAll() {
    vehiculoInfo.style.display = "none";

    if (isAdmin) {
      resultInfo.textContent = "Mostrando todos los seguimientos";
      try {
        const res = await fetch(`${API_BASE}/seguimientos`);
        const data = await res.json();
        renderTimeline(data);
      } catch (err) {
        console.error(err);
        container.innerHTML =
          '<p style="color:#ef4444;">Error al cargar seguimientos.</p>';
      }
    } else {
      resultInfo.textContent = "Mostrando historial de tus vehículos";
      try {
        // Get user's vehicles first, then get seguimientos for each
        const resV = await fetch(`${API_BASE}/vehiculos?usuario_id=${user.id}`);
        const vehiculos = await resV.json();

        if (vehiculos.length === 0) {
          renderTimeline([]);
          return;
        }

        // Fetch seguimientos for each vehicle by dominio
        const allSeg = [];
        for (const v of vehiculos) {
          const resSeg = await fetch(
            `${API_BASE}/seguimientos/vehiculo/${encodeURIComponent(v.dominio)}`,
          );
          const segs = await resSeg.json();
          allSeg.push(...segs);
        }
        // Sort by date descending
        allSeg.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
        renderTimeline(allSeg);
      } catch (err) {
        console.error(err);
        container.innerHTML =
          '<p style="color:#ef4444;">Error al cargar seguimientos.</p>';
      }
    }
  }

  async function searchByDominio() {
    const dominio = searchInput.value.trim().toUpperCase();
    if (!dominio) {
      alert("Ingresá un dominio.");
      return;
    }

    try {
      const resV = await fetch(
        `${API_BASE}/vehiculos/dominio/${encodeURIComponent(dominio)}`,
      );
      if (resV.ok) {
        const v = await resV.json();
        vehiculoInfo.style.display = "block";
        vehiculoInfo.innerHTML = `
          <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:center; padding:10px; background:rgba(220,38,38,0.08); border-radius:8px;">
            <div><strong style="color:var(--accent); font-size:1.2rem;">${esc(v.dominio)}</strong></div>
            <div>${esc(v.marca)} ${esc(v.modelo)} ${v.anio || ""}</div>
            <div class="muted">Cliente: ${esc(v.cliente_nombre || "")} ${esc(v.cliente_apellido || "")}</div>
          </div>
        `;
      } else {
        vehiculoInfo.style.display = "block";
        vehiculoInfo.innerHTML =
          '<p style="color:#f59e0b;">⚠️ No se encontró un vehículo con ese dominio.</p>';
      }
    } catch {
      vehiculoInfo.style.display = "none";
    }

    try {
      const res = await fetch(
        `${API_BASE}/seguimientos/vehiculo/${encodeURIComponent(dominio)}`,
      );
      const data = await res.json();
      resultInfo.textContent = `Seguimientos para ${dominio}: ${data.length} encontrado(s)`;
      renderTimeline(data);
    } catch (err) {
      console.error(err);
    }
  }

  btnBuscar?.addEventListener("click", searchByDominio);
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchByDominio();
  });
  btnVerTodos?.addEventListener("click", () => {
    searchInput.value = "";
    loadAll();
  });

  // Modal (admin only)
  btnNuevoSeg?.addEventListener("click", () => {
    form.reset();
    const dom = searchInput.value.trim().toUpperCase();
    if (dom) document.getElementById("sDominio").value = dom;
    document.getElementById("sFecha").value = new Date()
      .toISOString()
      .slice(0, 10);
    modal.classList.add("active");
  });
  btnCancel?.addEventListener("click", () => modal.classList.remove("active"));
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dominio = document
      .getElementById("sDominio")
      .value.trim()
      .toUpperCase();

    try {
      const resV = await fetch(
        `${API_BASE}/vehiculos/dominio/${encodeURIComponent(dominio)}`,
      );
      if (!resV.ok) {
        alert(
          "No se encontró un vehículo con ese dominio. Registralo primero en Vehículos.",
        );
        return;
      }
      const vehiculo = await resV.json();

      const body = {
        vehiculo_id: vehiculo.id,
        servicio_id: Number(document.getElementById("sServicio").value),
        fecha: document.getElementById("sFecha").value,
        kilometraje: document.getElementById("sKm").value
          ? Number(document.getElementById("sKm").value)
          : null,
        observaciones: document.getElementById("sObs").value.trim(),
      };

      const res = await fetch(`${API_BASE}/seguimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al crear seguimiento.");
        return;
      }

      modal.classList.remove("active");
      if (searchInput.value.trim()) searchByDominio();
      else loadAll();
    } catch (err) {
      alert("No se pudo conectar con el servidor.");
      console.error(err);
    }
  });

  container?.addEventListener("click", async (e) => {
    if (!isAdmin) return;
    const delBtn = e.target.closest("[data-del]");
    if (!delBtn) return;
    if (!confirm("¿Eliminar este seguimiento?")) return;
    try {
      await fetch(`${API_BASE}/seguimientos/${delBtn.dataset.del}`, {
        method: "DELETE",
      });
      if (searchInput.value.trim()) searchByDominio();
      else loadAll();
    } catch (err) {
      console.error(err);
    }
  });

  loadServicios();
  loadAll();
});

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
