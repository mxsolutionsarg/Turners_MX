// /scripts/home.js
document.addEventListener("DOMContentLoaded", () => {
  // CTA "Reservar Turno": si hay sesión -> turnos.html; si no -> login.html
  const cta = document.getElementById("ctaReservar");
  if (cta) {
    cta.addEventListener("click", (e) => {
      e.preventDefault();
      let user = null;
      try { user = JSON.parse(localStorage.getItem("activeUser")); } catch {}
      if (user) {
        window.location.href = "turnos.html";
      } else {
        window.location.href = "login.html";
      }
    });
  }

  const obsEls = document.querySelectorAll(".obs");
  if ("IntersectionObserver" in window && obsEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("in-view");
      });
    }, { threshold: 0.15 });

    obsEls.forEach(el => io.observe(el));
  }
});
