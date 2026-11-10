// scripts/login.js – Role-based redirect
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

document.addEventListener("DOMContentLoaded", () => {
  const togglePasswordBtn = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      const eyeIcon = togglePasswordBtn.querySelector(".icon-eye");
      const eyeOffIcon = togglePasswordBtn.querySelector(".icon-eye-off");
      if (eyeIcon && eyeOffIcon) {
        eyeIcon.style.display = isPassword ? "none" : "block";
        eyeOffIcon.style.display = isPassword ? "block" : "none";
      }
      togglePasswordBtn.title = isPassword
        ? "Ocultar contraseña"
        : "Mostrar contraseña";
    });
  }

  const form = document.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      showToast("Completá todos los campos.", "error");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Error al iniciar sesión.", "error");
        return;
      }

      // Save session with role
      localStorage.setItem("activeUser", JSON.stringify(data.user));
      showToast(`Bienvenido, ${data.user.nombre}`, "success");

      setTimeout(() => {
        // Redirect based on role
        if (data.user.rol === "admin") {
          window.location.href = "dashboard.html";
        } else {
          window.location.href = "index.html";
        }
      }, 900);
    } catch (err) {
      showToast("No se pudo conectar con el servidor.", "error");
      console.error(err);
    }
  });
});
