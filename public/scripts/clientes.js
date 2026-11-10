// scripts/clientes.js – CRUD for clientes via API
const API = "/api/clientes";

document.addEventListener("DOMContentLoaded", () => {
  // Auth guard
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

  const tbody = document.getElementById("clientesBody");
  const modal = document.getElementById("modalCliente");
  const modalTitle = document.getElementById("modalClienteTitle");
  const form = document.getElementById("formCliente");
  const btnNuevo = document.getElementById("btnNuevoCliente");
  const btnCancel = document.getElementById("btnCancelCliente");
  const searchInput = document.getElementById("searchCliente");

  let allClientes = [];

  // ── Load & Render ──
  async function load() {
    try {
      const res = await fetch(API);
      allClientes = await res.json();
      render(allClientes);
    } catch (err) {
      console.error(err);
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:#ef4444;">Error al cargar clientes</td></tr>';
    }
  }

  function render(list) {
    tbody.innerHTML = "";
    if (list.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No hay clientes registrados.</td></tr>';
      return;
    }
    list.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.id}</td>
        <td>${esc(c.nombre)}</td>
        <td>${esc(c.apellido)}</td>
        <td>${esc(c.telefono || "-")}</td>
        <td>${esc(c.email || "-")}</td>
        <td>${esc(c.dni || "-")}</td>
        <td>
          <button class="btn btn-outline sm" data-edit="${c.id}">Editar</button>
          <button class="btn btn-danger sm" data-del="${c.id}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ── Search ──
  searchInput?.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    const filtered = allClientes.filter((c) =>
      `${c.nombre} ${c.apellido} ${c.dni || ""}`.toLowerCase().includes(q),
    );
    render(filtered);
  });

  // ── Modal ──
  function openModal(cliente = null) {
    form.reset();
    document.getElementById("clienteId").value = "";
    if (cliente) {
      modalTitle.textContent = "Editar Cliente";
      document.getElementById("clienteId").value = cliente.id;
      document.getElementById("cNombre").value = cliente.nombre;
      document.getElementById("cApellido").value = cliente.apellido;
      document.getElementById("cTelefono").value = cliente.telefono || "";
      document.getElementById("cEmail").value = cliente.email || "";
      document.getElementById("cDni").value = cliente.dni || "";
    } else {
      modalTitle.textContent = "Nuevo Cliente";
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

  // ── Create / Update ──
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("clienteId").value;
    const body = {
      nombre: document.getElementById("cNombre").value.trim(),
      apellido: document.getElementById("cApellido").value.trim(),
      telefono: document.getElementById("cTelefono").value.trim(),
      email: document.getElementById("cEmail").value.trim(),
      dni: document.getElementById("cDni").value.trim(),
    };

    try {
      const url = id ? `${API}/${id}` : API;
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

  // ── Edit / Delete delegation ──
  tbody?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit]");
    if (editBtn) {
      const id = editBtn.dataset.edit;
      const cliente = allClientes.find((c) => String(c.id) === id);
      if (cliente) openModal(cliente);
      return;
    }

    const delBtn = e.target.closest("[data-del]");
    if (delBtn) {
      if (
        !confirm("¿Eliminar este cliente? Se eliminarán también sus vehículos.")
      )
        return;
      try {
        await fetch(`${API}/${delBtn.dataset.del}`, { method: "DELETE" });
        load();
      } catch (err) {
        console.error(err);
      }
    }
  });

  // ── Init ──
  load();
});

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
