// scripts/navbar.js – Role-based navigation with logout toast
document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const authLink = document.getElementById("authLink");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () =>
      navLinks.classList.toggle("show"),
    );
  }

  const getActiveUser = () => {
    try {
      return JSON.parse(localStorage.getItem("activeUser"));
    } catch {
      return null;
    }
  };

  const findLink = (href) =>
    navLinks ? navLinks.querySelector(`a[href="${href}"]`) : null;

  const removeLinks = (href) => {
    if (!navLinks) return;
    navLinks.querySelectorAll(`a[href="${href}"]`).forEach((a) => {
      const li = a.closest("li");
      (li || a).remove();
    });
  };

  const createLiLink = (href, text) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    li.appendChild(a);
    return li;
  };

  const insertAfter = (newNode, referenceNode) => {
    if (!referenceNode || !referenceNode.parentNode) return;
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  };

  function showToast(message, type = "info") {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Clean up dynamic links
  [
    "turnos.html",
    "clientes.html",
    "vehiculos.html",
    "seguimientos.html",
    "dashboard.html",
  ].forEach(removeLinks);

  if (!authLink) return;
  const user = getActiveUser();

  if (user) {
    authLink.textContent = "Cerrar sesión";
    authLink.href = "#";
    authLink.classList.remove("login-button");

    const clone = authLink.cloneNode(true);
    authLink.parentNode.replaceChild(clone, authLink);
    clone.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        localStorage.removeItem("activeUser");
        showToast("Sesión cerrada correctamente 👋", "info");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1000);
      },
      { once: true },
    );

    if (user.rol === "admin") {
      const serviciosLink = findLink("services.html");
      if (serviciosLink) {
        const li = serviciosLink.closest("li");
        (li || serviciosLink).remove();
      }

      const inicioLink = findLink("index.html");
      let lastInserted = inicioLink?.closest("li") || inicioLink;

      const items = [
        { href: "dashboard.html", text: "📊 Dashboard" },
        { href: "clientes.html", text: "Clientes" },
        { href: "vehiculos.html", text: "Vehículos" },
        { href: "seguimientos.html", text: "Seguimientos" },
      ];
      items.forEach((item) => {
        const li = createLiLink(item.href, item.text);
        if (lastInserted) {
          insertAfter(li, lastInserted);
          lastInserted = li;
        } else if (navLinks) {
          navLinks.insertBefore(li, clone.closest("li") || clone);
        }
      });
    } else {
      const serviciosAnchor = findLink("services.html");
      let lastInserted = serviciosAnchor?.closest("li") || serviciosAnchor;

      const items = [
        { href: "turnos.html", text: "Mis Turnos" },
        { href: "vehiculos.html", text: "Mis Vehículos" },
        { href: "seguimientos.html", text: "Mi Historial" },
      ];
      items.forEach((item) => {
        const li = createLiLink(item.href, item.text);
        if (lastInserted) {
          insertAfter(li, lastInserted);
          lastInserted = li;
        } else if (navLinks) {
          navLinks.insertBefore(li, clone.closest("li") || clone);
        }
      });
    }
  } else {
    const clone = authLink.cloneNode(true);
    clone.textContent = "Iniciar sesión";
    clone.href = "login.html";
    clone.classList.add("login-button");
    authLink.parentNode.replaceChild(clone, authLink);
  }
});
