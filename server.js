// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(cors());
app.use(express.json());

/* ── Servir archivos estáticos del frontend ── */
app.use(express.static(path.join(__dirname, "public")));

/* ── Rutas API ── */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/clientes", require("./routes/clientes"));
app.use("/api/vehiculos", require("./routes/vehiculos"));
app.use("/api/servicios", require("./routes/servicios"));
app.use("/api/turnos", require("./routes/turnos"));
app.use("/api/seguimientos", require("./routes/seguimientos"));
app.use("/api/bloqueos", require("./routes/bloqueos"));
app.use("/api/presupuestos", require("./routes/presupuestos"));
app.use("/api/backoffice", require("./routes/backoffice"));

/* ── Redirigir raíz al index ── */
app.get("/", (_req, res) => res.redirect("/views/index.html"));

/* ── Health check ── */
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

/* ── Inicio ── */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Turners API corriendo en http://localhost:${PORT}`);
});
