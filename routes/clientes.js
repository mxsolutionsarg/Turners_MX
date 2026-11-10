// backend/routes/clientes.js (Supabase)
const router = require("express").Router();
const supabase = require("../db/connection");

// GET /api/clientes
router.get("/", async (_req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from("clientes")
      .select("*")
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) throw error;
    res.json(rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener clientes." });
  }
});

// GET /api/clientes/:id
router.get("/:id", async (req, res) => {
  try {
    const { data: row, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!row) return res.status(404).json({ error: "Cliente no encontrado." });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el cliente." });
  }
});

// POST /api/clientes
router.post("/", async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, dni } = req.body;
    if (!nombre || !apellido) {
      return res
        .status(400)
        .json({ error: "Nombre y apellido son obligatorios." });
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert({
        nombre,
        apellido,
        telefono: telefono || null,
        email: email || null,
        dni: dni || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    res
      .status(201)
      .json({ id: data.id, nombre, apellido, telefono, email, dni });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear el cliente." });
  }
});

// PUT /api/clientes/:id
router.put("/:id", async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, dni } = req.body;
    const { data, error } = await supabase
      .from("clientes")
      .update({
        nombre,
        apellido,
        telefono: telefono || null,
        email: email || null,
        dni: dni || null,
      })
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0)
      return res.status(404).json({ error: "Cliente no encontrado." });
    res.json({ message: "Cliente actualizado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el cliente." });
  }
});

// DELETE /api/clientes/:id
router.delete("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0)
      return res.status(404).json({ error: "Cliente no encontrado." });
    res.json({ message: "Cliente eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el cliente." });
  }
});

module.exports = router;
