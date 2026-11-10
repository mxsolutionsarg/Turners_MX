// backend/routes/bloqueos.js – CRUD for blocked dates (Supabase)
const router = require("express").Router();
const supabase = require("../db/connection");

// GET /api/bloqueos
router.get("/", async (_req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from("bloqueos")
      .select("*")
      .order("fecha_inicio", { ascending: true });

    if (error) throw error;
    res.json(rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener bloqueos." });
  }
});

// POST /api/bloqueos
router.post("/", async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, motivo } = req.body;
    if (!fecha_inicio || !fecha_fin) {
      return res
        .status(400)
        .json({ error: "Fecha inicio y fin son obligatorias." });
    }
    const { data, error } = await supabase
      .from("bloqueos")
      .insert({
        fecha_inicio,
        fecha_fin,
        motivo: motivo || "Cerrado",
      })
      .select("id")
      .single();

    if (error) throw error;
    res
      .status(201)
      .json({ id: data.id, fecha_inicio, fecha_fin, motivo: motivo || "Cerrado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear bloqueo." });
  }
});

// DELETE /api/bloqueos/:id
router.delete("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bloqueos")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0)
      return res.status(404).json({ error: "Bloqueo no encontrado." });
    res.json({ message: "Bloqueo eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar bloqueo." });
  }
});

module.exports = router;
