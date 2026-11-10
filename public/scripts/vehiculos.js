// scripts/vehiculos.js – Role-aware CRUD
const API_V = "/api/vehiculos";
const API_C = "/api/clientes";

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

  const tbody = document.getElementById("vehiculosBody");
  const modal = document.getElementById("modalVehiculo");
  const modalTitle = document.getElementById("modalVehiculoTitle");
  const form = document.getElementById("formVehiculo");
  const btnNuevo = document.getElementById("btnNuevoVehiculo");
  const btnCancel = document.getElementById("btnCancelVehiculo");
  const searchInput = document.getElementById("searchVehiculo");
  const selCliente = document.getElementById("vCliente");
  const clienteGroup = document.getElementById("clienteGroup");

  // Hide client selector for non-admin users
  if (!isAdmin && clienteGroup) {
    clienteGroup.style.display = "none";
  }

  // Update page title for clients
  const h1 = document.querySelector(".container h1");
  if (h1 && !isAdmin) h1.textContent = "Mis Vehículos";

  // Hide "Cliente" column for non-admin users
  if (!isAdmin) {
    document
      .querySelectorAll('th.col-cliente, td.col-cliente, [data-col="cliente"]')
      .forEach((el) => (el.style.display = "none"));
    // Also hide via column index (6th column, index 5)
    const table = document.querySelector("table");
    if (table) {
      const rows = table.querySelectorAll("tr");
      rows.forEach((row) => {
        const cells = row.children;
        if (cells.length >= 6) cells[5].style.display = "none";
      });
    }
  }

  let allVehiculos = [];
  let allClientes = [];

  async function load() {
    try {
      // Clients see only their vehicles; admin sees all
      const url = isAdmin ? API_V : `${API_V}?usuario_id=${user.id}`;
      const resV = await fetch(url);
      allVehiculos = await resV.json();

      if (isAdmin) {
        const resC = await fetch(API_C);
        allClientes = await resC.json();
      }

      render(allVehiculos);
    } catch (err) {
      console.error(err);
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:#ef4444;">Error al cargar</td></tr>';
    }
  }

  function render(list) {
    tbody.innerHTML = "";
    if (list.length === 0) {
      const msg = isAdmin
        ? "No hay vehículos registrados."
        : "No tenés vehículos registrados. ¡Agregá uno!";
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">${msg}</td></tr>`;
      return;
    }
    list.forEach((v) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong style="color:var(--accent);">${esc(v.dominio)}</strong></td>
        <td>${esc(v.marca)}</td>
        <td>${esc(v.modelo)}</td>
        <td>${v.anio || "-"}</td>
        <td>${esc(v.color || "-")}</td>
        <td${!isAdmin ? ' style="display:none"' : ""}>${isAdmin ? esc((v.cliente_nombre || "") + " " + (v.cliente_apellido || "")) : ""}</td>
        <td>
          <button class="btn btn-outline sm" data-edit="${v.id}">Editar</button>
          <button class="btn btn-danger sm" data-del="${v.id}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  searchInput?.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    render(
      allVehiculos.filter((v) =>
        `${v.dominio} ${v.marca} ${v.modelo}`.toLowerCase().includes(q),
      ),
    );
  });

  function populateClientes() {
    if (!selCliente) return;
    selCliente.innerHTML = '<option value="">Seleccionar cliente...</option>';
    allClientes.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.nombre} ${c.apellido}`;
      selCliente.appendChild(opt);
    });
  }

  function openModal(vehiculo = null) {
    form.reset();
    document.getElementById("vehiculoId").value = "";
    if (isAdmin) populateClientes();

    if (vehiculo) {
      modalTitle.textContent = "Editar Vehículo";
      document.getElementById("vehiculoId").value = vehiculo.id;
      document.getElementById("vDominio").value = vehiculo.dominio;
      document.getElementById("vMarca").value = vehiculo.marca;
      document.getElementById("vModelo").value = vehiculo.modelo;
      document.getElementById("vAnio").value = vehiculo.anio || "";
      document.getElementById("vColor").value = vehiculo.color || "";
      if (selCliente) selCliente.value = vehiculo.cliente_id || "";
    } else {
      modalTitle.textContent = isAdmin ? "Nuevo Vehículo" : "Agregar Vehículo";
    }
    modal.classList.add("active");
  }

  function closeModal() {
    modal.classList.remove("active");
  }

  btnNuevo?.addEventListener("click", () => openModal());
  btnCancel?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("vehiculoId").value;
    const body = {
      dominio: document.getElementById("vDominio").value.trim().toUpperCase(),
      marca: document.getElementById("vMarca").value.trim(),
      modelo: document.getElementById("vModelo").value.trim(),
      anio: document.getElementById("vAnio").value
        ? Number(document.getElementById("vAnio").value)
        : null,
      color: document.getElementById("vColor").value.trim(),
      cliente_id:
        isAdmin && selCliente ? Number(selCliente.value) || null : null,
      usuario_id: isAdmin ? null : user.id, // Clients link vehicle to their account
    };

    try {
      const url = id ? `${API_V}/${id}` : API_V;
      const method = id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al guardar.");
        return;
      }
      closeModal();
      load();
    } catch (err) {
      alert("No se pudo conectar con el servidor.");
      console.error(err);
    }
  });

  tbody?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit]");
    if (editBtn) {
      const vehiculo = allVehiculos.find(
        (v) => String(v.id) === editBtn.dataset.edit,
      );
      if (vehiculo) openModal(vehiculo);
      return;
    }

    const delBtn = e.target.closest("[data-del]");
    if (delBtn) {
      if (!confirm("¿Eliminar este vehículo?")) return;
      try {
        await fetch(`${API_V}/${delBtn.dataset.del}`, { method: "DELETE" });
        load();
      } catch (err) {
        console.error(err);
      }
    }
  });

  load();
});

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
