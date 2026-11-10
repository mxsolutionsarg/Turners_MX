// scripts/turnos.js – Personal turnos with vehicle selector and duration info
const API_BASE = "/api";

document.addEventListener("DOMContentLoaded", () => {
  const getActiveUser = () => {
    try {
      return JSON.parse(localStorage.getItem("activeUser"));
    } catch {
      return null;
    }
  };
  const activeUser = getActiveUser();
  if (!activeUser) {
    window.location.href = "login.html";
    return;
  }

  const USER_ID = activeUser.id;

  const form = document.getElementById("turnoForm");
  const selServicio = document.getElementById("servicio");
  const selVehiculo = document.getElementById("vehiculo");
  const inputFecha = document.getElementById("fecha");
  const selHora = document.getElementById("hora");
  const tbody = document.getElementById("turnosBody");
  const usuarioInfo = document.getElementById("usuarioActual");
  const durInfo = document.getElementById("duracionInfo");

  if (usuarioInfo) {
    usuarioInfo.textContent = `Sesión: ${activeUser.nombre} (${activeUser.email})`;
  }

  let catalog = [];

  // Load services
  async function loadCatalog() {
    try {
      const res = await fetch(`${API_BASE}/servicios`);
      catalog = await res.json();
      populateServicios();
    } catch (err) {
      console.error(err);
      if (selServicio) {
        selServicio.innerHTML =
          '<option value="">Error al cargar servicios</option>';
        selServicio.disabled = true;
      }
    }
  }

  function populateServicios() {
    selServicio.innerHTML = '<option value="">Seleccionar servicio...</option>';
    catalog.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = String(s.id);
      opt.textContent = `${s.nombre} (${s.duracion_min || 30} min)`;
      opt.dataset.duracion = s.duracion_min || 30;
      selServicio.appendChild(opt);
    });
    selServicio.disabled = false;

    const preselected = localStorage.getItem("selectedServiceId");
    if (
      preselected &&
      [...selServicio.options].some((o) => o.value === preselected)
    ) {
      selServicio.value = preselected;
      selServicio.dispatchEvent(new Event("change"));
      localStorage.removeItem("selectedServiceId");
    }
  }

  // Show duration info
  selServicio?.addEventListener("change", () => {
    const selected = selServicio.options[selServicio.selectedIndex];
    if (selected && selected.dataset.duracion) {
      durInfo.textContent = `⏱️ Duración estimada: ${selected.dataset.duracion} minutos`;
    } else {
      durInfo.textContent = "";
    }
    refreshHoras();
  });

  // Load user vehicle list
  async function loadVehiculos() {
    if (!selVehiculo) return;
    try {
      const res = await fetch(`${API_BASE}/vehiculos?usuario_id=${USER_ID}`);
      const list = await res.json();
      selVehiculo.innerHTML = '<option value="">Sin vehículo asignado</option>';
      list.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = `${v.dominio} – ${v.marca} ${v.modelo}`;
        selVehiculo.appendChild(opt);
      });
    } catch (err) {
      console.error(err);
    }
  }

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  if (inputFecha) inputFecha.min = todayISO();

  const pad = (n) => String(n).padStart(2, "0");

  async function refreshHoras() {
    selHora.innerHTML = "";
    selHora.disabled = true;

    const fecha = inputFecha.value;
    const servicioId = selServicio.value;
    if (!fecha || !servicioId) {
      selHora.innerHTML =
        '<option value="">Selecciona fecha y servicio...</option>';
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/turnos/disponibles?fecha=${fecha}&servicio_id=${servicioId}`,
      );
      const slots = await res.json();

      const today = todayISO();
      const isToday = fecha === today;
      const now = new Date();
      const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes() - (now.getMinutes() % 30))}`;

      const disponibles = isToday ? slots.filter((h) => h > nowStr) : slots;

      if (disponibles.length === 0) {
        selHora.innerHTML =
          '<option value="">No hay horarios disponibles</option>';
      } else {
        selHora.innerHTML = '<option value="">Seleccionar horario...</option>';
        disponibles.forEach((h) => {
          const opt = document.createElement("option");
          opt.value = h;
          opt.textContent = h;
          selHora.appendChild(opt);
        });
        selHora.disabled = false;
      }
    } catch (err) {
      console.error(err);
      selHora.innerHTML = '<option value="">Error al cargar horarios</option>';
    }
  }

  inputFecha?.addEventListener("change", refreshHoras);

  async function render() {
    if (!tbody) return;
    try {
      const res = await fetch(`${API_BASE}/turnos?usuario_id=${USER_ID}`);
      const list = await res.json();
      tbody.innerHTML = "";

      if (list.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 6;
        td.textContent = "No tenés turnos cargados.";
        td.style.textAlign = "center";
        td.style.color = "#999";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      list.forEach((t) => {
        const estado = t.estado || "pendiente";
        const badgeClass =
          estado === "completado"
            ? "badge-done"
            : estado === "cancelado"
              ? "badge-cancelled"
              : estado === "confirmado"
                ? "badge-confirmed"
                : "badge-pending";
        const showPresBtn = estado === "completado";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${t.id}</td>
          <td>${t.fecha?.slice(0, 10) || "-"}</td>
          <td>${t.hora?.slice(0, 5) || "-"}</td>
          <td>${t.servicio_nombre || "-"}</td>
          <td><span class="badge ${badgeClass}">${estado}</span></td>
          <td class="actions">
            ${showPresBtn ? `<button class="btn btn-outline sm" data-ver-presupuesto="${t.id}" title="Ver presupuesto">📄</button>` : ""}
            <button data-del="${t.id}">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const servicio_id = selServicio.value ? Number(selServicio.value) : null;
    const vehiculo_id = selVehiculo?.value ? Number(selVehiculo.value) : null;
    const fecha = inputFecha.value?.trim();
    const hora = selHora.value?.trim();

    if (!servicio_id || !fecha || !hora) {
      alert("Completá todos los campos.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/turnos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          hora,
          servicio_id,
          vehiculo_id,
          usuario_id: USER_ID,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Error al crear el turno.");
        refreshHoras();
        return;
      }

      form.reset();
      durInfo.textContent = "";
      selHora.innerHTML =
        '<option value="">Selecciona fecha y servicio...</option>';
      selHora.disabled = true;
      render();
    } catch (err) {
      alert("No se pudo conectar con el servidor.");
      console.error(err);
    }
  });

  tbody?.addEventListener("click", async (e) => {
    // Delete button
    const delBtn = e.target.closest("button[data-del]");
    if (delBtn) {
      const id = delBtn.getAttribute("data-del");
      if (!confirm("¿Eliminar este turno?")) return;
      try {
        await fetch(`${API_BASE}/turnos/${id}`, { method: "DELETE" });
        refreshHoras();
        render();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // View presupuesto button
    const presBtn = e.target.closest("button[data-ver-presupuesto]");
    if (presBtn) {
      const turnoId = presBtn.dataset.verPresupuesto;
      await showPresupuestoCliente(turnoId);
    }
  });

  /* ========== PRESUPUESTO VIEW FOR CLIENTS ========== */
  const modalPC = document.getElementById("modalPresupuestoCliente");
  const contentPC = document.getElementById("clientePresupuestoContent");
  const btnCerrarPC = document.getElementById("btnCerrarPresCliente");
  const btnPDFPC = document.getElementById("btnDownloadPDFCliente");

  let clientePresData = null;

  async function showPresupuestoCliente(turnoId) {
    try {
      const res = await fetch(`${API_BASE}/presupuestos/turno/${turnoId}`);
      if (!res.ok) {
        alert("No hay presupuesto disponible para este turno.");
        return;
      }
      const { presupuesto_id } = await res.json();
      const detRes = await fetch(`${API_BASE}/presupuestos/${presupuesto_id}`);
      if (!detRes.ok) {
        alert("Error al cargar presupuesto.");
        return;
      }

      clientePresData = await detRes.json();
      const p = clientePresData;

      let total = 0;
      const rowsHtml = p.items
        .map((item) => {
          const sub = item.cantidad * parseFloat(item.precio_unitario);
          total += sub;
          return `<tr>
          <td>${escT(item.descripcion)}</td>
          <td style="text-align:center;">${item.cantidad}</td>
          <td style="text-align:right;">$${parseFloat(item.precio_unitario).toFixed(2)}</td>
          <td style="text-align:right;font-weight:600;">$${sub.toFixed(2)}</td>
        </tr>`;
        })
        .join("");

      contentPC.innerHTML = `
        <div style="padding:10px 14px;background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.15);border-radius:10px;margin-bottom:14px;">
          <strong style="color:var(--accent);font-size:1.1rem;">${escT(p.dominio || "")}</strong>
          <span style="margin-left:10px;">${escT(p.marca || "")} ${escT(p.modelo || "")} ${p.anio || ""}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
          <thead>
            <tr style="background:rgba(220,38,38,0.1);">
              <th style="padding:8px 10px;text-align:left;color:var(--accent);font-size:0.78rem;text-transform:uppercase;">Descripción</th>
              <th style="padding:8px 10px;text-align:center;color:var(--accent);font-size:0.78rem;text-transform:uppercase;">Cant.</th>
              <th style="padding:8px 10px;text-align:right;color:var(--accent);font-size:0.78rem;text-transform:uppercase;">Precio</th>
              <th style="padding:8px 10px;text-align:right;color:var(--accent);font-size:0.78rem;text-transform:uppercase;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;font-weight:700;padding:10px;">TOTAL</td>
              <td style="text-align:right;font-weight:800;color:var(--accent);padding:10px;font-size:1.1rem;">$${total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        ${p.observaciones ? `<p class="muted" style="margin-top:12px;font-style:italic;">📝 ${escT(p.observaciones)}</p>` : ""}
      `;

      modalPC.classList.add("active");
    } catch (err) {
      console.error(err);
      alert("Error al cargar presupuesto.");
    }
  }

  function escT(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  btnCerrarPC?.addEventListener("click", () =>
    modalPC.classList.remove("active"),
  );
  modalPC?.addEventListener("click", (e) => {
    if (e.target === modalPC) modalPC.classList.remove("active");
  });

  btnPDFPC?.addEventListener("click", () => {
    if (!clientePresData) return;
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      alert("Error: jsPDF no cargó.");
      return;
    }

    const p = clientePresData;
    var items = p.items;
    if (!items || items.length === 0) {
      alert("El presupuesto no tiene ítems.");
      return;
    }

    var infoText = "";
    if (p.dominio) infoText += p.dominio;
    const descVeh = [p.marca, p.modelo, p.anio].filter(Boolean).join(" ");
    if (descVeh) infoText += (infoText ? " - " : "") + descVeh;
    const cliName = p.vehiculo_owner_nombre || p.cliente_nombre || activeUser.nombre;
    if (cliName) infoText += (infoText ? " | " : "") + "Cliente: " + cliName;

    var obs = p.observaciones || "";

    var logoImg = new Image();
    logoImg.onload = function () {
      try {
        var canvas = document.createElement("canvas");
        canvas.width = logoImg.naturalWidth;
        canvas.height = logoImg.naturalHeight;
        canvas.getContext("2d").drawImage(logoImg, 0, 0);
        var logoBase64 = canvas.toDataURL("image/png");
        generarPDFCliente(items, infoText, obs, logoBase64, p);
      } catch (e) {
        console.warn("Error procesando logo:", e);
        generarPDFCliente(items, infoText, obs, null, p);
      }
    };
    logoImg.onerror = function () {
      console.warn("No se pudo cargar el logo");
      generarPDFCliente(items, infoText, obs, null, p);
    };
    logoImg.src = "../images/logo.png";
  });

  function generarPDFCliente(items, infoText, obs, logoBase64, p) {
    try {
      var doc = new window.jspdf.jsPDF();
      var pageW = doc.internal.pageSize.getWidth();
      var y = 20;
      var textX = 14;

      // Header bar
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, pageW, 40, "F");

      // Logo
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, "PNG", 14, 4, 32, 32);
          textX = 50;
        } catch (e) {
          console.warn("Logo no se pudo agregar al PDF:", e);
        }
      }

      // Brand text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("NS MOTORS", textX, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Presupuesto de Servicio", textX, 28);
      
      var fechaLabel = p.fecha ? p.fecha.slice(0, 10) : new Date().toLocaleDateString("es-AR");
      if (fechaLabel.includes("-")) {
        const parts = fechaLabel.split("-");
        if (parts.length === 3) fechaLabel = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      doc.text("Fecha: " + fechaLabel, textX, 35);

      // Vehicle info
      y = 52;
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");

      if (infoText) {
        doc.text("Vehículo / Cliente:", 14, y);
        doc.setFont("helvetica", "normal");
        doc.text(infoText, 14, y + 7);
        y += 20;
      }

      // Table header
      doc.setFillColor(40, 40, 40);
      doc.rect(14, y, pageW - 28, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("DESCRIPCIÓN", 16, y + 7);
      doc.text("CANT.", 110, y + 7);
      doc.text("P. UNIT.", 130, y + 7);
      doc.text("SUBTOTAL", 160, y + 7);
      y += 14;

      // Table rows
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      var grandTotal = 0;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var subtotal = item.cantidad * parseFloat(item.precio_unitario);
        grandTotal += subtotal;
        doc.text(item.descripcion.substring(0, 50), 16, y);
        doc.text(String(item.cantidad), 114, y);
        doc.text("$" + parseFloat(item.precio_unitario).toFixed(2), 130, y);
        doc.text("$" + subtotal.toFixed(2), 160, y);

        // Divider line
        doc.setDrawColor(200, 200, 200);
        doc.line(14, y + 3, pageW - 14, y + 3);
        y += 9;

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      }

      // Total
      y += 4;
      doc.setFillColor(220, 38, 38);
      doc.rect(130, y - 5, pageW - 144, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL: $" + grandTotal.toFixed(2), 134, y + 3);

      // Observations
      if (obs) {
        y += 20;
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Obs: " + obs, 14, y);
      }

      // Footer
      y = doc.internal.pageSize.getHeight() - 15;
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        "NS Motors – Taller Mecánico | Av. San Martín 123, Mendoza | (261) 444-5566",
        14,
        y,
      );

      var filenameStr = p.id ? "presupuesto_nsmotors_" + p.id + ".pdf" : "presupuesto_nsmotors_" + Date.now() + ".pdf";
      doc.save(filenameStr);
    } catch (err) {
      console.error("Error generando PDF:", err);
      alert("Error al generar el PDF: " + err.message);
    }
  }

  loadCatalog();
  loadVehiculos();
  render();
});
