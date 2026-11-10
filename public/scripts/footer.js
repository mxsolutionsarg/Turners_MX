// scripts/footer.js
document.addEventListener("DOMContentLoaded", () => {
  const footerDiv = document.getElementById("footer");
  if (!footerDiv) return;

  fetch("../views/footer.html")
    .then(res => res.text())
    .then(html => { footerDiv.innerHTML = html; })
    .catch(() => {
      footerDiv.innerHTML = `
        <footer class="footer">
          <p>&copy; 2025 Turners</p>
        </footer>
      `;
    });
});
