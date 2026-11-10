// scripts/dashboard.js – Admin dashboard with presupuestos + PDF export
const API = "/api";

document.addEventListener("DOMContentLoaded", () => {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("activeUser"));
    } catch {
      return null;
    }
  })();
  if (!user || user.rol !== "admin") {
    window.location.href = "index.html";
    return;
  }

  const greeting = document.getElementById("dashGreeting");
  if (greeting) greeting.textContent = `Hola, ${user.nombre} 👋`;

  let allTurnos = [];

  /* ========== STATS ========== */
  async function loadStats() {
    try {
      const [resC, resV, resT, resS] = await Promise.all([
        fetch(`${API}/clientes`),
        fetch(`${API}/vehiculos`),
        fetch(`${API}/turnos`),
        fetch(`${API}/seguimientos`),
      ]);
      const [clientes, vehiculos, turnos, seguimientos] = await Promise.all([
        resC.json(),
        resV.json(),
        resT.json(),
        resS.json(),
      ]);

      document.getElementById("statClientes").textContent = clientes.length;
      document.getElementById("statVehiculos").textContent = vehiculos.length;
      document.getElementById("statSeguimientos").textContent =
        seguimientos.length;

      const today = new Date().toISOString().slice(0, 10);
      document.getElementById("statTurnos").textContent = turnos.filter(
        (t) => t.fecha?.slice(0, 10) === today,
      ).length;

      renderTurnos(turnos);
      renderClientes(clientes, vehiculos);
    } catch (err) {
      console.error(err);
    }
  }

  /* ========== RENDIMIENTO MENSUAL ========== */
  const MESES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const selMes = document.getElementById("rendMes");
  const selAnio = document.getElementById("rendAnio");

  // Populate selectors
  (function initRendSelectors() {
    const now = new Date();
    const mAct = now.getMonth();
    const aAct = now.getFullYear();

    MESES.forEach((m, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = m;
      if (i === mAct) opt.selected = true;
      selMes.appendChild(opt);
    });

    for (let a = aAct - 2; a <= aAct + 1; a++) {
      const opt = document.createElement("option");
      opt.value = a;
      opt.textContent = a;
      if (a === aAct) opt.selected = true;
      selAnio.appendChild(opt);
    }
  })();

  selMes?.addEventListener("change", loadRendimiento);
  selAnio?.addEventListener("change", loadRendimiento);

  async function loadRendimiento() {
    const mes = parseInt(selMes.value);
    const anio = parseInt(selAnio.value);

    // Number of days in this month
    const diasMes = new Date(anio, mes + 1, 0).getDate();
    const prefix = `${anio}-${String(mes + 1).padStart(2, "0")}`;

    try {
      // Fetch all data in parallel
      const [resT, resS, resP] = await Promise.all([
        fetch(`${API}/turnos`),
        fetch(`${API}/seguimientos`),
        fetch(`${API}/presupuestos`),
      ]);
      const [turnos, seguimientos, presupuestos] = await Promise.all([
        resT.json(),
        resS.json(),
        resP.json(),
      ]);

      // Filter by month — convert to string in case of Date objects
      const matchMonth = (d) => String(d || "").slice(0, 7) === prefix;
      const turnosMes = turnos.filter((t) => matchMonth(t.fecha));
      const segMes = seguimientos.filter((s) => matchMonth(s.fecha));
      const presMes = presupuestos.filter((p) => matchMonth(p.fecha));

      // KPIs
      const totalTurnos = turnosMes.length;
      const completados = turnosMes.filter(
        (t) => t.estado === "completado",
      ).length;
      const totalSeg = segMes.length;

      // Revenue: sum all presupuesto items for the month
      let totalIngresos = 0;
      for (const p of presMes) {
        try {
          const detRes = await fetch(`${API}/presupuestos/${p.id}`);
          if (detRes.ok) {
            const det = await detRes.json();
            if (det.items) {
              det.items.forEach((item) => {
                totalIngresos +=
                  (item.cantidad || 1) * parseFloat(item.precio_unitario || 0);
              });
            }
          }
        } catch {
          /* skip */
        }
      }

      const ticketProm =
        presMes.length > 0 ? totalIngresos / presMes.length : 0;

      // Update KPI values
      document.getElementById("rkTurnos").textContent = totalTurnos;
      document.getElementById("rkCompletados").textContent = completados;
      document.getElementById("rkIngresos").textContent =
        `$${totalIngresos.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
      document.getElementById("rkTicket").textContent =
        `$${ticketProm.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
      document.getElementById("rkServicios").textContent = totalSeg;

      // Build daily distribution for bar chart
      const dayCounts = new Array(diasMes).fill(0);
      turnosMes.forEach((t) => {
        // Parse date robustly — handle both "2026-03-14" and "2026-03-14T00:00:00.000Z"
        const dateStr = String(t.fecha || "");
        const dayMatch = dateStr.match(/\d{4}-\d{2}-(\d{2})/);
        if (dayMatch) {
          const day = parseInt(dayMatch[1], 10);
          if (day >= 1 && day <= diasMes) dayCounts[day - 1]++;
        }
      });

      console.log("📊 Rendimiento chart data:", { prefix, turnosMes: turnosMes.length, dayCounts: dayCounts.filter(c => c > 0), diasMes });

      const maxCount = Math.max(...dayCounts, 1);
      const chart = document.getElementById("rendChart");
      const chartHeight = 100; // usable height in px (120px container - 20px padding)
      chart.innerHTML = "";

      for (let d = 0; d < diasMes; d++) {
        const col = document.createElement("div");
        col.className = "rend-bar-col";

        const bar = document.createElement("div");
        bar.className = `rend-bar ${dayCounts[d] === 0 ? "empty" : ""}`;
        // Use pixel heights — percentages don't work without explicit parent height
        const pxHeight = dayCounts[d] > 0
          ? Math.max((dayCounts[d] / maxCount) * chartHeight, 8)
          : 2;
        bar.style.height = `${pxHeight}px`;

        const tooltip = document.createElement("span");
        tooltip.className = "rend-bar-tooltip";
        tooltip.textContent = `${dayCounts[d]} turno${dayCounts[d] !== 1 ? "s" : ""}`;
        bar.appendChild(tooltip);

        const label = document.createElement("span");
        label.className = "rend-bar-label";
        label.textContent =
          d === 0 || d === diasMes - 1 || (d + 1) % 5 === 0 ? d + 1 : "";

        col.appendChild(bar);
        col.appendChild(label);
        chart.appendChild(col);
      }
    } catch (err) {
      console.error("Error cargando rendimiento:", err);
    }
  }

  /* ========== BLOQUEOS ========== */
  async function loadBloqueos() {
    try {
      const res = await fetch(`${API}/bloqueos`);
      const bloqueos = await res.json();
      const container = document.getElementById("bloqueosLista");
      if (bloqueos.length === 0) {
        container.innerHTML = '<p class="muted">No hay fechas bloqueadas.</p>';
        return;
      }
      container.innerHTML = bloqueos
        .map(
          (b) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid var(--border-glass);">
          <div>
            <strong style="color:var(--red);">${b.fecha_inicio?.slice(0, 10)} → ${b.fecha_fin?.slice(0, 10)}</strong>
            <span class="muted" style="margin-left:12px;">${esc(b.motivo || "")}</span>
          </div>
          <button class="btn btn-danger sm" data-del-bloqueo="${b.id}">Quitar</button>
        </div>
      `,
        )
        .join("");
    } catch (err) {
      console.error(err);
    }
  }

  document
    .getElementById("formBloqueo")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = {
        fecha_inicio: document.getElementById("bFechaInicio").value,
        fecha_fin: document.getElementById("bFechaFin").value,
        motivo: document.getElementById("bMotivo").value.trim() || "Cerrado",
      };
      try {
        const res = await fetch(`${API}/bloqueos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json();
          alert(d.error);
          return;
        }
        e.target.reset();
        loadBloqueos();
      } catch {
        alert("Error de conexión.");
      }
    });

  document
    .getElementById("bloqueosLista")
    ?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-del-bloqueo]");
      if (!btn) return;
      if (!confirm("¿Eliminar este bloqueo?")) return;
      try {
        await fetch(`${API}/bloqueos/${btn.dataset.delBloqueo}`, {
          method: "DELETE",
        });
        loadBloqueos();
      } catch (err) {
        console.error(err);
      }
    });

  /* ========== TURNOS TABLE ========== */
  const turnosBody = document.getElementById("turnosBody");
  const filterFecha = document.getElementById("filterFecha");
  const btnTodos = document.getElementById("btnTodosLos");

  function renderTurnos(list) {
    allTurnos = list;
    turnosBody.innerHTML = "";
    if (list.length === 0) {
      turnosBody.innerHTML =
        '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">No hay turnos.</td></tr>';
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
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.id}</td>
        <td>${t.fecha?.slice(0, 10) || "-"}</td>
        <td>${t.hora?.slice(0, 5) || "-"}</td>
        <td>${esc(t.servicio_nombre || "-")}</td>
        <td>${t.duracion_min || 30} min</td>
        <td>${esc(t.usuario_nombre || t.cliente_nombre || "-")}<br><span class="muted" style="font-size:0.75rem;">${esc(t.usuario_email || "")}</span></td>
        <td><span class="badge ${badgeClass}">${estado}</span></td>
        <td style="white-space:nowrap;">
          <button class="btn btn-outline sm" data-edit-turno="${t.id}">✏️</button>
          <button class="btn btn-primary sm" data-presupuesto-turno="${t.id}" data-vehiculo="${t.vehiculo_id || ""}" title="Presupuesto">📄</button>
        </td>
      `;
      turnosBody.appendChild(tr);
    });
  }

  filterFecha?.addEventListener("change", () => {
    const f = filterFecha.value;
    if (!f) {
      renderTurnos(allTurnos);
      return;
    }
    renderTurnos(allTurnos.filter((t) => t.fecha?.slice(0, 10) === f));
  });
  btnTodos?.addEventListener("click", () => {
    filterFecha.value = "";
    renderTurnos(allTurnos);
  });

  /* ========== EDIT TURNO MODAL ========== */
  const modalTurno = document.getElementById("modalTurno");
  const formEditTurno = document.getElementById("formEditTurno");
  const btnCancelT = document.getElementById("btnCancelTurno");

  turnosBody?.addEventListener("click", (e) => {
    // Edit button
    const editBtn = e.target.closest("[data-edit-turno]");
    if (editBtn) {
      const turno = allTurnos.find(
        (t) => String(t.id) === editBtn.dataset.editTurno,
      );
      if (!turno) return;
      document.getElementById("editTurnoId").value = turno.id;
      document.getElementById("editFecha").value =
        turno.fecha?.slice(0, 10) || "";
      document.getElementById("editHora").value = turno.hora?.slice(0, 5) || "";
      document.getElementById("editEstado").value = turno.estado || "pendiente";
      modalTurno.classList.add("active");
      return;
    }

    // Presupuesto button
    const pBtn = e.target.closest("[data-presupuesto-turno]");
    if (pBtn) {
      openPresupuestoModal(
        pBtn.dataset.presupuestoTurno,
        pBtn.dataset.vehiculo,
      );
    }
  });

  btnCancelT?.addEventListener("click", () =>
    modalTurno.classList.remove("active"),
  );
  modalTurno?.addEventListener("click", (e) => {
    if (e.target === modalTurno) modalTurno.classList.remove("active");
  });

  formEditTurno?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editTurnoId").value;
    const body = {
      fecha: document.getElementById("editFecha").value,
      hora: document.getElementById("editHora").value,
      estado: document.getElementById("editEstado").value,
    };
    try {
      const res = await fetch(`${API}/turnos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error);
        return;
      }
      modalTurno.classList.remove("active");
      loadStats();
    } catch {
      alert("Error de conexión.");
    }
  });

  /* ========== PRESUPUESTO MODAL ========== */
  const modalP = document.getElementById("modalPresupuesto");
  const formP = document.getElementById("formPresupuesto");
  const pItemsBody = document.getElementById("pItemsBody");
  const pTotal = document.getElementById("pTotal");
  const pInfoBlock = document.getElementById("pInfoBlock");
  const btnCancelP = document.getElementById("btnCancelPresupuesto");
  const btnAddItem = document.getElementById("btnAddItem");
  const btnExportPDF = document.getElementById("btnExportPDF");

  let currentPresupuestoData = null;

  async function openPresupuestoModal(turnoId, vehiculoId) {
    document.getElementById("pTurnoId").value = turnoId;
    document.getElementById("pVehiculoId").value = vehiculoId || "";
    document.getElementById("pPresupuestoId").value = "";
    document.getElementById("pObservaciones").value = "";
    pItemsBody.innerHTML = "";

    // Check if presupuesto already exists for this turno
    try {
      const res = await fetch(`${API}/presupuestos/turno/${turnoId}`);
      if (res.ok) {
        const data = await res.json();
        // Load existing presupuesto
        const detRes = await fetch(
          `${API}/presupuestos/${data.presupuesto_id}`,
        );
        if (detRes.ok) {
          const pres = await detRes.json();
          document.getElementById("pPresupuestoId").value = pres.id;
          document.getElementById("pVehiculoId").value = pres.vehiculo_id;
          document.getElementById("pObservaciones").value =
            pres.observaciones || "";
          document.getElementById("presupuestoTitle").textContent =
            "Editar Presupuesto";
          currentPresupuestoData = pres;

          pInfoBlock.innerHTML = `
            <strong>${esc(pres.dominio || "")}</strong>
            <span>${esc(pres.marca || "")} ${esc(pres.modelo || "")} ${pres.anio || ""}</span>
            <span class="muted">Cliente: ${esc(pres.vehiculo_owner_nombre || pres.cliente_nombre || "—")}</span>
          `;

          pres.items.forEach((item) =>
            addItemRow(item.descripcion, item.cantidad, item.precio_unitario),
          );
          recalcTotal();
          modalP.classList.add("active");
          return;
        }
      }
    } catch (err) {
      console.error(err);
    }

    // New presupuesto — load turno info
    document.getElementById("presupuestoTitle").textContent =
      "Nuevo Presupuesto";
    currentPresupuestoData = null;
    const turno = allTurnos.find((t) => String(t.id) === String(turnoId));
    if (turno) {
      pInfoBlock.innerHTML = `
        <strong>${esc(turno.dominio || turno.vehiculo_dominio || "—")}</strong>
        <span>${esc(turno.servicio_nombre || "")}</span>
        <span class="muted">Cliente: ${esc(turno.usuario_nombre || turno.cliente_nombre || "—")}</span>
      `;
      if (!vehiculoId && turno.vehiculo_id) {
        document.getElementById("pVehiculoId").value = turno.vehiculo_id;
      }
    } else {
      pInfoBlock.innerHTML =
        '<span class="muted">Sin información del turno</span>';
    }

    addItemRow("", 1, 0);
    recalcTotal();
    modalP.classList.add("active");
  }

  function addItemRow(desc = "", qty = 1, price = 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="item-desc" value="${esc(desc)}" placeholder="Descripción del ítem" /></td>
      <td><input type="number" class="item-qty" value="${qty}" min="1" step="1" /></td>
      <td><input type="number" class="item-price" value="${price}" min="0" step="0.01" /></td>
      <td class="item-subtotal" style="font-weight:600;">$${(qty * price).toFixed(2)}</td>
      <td><button type="button" class="btn-remove-item" title="Quitar">✕</button></td>
    `;
    pItemsBody.appendChild(tr);

    tr.querySelector(".item-qty").addEventListener("input", () =>
      recalcRow(tr),
    );
    tr.querySelector(".item-price").addEventListener("input", () =>
      recalcRow(tr),
    );
    tr.querySelector(".btn-remove-item").addEventListener("click", () => {
      tr.remove();
      recalcTotal();
    });
  }

  function recalcRow(tr) {
    const qty = parseFloat(tr.querySelector(".item-qty").value) || 0;
    const price = parseFloat(tr.querySelector(".item-price").value) || 0;
    tr.querySelector(".item-subtotal").textContent =
      `$${(qty * price).toFixed(2)}`;
    recalcTotal();
  }

  function recalcTotal() {
    let total = 0;
    pItemsBody.querySelectorAll("tr").forEach((tr) => {
      const qty = parseFloat(tr.querySelector(".item-qty")?.value) || 0;
      const price = parseFloat(tr.querySelector(".item-price")?.value) || 0;
      total += qty * price;
    });
    pTotal.textContent = `$${total.toFixed(2)}`;
  }

  function getItems() {
    const items = [];
    pItemsBody.querySelectorAll("tr").forEach((tr) => {
      const desc = tr.querySelector(".item-desc")?.value.trim();
      const qty = parseInt(tr.querySelector(".item-qty")?.value) || 1;
      const price = parseFloat(tr.querySelector(".item-price")?.value) || 0;
      if (desc)
        items.push({
          descripcion: desc,
          cantidad: qty,
          precio_unitario: price,
        });
    });
    return items;
  }

  /* ========== PRESUPUESTO MODAL EVENT DELEGATION ========== */
  modalP?.addEventListener("click", async (e) => {
    // Close on overlay click
    if (e.target === modalP) {
      modalP.classList.remove("active");
      return;
    }

    const target = e.target.closest("button");
    if (!target) return;
    const id = target.id;

    // Cancel
    if (id === "btnCancelPresupuesto") {
      modalP.classList.remove("active");
      return;
    }

    // Add item
    if (id === "btnAddItem") {
      addItemRow();
      return;
    }

    // Remove item
    if (target.classList.contains("btn-remove-item")) {
      target.closest("tr")?.remove();
      recalcTotal();
      return;
    }

    // Save
    if (id === "btnSavePresupuesto") {
      const items = getItems();
      if (items.length === 0) {
        alert("Agregá al menos un ítem.");
        return;
      }

      const presupuestoId = document.getElementById("pPresupuestoId").value;
      const vehiculoId = document.getElementById("pVehiculoId").value;
      const turnoId = document.getElementById("pTurnoId").value;

      const body = {
        turno_id: turnoId ? Number(turnoId) : null,
        vehiculo_id: vehiculoId ? Number(vehiculoId) : null,
        usuario_id: user.id,
        fecha: new Date().toISOString().slice(0, 10),
        observaciones: document.getElementById("pObservaciones").value.trim(),
        items,
      };

      try {
        let res;
        if (presupuestoId) {
          res = await fetch(`${API}/presupuestos/${presupuestoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ observaciones: body.observaciones, items }),
          });
        } else {
          res = await fetch(`${API}/presupuestos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }

        if (!res.ok) {
          const d = await res.json();
          alert(d.error || "Error");
          return;
        }
        alert("✅ Presupuesto guardado.");
        modalP.classList.remove("active");
      } catch {
        alert("Error de conexión.");
      }
      return;
    }

    // Export PDF
    if (id === "btnExportPDF") {
      exportPresupuestoPDF();
      return;
    }
  });

  /* ========== PDF EXPORT ========== */
  function exportPresupuestoPDF() {
    try {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("Error: jsPDF no cargó. Recargá la página.");
        return;
      }

      var items = getItems();
      if (items.length === 0) {
        alert("Agregá al menos un ítem para exportar.");
        return;
      }

      var infoText = pInfoBlock ? pInfoBlock.textContent.trim() : "";
      var obsEl = document.getElementById("pObservaciones");
      var obs = obsEl ? obsEl.value.trim() : "";

      // Load logo first, then generate PDF
      var logoImg = new Image();
      logoImg.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = logoImg.naturalWidth;
          canvas.height = logoImg.naturalHeight;
          canvas.getContext("2d").drawImage(logoImg, 0, 0);
          var logoBase64 = canvas.toDataURL("image/png");
          generarPDF(items, infoText, obs, logoBase64);
        } catch (e) {
          console.warn("Error procesando logo:", e);
          generarPDF(items, infoText, obs, null);
        }
      };
      logoImg.onerror = function () {
        console.warn("No se pudo cargar el logo");
        generarPDF(items, infoText, obs, null);
      };
      logoImg.src = "../images/logo.png";
    } catch (err) {
      console.error("Error exportando PDF:", err);
      alert("Error al exportar el PDF: " + err.message);
    }
  }

  function generarPDF(items, infoText, obs, logoBase64) {
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
      doc.text(
        "Fecha: " + new Date().toLocaleDateString("es-AR"),
        textX,
        35,
      );

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
        var subtotal = item.cantidad * item.precio_unitario;
        grandTotal += subtotal;
        doc.text(item.descripcion.substring(0, 50), 16, y);
        doc.text(String(item.cantidad), 114, y);
        doc.text("$" + item.precio_unitario.toFixed(2), 130, y);
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

      doc.save("presupuesto_nsmotors_" + Date.now() + ".pdf");
      alert("✅ PDF exportado correctamente.");
    } catch (err) {
      console.error("Error generando PDF:", err);
      alert("Error al generar el PDF: " + err.message);
    }
  }

  /* ========== CLIENTES TABLE ========== */
  const clientesBody = document.getElementById("clientesBody");

  function renderClientes(clientes, vehiculos) {
    clientesBody.innerHTML = "";
    if (clientes.length === 0) {
      clientesBody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No hay clientes.</td></tr>';
      return;
    }
    clientes.forEach((c) => {
      const vehs = vehiculos.filter((v) => v.cliente_id === c.id);
      const vehStr =
        vehs.length > 0
          ? vehs
              .map(
                (v) =>
                  `<span class="badge badge-done" style="font-size:0.7rem;">${esc(v.dominio)}</span>`,
              )
              .join(" ")
          : '<span class="muted">—</span>';
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${esc(c.nombre)} ${esc(c.apellido)}</td>
        <td>${esc(c.email || "-")}</td>
        <td>${esc(c.telefono || "-")}</td>
        <td>${vehStr}</td>
      `;
      clientesBody.appendChild(tr);
    });
  }

  /* ========== QUICK SEGUIMIENTO ========== */
  const formSeg = document.getElementById("formQuickSeg");
  const qDominio = document.getElementById("qDominio");
  const qVehInfo = document.getElementById("qVehiculoInfo");
  const qServicio = document.getElementById("qServicio");

  async function loadServicios() {
    try {
      const res = await fetch(`${API}/servicios`);
      const servicios = await res.json();
      qServicio.innerHTML = '<option value="">Seleccionar...</option>';
      servicios.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.nombre;
        qServicio.appendChild(opt);
      });
    } catch (err) {
      console.error(err);
    }
  }

  let lookupTimeout;
  qDominio?.addEventListener("input", () => {
    clearTimeout(lookupTimeout);
    lookupTimeout = setTimeout(async () => {
      const dom = qDominio.value.trim().toUpperCase();
      if (dom.length < 3) {
        qVehInfo.textContent = "";
        return;
      }
      try {
        const res = await fetch(
          `${API}/vehiculos/dominio/${encodeURIComponent(dom)}`,
        );
        if (res.ok) {
          const v = await res.json();
          qVehInfo.innerHTML = `✅ ${esc(v.marca)} ${esc(v.modelo)} ${v.anio || ""}`;
          qVehInfo.style.color = "#22c55e";
        } else {
          qVehInfo.textContent = "⚠️ No encontrado";
          qVehInfo.style.color = "#f59e0b";
        }
      } catch {
        qVehInfo.textContent = "";
      }
    }, 400);
  });

  const qFecha = document.getElementById("qFecha");
  if (qFecha) qFecha.value = new Date().toISOString().slice(0, 10);

  formSeg?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dominio = qDominio.value.trim().toUpperCase();
    try {
      const resV = await fetch(
        `${API}/vehiculos/dominio/${encodeURIComponent(dominio)}`,
      );
      if (!resV.ok) {
        alert("No se encontró un vehículo con ese dominio.");
        return;
      }
      const vehiculo = await resV.json();

      const body = {
        vehiculo_id: vehiculo.id,
        servicio_id: Number(qServicio.value),
        fecha: qFecha.value,
        kilometraje: document.getElementById("qKm").value
          ? Number(document.getElementById("qKm").value)
          : null,
        observaciones: document.getElementById("qObs").value.trim(),
      };

      const res = await fetch(`${API}/seguimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error);
        return;
      }
      alert("✅ Seguimiento registrado.");
      formSeg.reset();
      qFecha.value = new Date().toISOString().slice(0, 10);
      qVehInfo.textContent = "";
      loadStats();
    } catch {
      alert("Error de conexión.");
    }
  });

  /* ========== STAT CARD CLICKS ========== */
  document.getElementById("statsGrid")?.addEventListener("click", (e) => {
    const card = e.target.closest(".stat-card");
    if (!card) return;
    const goto = card.dataset.goto;
    if (goto) window.location.href = goto;
  });

  /* ========== SERVICIOS CRUD ========== */
  const serviciosBody = document.getElementById("serviciosBody");
  const modalServicio = document.getElementById("modalServicio");
  const formServicio = document.getElementById("formServicio");
  const btnNuevoServicio = document.getElementById("btnNuevoServicio");
  const btnCancelServicio = document.getElementById("btnCancelServicio");

  async function loadServiciosList() {
    if (!serviciosBody) return;
    try {
      const res = await fetch(`${API}/servicios`);
      const servicios = await res.json();
      serviciosBody.innerHTML = "";
      if (servicios.length === 0) {
        serviciosBody.innerHTML =
          '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No hay servicios cargados.</td></tr>';
        return;
      }
      servicios.forEach((s) => {
        const precio =
          s.precio != null
            ? `$${Number(s.precio).toLocaleString("es-AR")}`
            : "-";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${esc(s.nombre)}</strong></td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.descripcion || "-")}</td>
          <td>${s.duracion_min || "-"} min</td>
          <td>${precio}</td>
          <td style="font-size:0.75rem;color:var(--text-muted);">${esc(s.imagen || "-")}</td>
          <td>
            <button class="btn btn-outline sm svc-edit" data-id="${s.id}">✏️</button>
            <button class="btn btn-outline sm svc-delete" data-id="${s.id}" style="border-color:#ef4444;color:#ef4444;">🗑️</button>
          </td>
        `;
        serviciosBody.appendChild(tr);
      });
    } catch (err) {
      console.error("Error loading servicios:", err);
    }
  }

  function openServicioModal(servicio = null) {
    if (!modalServicio) return;
    const title = document.getElementById("servicioModalTitle");
    const preview = document.getElementById("svcImgPreview");
    const content = document.getElementById("svcDropzoneContent");

    document.getElementById("svcId").value = servicio ? servicio.id : "";
    document.getElementById("svcNombre").value = servicio
      ? servicio.nombre
      : "";
    document.getElementById("svcDescripcion").value = servicio
      ? servicio.descripcion || ""
      : "";
    document.getElementById("svcDuracion").value = servicio
      ? servicio.duracion_min || 30
      : 30;
    document.getElementById("svcPrecio").value = servicio
      ? servicio.precio || 0
      : 0;
    document.getElementById("svcImagen").value = servicio
      ? servicio.imagen || ""
      : "";

    // Show image preview if editing and has image
    if (servicio && servicio.imagen) {
      preview.src = `../assets/images/services/${servicio.imagen}`;
      preview.style.display = "block";
      content.style.display = "none";
    } else {
      preview.style.display = "none";
      preview.src = "";
      content.style.display = "flex";
    }

    title.textContent = servicio ? "Editar Servicio" : "Nuevo Servicio";
    modalServicio.classList.add("active");
  }

  // Dropzone logic
  const dropzone = document.getElementById("svcDropzone");
  const fileInput = document.getElementById("svcFileInput");
  const imgPreview = document.getElementById("svcImgPreview");
  const dropContent = document.getElementById("svcDropzoneContent");

  if (dropzone && fileInput) {
    // Click to browse
    dropzone.addEventListener("click", () => fileInput.click());

    // Drag events
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files.length)
        handleFileUpload(e.dataTransfer.files[0]);
    });

    // File input change
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) handleFileUpload(fileInput.files[0]);
    });
  }

  async function handleFileUpload(file) {
    if (!file.type.startsWith("image/")) {
      alert("Solo se permiten imágenes.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no debe superar los 5MB.");
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      imgPreview.src = e.target.result;
      imgPreview.style.display = "block";
      dropContent.style.display = "none";
    };
    reader.readAsDataURL(file);

    // Upload to server
    const formData = new FormData();
    formData.append("imagen", file);
    try {
      const res = await fetch(`${API}/servicios/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        document.getElementById("svcImagen").value = data.filename;
      } else {
        alert(data.error || "Error al subir la imagen.");
      }
    } catch {
      alert("Error de conexión al subir imagen.");
    }
  }

  if (btnNuevoServicio) {
    btnNuevoServicio.addEventListener("click", () => openServicioModal());
  }
  if (btnCancelServicio) {
    btnCancelServicio.addEventListener("click", () => {
      modalServicio.classList.remove("active");
    });
  }

  // Save (create/edit)
  if (formServicio) {
    formServicio.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("svcId").value;
      const body = {
        nombre: document.getElementById("svcNombre").value.trim(),
        descripcion: document.getElementById("svcDescripcion").value.trim(),
        duracion_min:
          Number(document.getElementById("svcDuracion").value) || 30,
        precio: Number(document.getElementById("svcPrecio").value) || 0,
        imagen: document.getElementById("svcImagen").value.trim() || null,
      };
      if (!body.nombre) {
        alert("El nombre es obligatorio.");
        return;
      }

      try {
        const url = id ? `${API}/servicios/${id}` : `${API}/servicios`;
        const method = id ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json();
          alert(d.error || "Error al guardar.");
          return;
        }
        modalServicio.classList.remove("active");
        loadServiciosList();
        alert(id ? "✅ Servicio actualizado." : "✅ Servicio creado.");
      } catch {
        alert("Error de conexión.");
      }
    });
  }

  // Edit / Delete via event delegation on table
  if (serviciosBody) {
    serviciosBody.addEventListener("click", async (e) => {
      const editBtn = e.target.closest(".svc-edit");
      const deleteBtn = e.target.closest(".svc-delete");

      if (editBtn) {
        const id = editBtn.dataset.id;
        try {
          const res = await fetch(`${API}/servicios/${id}`);
          const servicio = await res.json();
          openServicioModal(servicio);
        } catch {
          alert("Error al cargar servicio.");
        }
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm("¿Eliminar este servicio?")) return;
        try {
          const res = await fetch(`${API}/servicios/${id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const d = await res.json();
            alert(d.error || "Error al eliminar.");
            return;
          }
          loadServiciosList();
          alert("✅ Servicio eliminado.");
        } catch {
          alert("Error de conexión.");
        }
      }
    });
  }

  /* ========== INIT ========== */
  loadServicios();
  loadServiciosList();
  loadStats();
  loadBloqueos();
  loadRendimiento();
});

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
