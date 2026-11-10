// backend/routes/servicios.js – Full CRUD for services (Supabase)
const router = require("express").Router();
const supabase = require("../db/connection");
const multer = require("multer");
const path = require("path");

// Multer storage: save to assets/images/services/
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "../public/assets/images/services"));
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /api/servicios/upload — upload service image
router.post("/upload", upload.single("imagen"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "No se subió ninguna imagen válida." });
  }
  res.json({ filename: req.file.filename });
});

// GET /api/servicios
router.get("/", async (_req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from("servicios")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    res.json(rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener servicios." });
  }
});

// GET /api/servicios/:id
router.get("/:id", async (req, res) => {
  try {
    const { data: row, error } = await supabase
      .from("servicios")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!row)
      return res.status(404).json({ error: "Servicio no encontrado." });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el servicio." });
  }
});

// POST /api/servicios
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion, duracion_min, precio, imagen } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }
    let { data, error } = await supabase
      .from("servicios")
      .insert({
        nombre,
        descripcion: descripcion || null,
        duracion_min: duracion_min || 30,
        precio: precio || 0,
        imagen: imagen || null,
      })
      .select("id")
      .single();

    if (error && error.message && error.message.includes("imagen")) {
      const retry = await supabase
        .from("servicios")
        .insert({
          nombre,
          descripcion: descripcion || null,
          duracion_min: duracion_min || 30,
          precio: precio || 0,
        })
        .select("id")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    res.status(201).json({
      id: data.id,
      nombre,
      descripcion,
      duracion_min: duracion_min || 30,
      precio: precio || 0,
      imagen,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear el servicio." });
  }
});

// PUT /api/servicios/:id
router.put("/:id", async (req, res) => {
  try {
    const { nombre, descripcion, duracion_min, precio, imagen } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }
    let { data, error } = await supabase
      .from("servicios")
      .update({
        nombre,
        descripcion: descripcion || null,
        duracion_min: duracion_min || 30,
        precio: precio || 0,
        imagen: imagen || null,
      })
      .eq("id", req.params.id)
      .select("id");

    if (error && error.message && error.message.includes("imagen")) {
      const retry = await supabase
        .from("servicios")
        .update({
          nombre,
          descripcion: descripcion || null,
          duracion_min: duracion_min || 30,
          precio: precio || 0,
        })
        .eq("id", req.params.id)
        .select("id");
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Servicio no encontrado." });
    }
    res.json({ message: "Servicio actualizado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el servicio." });
  }
});

// DELETE /api/servicios/:id
router.delete("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("servicios")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Servicio no encontrado." });
    }
    res.json({ message: "Servicio eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el servicio." });
  }
});

module.exports = router;
