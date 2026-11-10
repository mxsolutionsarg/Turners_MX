// backend/routes/turnos.js – With status editing, duration-aware slots, and blocked dates (Supabase)
const router = require("express").Router();
const supabase = require("../db/connection");

// GET /api/turnos/disponibles?fecha=X&servicio_id=Y (MUST be before /:id)
router.get("/disponibles", async (req, res) => {
  try {
    const { fecha, servicio_id } = req.query;
    if (!fecha || !servicio_id) {
      return res
        .status(400)
        .json({ error: "Fecha y servicio_id son obligatorios." });
    }

    // Check if date is blocked
    const { data: bloqueados, error: bloqErr } = await supabase
      .from("bloqueos")
      .select("id")
      .lte("fecha_inicio", fecha)
      .gte("fecha_fin", fecha);

    if (bloqErr) throw bloqErr;
    if (bloqueados && bloqueados.length > 0) {
      return res.json([]); // No slots available — date blocked
    }

    // Get service duration
    const { data: servicio, error: servErr } = await supabase
      .from("servicios")
      .select("duracion_min")
      .eq("id", servicio_id)
      .maybeSingle();

    if (servErr) throw servErr;
    const duracionMin = servicio ? servicio.duracion_min : 30;
    const slotsNeeded = Math.ceil(duracionMin / 30); // How many 30-min slots this service needs

    // Get occupied slots with their durations
    const { data: ocupados, error: ocupErr } = await supabase
      .from("turnos")
      .select("hora, servicios:servicio_id(duracion_min)")
      .eq("fecha", fecha);

    if (ocupErr) throw ocupErr;

    // Build a set of all occupied 30-min blocks
    const ocupadosSet = new Set();
    (ocupados || []).forEach((r) => {
      const [hh, mm] = String(r.hora).slice(0, 5).split(":").map(Number);
      const rDur = r.servicios?.duracion_min ?? 30;
      const blocks = Math.ceil(rDur / 30);
      for (let i = 0; i < blocks; i++) {
        const totalMin = hh * 60 + mm + i * 30;
        const bh = String(Math.floor(totalMin / 60)).padStart(2, "0");
        const bm = String(totalMin % 60).padStart(2, "0");
        ocupadosSet.add(`${bh}:${bm}`);
      }
    });

    // Generate all 30-min slots from 09:00 to 18:00
    const allSlots = [];
    for (let h = 9; h <= 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 18 && m > 0) break;
        allSlots.push(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        );
      }
    }

    // Filter: only slots where ALL consecutive blocks needed are free
    const available = [];
    for (const slot of allSlots) {
      const [sh, sm] = slot.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = startMin + duracionMin;

      // Don't exceed business hours (18:00 = 1080 min)
      if (endMin > 18 * 60) continue;

      let free = true;
      for (let i = 0; i < slotsNeeded; i++) {
        const checkMin = startMin + i * 30;
        const ch = String(Math.floor(checkMin / 60)).padStart(2, "0");
        const cm = String(checkMin % 60).padStart(2, "0");
        if (ocupadosSet.has(`${ch}:${cm}`)) {
          free = false;
          break;
        }
      }
      if (free) available.push(slot);
    }

    res.json(available);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener disponibilidad." });
  }
});

// GET /api/turnos?usuario_id=X
router.get("/", async (req, res) => {
  try {
    const { usuario_id } = req.query;

    let query = supabase
      .from("turnos")
      .select(
        `
        *,
        servicios:servicio_id(nombre, duracion_min),
        clientes:cliente_id(nombre, apellido),
        vehiculos:vehiculo_id(dominio),
        usuarios:usuario_id(nombre, email)
      `
      )
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });

    if (usuario_id) {
      query = query.eq("usuario_id", usuario_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).map(
      ({ servicios, clientes, vehiculos, usuarios, ...t }) => ({
        ...t,
        servicio_nombre: servicios?.nombre || null,
        duracion_min: servicios?.duracion_min ?? null,
        cliente_nombre: clientes?.nombre || null,
        cliente_apellido: clientes?.apellido || null,
        vehiculo_dominio: vehiculos?.dominio || null,
        usuario_nombre: usuarios?.nombre || null,
        usuario_email: usuarios?.email || null,
      })
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener turnos." });
  }
});

// POST /api/turnos
router.post("/", async (req, res) => {
  try {
    const { fecha, hora, servicio_id, cliente_id, vehiculo_id, usuario_id } =
      req.body;

    if (!fecha || !hora || !servicio_id || !usuario_id) {
      return res
        .status(400)
        .json({ error: "Fecha, hora, servicio y usuario son obligatorios." });
    }

    // Check if date is blocked
    const { data: bloqueados, error: bloqErr } = await supabase
      .from("bloqueos")
      .select("id")
      .lte("fecha_inicio", fecha)
      .gte("fecha_fin", fecha);

    if (bloqErr) throw bloqErr;
    if (bloqueados && bloqueados.length > 0) {
      return res
        .status(409)
        .json({ error: "Esa fecha está bloqueada (el taller no atiende)." });
    }

    // Check for overlap with duration awareness
    const { data: servicio, error: servErr } = await supabase
      .from("servicios")
      .select("duracion_min")
      .eq("id", servicio_id)
      .maybeSingle();

    if (servErr) throw servErr;
    const duracionMin = servicio ? servicio.duracion_min : 30;
    const slotsNeeded = Math.ceil(duracionMin / 30);

    const [hh, mm] = String(hora).split(":").map(Number);
    const startMin = hh * 60 + mm;

    // Fetch existing turnos on this date to check overlaps
    const { data: existingTurnos, error: exErr } = await supabase
      .from("turnos")
      .select("id, hora, servicios:servicio_id(duracion_min)")
      .eq("fecha", fecha);

    if (exErr) throw exErr;

    for (let i = 0; i < slotsNeeded; i++) {
      const checkMin = startMin + i * 30;
      const hasConflict = (existingTurnos || []).some((t) => {
        const [th, tm] = String(t.hora).slice(0, 5).split(":").map(Number);
        const tStart = th * 60 + tm;
        const tDur = t.servicios?.duracion_min ?? 30;
        return checkMin >= tStart && checkMin < tStart + tDur;
      });

      if (hasConflict) {
        return res.status(409).json({ error: "Ese horario ya está ocupado." });
      }
    }

    // Auto-resolve cliente_id from usuario_id if not provided
    let resolvedClienteId = cliente_id || null;
    if (!resolvedClienteId && usuario_id) {
      const { data: clienteRow } = await supabase
        .from("clientes")
        .select("id")
        .eq("usuario_id", usuario_id)
        .maybeSingle();
      if (clienteRow) resolvedClienteId = clienteRow.id;
    }

    const { data: created, error } = await supabase
      .from("turnos")
      .insert({
        fecha,
        hora,
        servicio_id,
        cliente_id: resolvedClienteId,
        vehiculo_id: vehiculo_id || null,
        usuario_id,
      })
      .select("id")
      .single();

    if (error) throw error;

    res
      .status(201)
      .json({ id: created.id, fecha, hora, servicio_id, usuario_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear el turno." });
  }
});

// PUT /api/turnos/:id (update estado, fecha, hora)
router.put("/:id", async (req, res) => {
  try {
    const { estado, fecha, hora } = req.body;
    const updates = {};

    if (estado) updates.estado = estado;
    if (fecha) updates.fecha = fecha;
    if (hora) updates.hora = hora;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nada para actualizar." });
    }

    const { data, error } = await supabase
      .from("turnos")
      .update(updates)
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0)
      return res.status(404).json({ error: "Turno no encontrado." });
    res.json({ message: "Turno actualizado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el turno." });
  }
});

// DELETE /api/turnos/:id
router.delete("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("turnos")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0)
      return res.status(404).json({ error: "Turno no encontrado." });
    res.json({ message: "Turno eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el turno." });
  }
});

module.exports = router;
