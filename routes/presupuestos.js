// backend/routes/presupuestos.js – CRUD for quotes with line items (Supabase)
const router = require("express").Router();
const supabase = require("../db/connection");

// GET /api/presupuestos  — all (admin) or by vehiculo owner (client)
router.get("/", async (req, res) => {
  try {
    const { usuario_id } = req.query;

    const { data, error } = await supabase
      .from("presupuestos")
      .select(
        `
        *,
        vehiculos:vehiculo_id(dominio, marca, modelo, anio, usuario_id),
        usuarios:usuario_id(nombre),
        turnos:turno_id(fecha, hora, servicios:servicio_id(nombre))
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    let rows = data || [];
    if (usuario_id) {
      rows = rows.filter(
        (p) => String(p.vehiculos?.usuario_id) === String(usuario_id)
      );
    }

    const mapped = rows.map(({ vehiculos, usuarios, turnos, ...p }) => ({
      ...p,
      dominio: vehiculos?.dominio || null,
      marca: vehiculos?.marca || null,
      modelo: vehiculos?.modelo || null,
      anio: vehiculos?.anio ?? null,
      admin_nombre: usuarios?.nombre || null,
      turno_fecha: turnos?.fecha || null,
      turno_hora: turnos?.hora || null,
      servicio_nombre: turnos?.servicios?.nombre || null,
    }));

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener presupuestos." });
  }
});

// GET /api/presupuestos/turno/:turnoId — get presupuesto by turno (placed before /:id)
router.get("/turno/:turnoId", async (req, res) => {
  try {
    const { data: row, error } = await supabase
      .from("presupuestos")
      .select("id")
      .eq("turno_id", req.params.turnoId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!row)
      return res
        .status(404)
        .json({ error: "No hay presupuesto para este turno." });
    res.json({ presupuesto_id: row.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar presupuesto." });
  }
});

// GET /api/presupuestos/:id  — detail with items
router.get("/:id", async (req, res) => {
  try {
    const { data: row, error } = await supabase
      .from("presupuestos")
      .select(
        `
        *,
        vehiculos:vehiculo_id(
          dominio, marca, modelo, anio, usuario_id,
          clientes:cliente_id(nombre, apellido),
          owner:usuario_id(nombre, email)
        ),
        usuarios:usuario_id(nombre),
        turnos:turno_id(fecha, hora, servicios:servicio_id(nombre))
      `
      )
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!row)
      return res.status(404).json({ error: "Presupuesto no encontrado." });

    const { vehiculos, usuarios, turnos, ...p } = row;
    const presupuesto = {
      ...p,
      dominio: vehiculos?.dominio || null,
      marca: vehiculos?.marca || null,
      modelo: vehiculos?.modelo || null,
      anio: vehiculos?.anio ?? null,
      vehiculo_usuario_id: vehiculos?.usuario_id ?? null,
      admin_nombre: usuarios?.nombre || null,
      turno_fecha: turnos?.fecha || null,
      turno_hora: turnos?.hora || null,
      servicio_nombre: turnos?.servicios?.nombre || null,
      cliente_nombre: vehiculos?.clientes?.nombre || null,
      cliente_apellido: vehiculos?.clientes?.apellido || null,
      vehiculo_owner_nombre: vehiculos?.owner?.nombre || null,
      vehiculo_owner_email: vehiculos?.owner?.email || null,
    };

    const { data: items, error: itemsErr } = await supabase
      .from("presupuesto_items")
      .select("*")
      .eq("presupuesto_id", req.params.id)
      .order("id", { ascending: true });

    if (itemsErr) throw itemsErr;

    presupuesto.items = items || [];
    res.json(presupuesto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener presupuesto." });
  }
});

// POST /api/presupuestos — create with items
router.post("/", async (req, res) => {
  try {
    const { turno_id, vehiculo_id, usuario_id, fecha, observaciones, items } =
      req.body;

    if (!usuario_id || !fecha) {
      return res
        .status(400)
        .json({ error: "Usuario y fecha son obligatorios." });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Debe incluir al menos un ítem." });
    }

    const { data: created, error: presErr } = await supabase
      .from("presupuestos")
      .insert({
        turno_id: turno_id || null,
        vehiculo_id: vehiculo_id || null,
        usuario_id,
        fecha,
        observaciones: observaciones || null,
      })
      .select("id")
      .single();

    if (presErr) throw presErr;
    const presupuestoId = created.id;

    const itemsPayload = items.map((item) => ({
      presupuesto_id: presupuestoId,
      descripcion: item.descripcion,
      cantidad: item.cantidad || 1,
      precio_unitario: item.precio_unitario,
    }));

    const { error: itemsErr } = await supabase
      .from("presupuesto_items")
      .insert(itemsPayload);

    if (itemsErr) {
      await supabase.from("presupuestos").delete().eq("id", presupuestoId);
      throw itemsErr;
    }

    res.status(201).json({ message: "Presupuesto creado.", id: presupuestoId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear presupuesto." });
  }
});

// PUT /api/presupuestos/:id — update header + replace items
router.put("/:id", async (req, res) => {
  try {
    const { observaciones, estado, items } = req.body;
    const updates = {};

    if (observaciones !== undefined) updates.observaciones = observaciones;
    if (estado) updates.estado = estado;

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase
        .from("presupuestos")
        .update(updates)
        .eq("id", req.params.id);

      if (updErr) throw updErr;
    }

    if (items && Array.isArray(items)) {
      const { error: delErr } = await supabase
        .from("presupuesto_items")
        .delete()
        .eq("presupuesto_id", req.params.id);

      if (delErr) throw delErr;

      if (items.length > 0) {
        const itemsPayload = items.map((item) => ({
          presupuesto_id: req.params.id,
          descripcion: item.descripcion,
          cantidad: item.cantidad || 1,
          precio_unitario: item.precio_unitario,
        }));

        const { error: insErr } = await supabase
          .from("presupuesto_items")
          .insert(itemsPayload);

        if (insErr) throw insErr;
      }
    }

    res.json({ message: "Presupuesto actualizado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar presupuesto." });
  }
});

// DELETE /api/presupuestos/:id
router.delete("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("presupuestos")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0)
      return res.status(404).json({ error: "No encontrado." });
    res.json({ message: "Presupuesto eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar." });
  }
});

module.exports = router;
