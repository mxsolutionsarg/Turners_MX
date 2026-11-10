// backend/routes/seguimientos.js (Supabase)
const router = require("express").Router();
const supabase = require("../db/connection");

function mapSeguimientoRow(row) {
  const { vehiculos, servicios, ...seg } = row;
  return {
    ...seg,
    dominio: vehiculos?.dominio || null,
    marca: vehiculos?.marca || null,
    modelo: vehiculos?.modelo || null,
    servicio_nombre: servicios?.nombre || null,
  };
}

// GET /api/seguimientos
router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("seguimientos")
      .select(
        "*, vehiculos:vehiculo_id(dominio, marca, modelo), servicios:servicio_id(nombre)"
      )
      .order("fecha", { ascending: false });

    if (error) throw error;
    res.json((data || []).map(mapSeguimientoRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener seguimientos." });
  }
});

// GET /api/seguimientos/vehiculo/:dominio  → Filtrar por dominio
router.get("/vehiculo/:dominio", async (req, res) => {
  try {
    const dominio = req.params.dominio.toUpperCase();
    const { data: vehiculo, error: vehErr } = await supabase
      .from("vehiculos")
      .select("id")
      .eq("dominio", dominio)
      .maybeSingle();

    if (vehErr) throw vehErr;
    if (!vehiculo) return res.json([]);

    const { data, error } = await supabase
      .from("seguimientos")
      .select(
        "*, vehiculos:vehiculo_id(dominio, marca, modelo), servicios:servicio_id(nombre)"
      )
      .eq("vehiculo_id", vehiculo.id)
      .order("fecha", { ascending: false });

    if (error) throw error;
    res.json((data || []).map(mapSeguimientoRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al filtrar seguimientos." });
  }
});

// POST /api/seguimientos
router.post("/", async (req, res) => {
  try {
    const {
      vehiculo_id,
      servicio_id,
      fecha,
      kilometraje,
      observaciones,
      turno_id,
    } = req.body;

    if (!vehiculo_id || !servicio_id || !fecha) {
      return res
        .status(400)
        .json({ error: "Vehículo, servicio y fecha son obligatorios." });
    }

    const { data, error } = await supabase
      .from("seguimientos")
      .insert({
        vehiculo_id,
        servicio_id,
        fecha,
        kilometraje: kilometraje || null,
        observaciones: observaciones || null,
        turno_id: turno_id || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      vehiculo_id,
      servicio_id,
      fecha,
      kilometraje,
      observaciones,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear seguimiento." });
  }
});

// PUT /api/seguimientos/:id
router.put("/:id", async (req, res) => {
  try {
    const { vehiculo_id, servicio_id, fecha, kilometraje, observaciones } =
      req.body;
    const { data, error } = await supabase
      .from("seguimientos")
      .update({
        vehiculo_id,
        servicio_id,
        fecha,
        kilometraje: kilometraje || null,
        observaciones: observaciones || null,
      })
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0)
      return res.status(404).json({ error: "Seguimiento no encontrado." });
    res.json({ message: "Seguimiento actualizado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar seguimiento." });
  }
});

// DELETE /api/seguimientos/:id
router.delete("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("seguimientos")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0)
      return res.status(404).json({ error: "Seguimiento no encontrado." });
    res.json({ message: "Seguimiento eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar seguimiento." });
  }
});

module.exports = router;
