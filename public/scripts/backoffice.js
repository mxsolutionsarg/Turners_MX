// scripts/backoffice.js – Backoffice panel logic
(function () {
  const API = "/api/backoffice";
  let storedKey = "";

  // DOM refs
  const authScreen = document.getElementById("authScreen");
  const panelScreen = document.getElementById("panelScreen");
  const authForm = document.getElementById("authForm");
  const authError = document.getElementById("authError");
  const secretKeyInput = document.getElementById("secretKey");
  const createForm = document.getElementById("createForm");
  const adminsBody = document.getElementById("adminsBody");
  const btnLogout = document.getElementById("btnLogout");
  const toastContainer = document.getElementById("toastContainer");

  // ── Toast ──
  function toast(msg, type) {
    const el = document.createElement("div");
    el.className = "toast toast-" + type;
    el.textContent = msg;
    toastContainer.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  }

  // ── Auth ──
  authForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    authError.style.display = "none";
    var key = secretKeyInput.value.trim();
    if (!key) return;

    try {
      var res = await fetch(API + "/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key }),
      });
      var data = await res.json();
      if (!res.ok) {
        authError.textContent = data.error || "Clave incorrecta.";
        authError.style.display = "block";
        return;
      }
      storedKey = key;
      authScreen.style.display = "none";
      panelScreen.style.display = "block";
      loadAdmins();
    } catch (err) {
      authError.textContent = "Error de conexión.";
      authError.style.display = "block";
    }
  });

  // ── Logout ──
  btnLogout.addEventListener("click", function () {
    storedKey = "";
    panelScreen.style.display = "none";
    authScreen.style.display = "flex";
    secretKeyInput.value = "";
  });

  // ── Load Admins ──
  async function loadAdmins() {
    try {
      var res = await fetch(API + "/admins", {
        headers: { "x-backoffice-key": storedKey },
      });
      var admins = await res.json();
      renderAdmins(admins);
    } catch (err) {
      adminsBody.innerHTML = '<tr><td colspan="5" class="empty-msg">Error cargando admins</td></tr>';
    }
  }

  function renderAdmins(admins) {
    if (!admins || admins.length === 0) {
      adminsBody.innerHTML = '<tr><td colspan="5" class="empty-msg">No hay administradores</td></tr>';
      return;
    }
    adminsBody.innerHTML = admins.map(function (a) {
      var fecha = new Date(a.created_at).toLocaleDateString("es-AR");
      return '<tr>' +
        '<td>' + a.id + '</td>' +
        '<td>' + a.nombre + ' ' + (a.apellido || '') + '</td>' +
        '<td>' + a.email + '</td>' +
        '<td>' + fecha + '</td>' +
        '<td><button class="btn-delete" data-id="' + a.id + '" data-name="' + a.nombre + '">Eliminar</button></td>' +
        '</tr>';
    }).join("");

    // Attach delete handlers
    adminsBody.querySelectorAll(".btn-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        var name = btn.getAttribute("data-name");
        deleteAdmin(id, name);
      });
    });
  }

  // ── Create Admin ──
  createForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var nombre = document.getElementById("adminNombre").value.trim();
    var apellido = document.getElementById("adminApellido").value.trim();
    var email = document.getElementById("adminEmail").value.trim();
    var password = document.getElementById("adminPassword").value;

    if (!nombre || !email || !password) {
      toast("Completá los campos obligatorios.", "error");
      return;
    }

    try {
      var res = await fetch(API + "/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-backoffice-key": storedKey,
        },
        body: JSON.stringify({ nombre: nombre, apellido: apellido, email: email, password: password }),
      });
      var data = await res.json();
      if (!res.ok) {
        toast(data.error || "Error al crear admin.", "error");
        return;
      }
      toast("✅ Admin " + nombre + " creado con éxito.", "success");
      createForm.reset();
      loadAdmins();
    } catch (err) {
      toast("Error de conexión.", "error");
    }
  });

  // ── Delete Admin ──
  async function deleteAdmin(id, name) {
    if (!confirm("¿Seguro que querés eliminar a " + name + "?")) return;

    try {
      var res = await fetch(API + "/admins/" + id, {
        method: "DELETE",
        headers: { "x-backoffice-key": storedKey },
      });
      var data = await res.json();
      if (!res.ok) {
        toast(data.error || "Error al eliminar.", "error");
        return;
      }
      toast("Admin eliminado.", "success");
      loadAdmins();
    } catch (err) {
      toast("Error de conexión.", "error");
    }
  }
})();
