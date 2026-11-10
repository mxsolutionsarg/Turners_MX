// backend/routes/vehiculos.js – With usuario_id support (Supabase)
const router = require("express").Router();
const supabase = require("../db/connection");

function mapVehiculoRow(row) {
  const { clientes, ...v } = row;
  return {
    ...v,
    cliente_nombre: clientes?.nombre || null,
    cliente_apellido: clientes?.apellido || null,
  };
}

// GET /api/vehiculos?usuario_id=X  (filter by user for clients)
router.get("/", async (req, res) => {
  try {
    const { usuario_id } = req.query;

    const { data, error } = await supabase
      .from("vehiculos")
      .select("*, clientes:cliente_id(nombre, apellido)")
      .order("dominio", { ascending: true });

    if (error) throw error;

    let rows = data || [];

    if (usuario_id) {
      // Find client IDs linked to this user (by usuario_id or matching email)
      const { data: userRow } = await supabase
        .from("usuarios")
        .select("email")
        .eq("id", usuario_id)
        .maybeSingle();

      const matchingClientIds = new Set();
      const { data: allClients } = await supabase
        .from("clientes")
        .select("id, email, usuario_id");

      (allClients || []).forEach((cl) => {
        if (String(cl.usuario_id) === String(usuario_id)) {
          matchingClientIds.add(cl.id);
        } else if (
          userRow?.email &&
          cl.email &&
          cl.email.toLowerCase() === userRow.email.toLowerCase()
        ) {
          matchingClientIds.add(cl.id);
        }
      });

      rows = rows.filter(
        (v) =>
          String(v.usuario_id) === String(usuario_id) ||
          (v.cliente_id && matchingClientIds.has(v.cliente_id))
      );
    }

    res.json(rows.map(mapVehiculoRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener vehículos." });
  }
});

// GET /api/vehiculos/dominio/:dominio (placed before /:id to avoid ambiguity)
router.get("/dominio/:dominio", async (req, res) => {
  try {
    const { data: row, error } = await supabase
      .from("vehiculos")
      .select("*, clientes:cliente_id(nombre, apellido)")
      .eq("dominio", req.params.dominio.toUpperCase())
      .maybeSingle();

    if (error) throw error;
    if (!row)
      return res
        .status(404)
        .json({ error: "Vehículo no encontrado con ese dominio." });
    res.json(mapVehiculoRow(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar vehículo." });
  }
});

// GET /api/vehiculos/:id
router.get("/:id", async (req, res) => {
  try {
    const { data: row, error } = await supabase
      .from("vehiculos")
      .select("*, clientes:cliente_id(nombre, apellido)")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!row)
      return res.status(404).json({ error: "Vehículo no encontrado." });
    res.json(mapVehiculoRow(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el vehículo." });
  }
});

// POST /api/vehiculos
router.post("/", async (req, res) => {
  try {
    const { dominio, marca, modelo, anio, color, cliente_id, usuario_id } =
      req.body;
    if (!dominio || !marca || !modelo) {
      return res
        .status(400)
        .json({ error: "Dominio, marca y modelo son obligatorios." });
    }
    // Auto-resolve cliente_id from usuario_id if not provided
    let resolvedClienteId = cliente_id || null;
    if (!resolvedClienteId && usuario_id) {
      const { data: cl } = await supabase
        .from("clientes")
        .select("id")
        .eq("usuario_id", usuario_id)
        .maybeSingle();
      if (cl) resolvedClienteId = cl.id;
    }

    const { data, error } = await supabase
      .from("vehiculos")
      .insert({
        dominio: dominio.toUpperCase(),
        marca,
        modelo,
        anio: anio || null,
        color: color || null,
        cliente_id: resolvedClienteId,
        usuario_id: usuario_id || null,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "Ya existe un vehículo con ese dominio." });
      }
      throw error;
    }

    res.status(201).json({
      id: data.id,
      dominio: dominio.toUpperCase(),
      marca,
      modelo,
      anio,
      color,
      usuario_id,
    });
  } catch (err) {
    if (err.code === "23505" || err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Ya existe un vehículo con ese dominio." });
    }
    console.error(err);
    res.status(500).json({ error: "Error al crear el vehículo." });
  }
});

// PUT /api/vehiculos/:id
router.put("/:id", async (req, res) => {
  try {
    const { dominio, marca, modelo, anio, color, cliente_id, usuario_id } =
      req.body;
    const { data, error } = await supabase
      .from("vehiculos")
      .update({
        dominio: dominio?.toUpperCase(),
        marca,
        modelo,
        anio: anio || null,
        color: color || null,
        cliente_id: cliente_id || null,
        usuario_id: usuario_id || null,
      })
      .eq("id", req.params.id)
      .select("id");

    if (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "Ya existe un vehículo con ese dominio." });
      }
      throw error;
    }
    if (!data || data.length === 0)
      return res.status(404).json({ error: "Vehículo no encontrado." });
    res.json({ message: "Vehículo actualizado." });
  } catch (err) {
    if (err.code === "23505" || err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Ya existe un vehículo con ese dominio." });
    }
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el vehículo." });
  }
});

// DELETE /api/vehiculos/:id
router.delete("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vehiculos")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0)
      return res.status(404).json({ error: "Vehículo no encontrado." });
    res.json({ message: "Vehículo eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el vehículo." });
  }
});

module.exports = router;
