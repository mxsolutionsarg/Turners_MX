// scripts/register.js – Registration with password confirmation
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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      const eyeIcon = btn.querySelector(".icon-eye");
      const eyeOffIcon = btn.querySelector(".icon-eye-off");
      if (eyeIcon && eyeOffIcon) {
        eyeIcon.style.display = isPassword ? "none" : "block";
        eyeOffIcon.style.display = isPassword ? "block" : "none";
      }
      btn.title = isPassword ? "Ocultar contraseña" : "Mostrar contraseña";
    });
  });

  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (!nombre) {
      showToast("Ingresá tu nombre.", "error");
      return;
    }
    if (!apellido) {
      showToast("Ingresá tu apellido.", "error");
      return;
    }
    if (!email || !isValidEmail(email)) {
      showToast("Ingresá un correo válido.", "error");
      return;
    }
    if (password.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres.", "error");
      return;
    }
    if (password !== confirm) {
      showToast("Las contraseñas no coinciden.", "error");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellido, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Error al registrar.", "error");
        return;
      }

      showToast("Cuenta creada con éxito ✅", "success");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
    } catch (err) {
      showToast("No se pudo conectar con el servidor.", "error");
      console.error(err);
    }
  });
});
