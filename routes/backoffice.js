// backend/routes/backoffice.js – Protected backoffice for admin management (Supabase)
const router = require("express").Router();
const supabase = require("../db/connection");
const bcrypt = require("bcryptjs");

// Middleware: verify backoffice key on every request
function verifyKey(req, res, next) {
  const key = req.headers["x-backoffice-key"];
  if (!key || key !== process.env.BACKOFFICE_KEY) {
    return res.status(403).json({ error: "Acceso denegado." });
  }
  next();
}

// POST /api/backoffice/auth – validate the secret key
router.post("/auth", (req, res) => {
  const { key } = req.body;
  if (!key || key !== process.env.BACKOFFICE_KEY) {
    return res.status(403).json({ error: "Clave incorrecta." });
  }
  res.json({ message: "Acceso concedido." });
});

// GET /api/backoffice/admins – list all admin users
router.get("/admins", verifyKey, async (_req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from("usuarios")
      .select("id, nombre, apellido, email, created_at")
      .eq("rol", "admin")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(rows || []);
  } catch (err) {
    console.error("Backoffice list error:", err);
    res.status(500).json({ error: "Error interno." });
  }
});

// POST /api/backoffice/admins – create a new admin user
router.post("/admins", verifyKey, async (req, res) => {
  try {
    const { nombre, apellido, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res
        .status(400)
        .json({ error: "Nombre, email y contraseña son obligatorios." });
    }

    const normalizedEmail = email.toLowerCase();

    // Check duplicate email
    const { data: existing, error: checkErr } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (existing) {
      return res.status(409).json({ error: "Este correo ya está registrado." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { data: created, error } = await supabase
      .from("usuarios")
      .insert({
        nombre,
        apellido: apellido || "",
        email: normalizedEmail,
        password_hash,
        rol: "admin",
      })
      .select("id")
      .single();

    if (error) throw error;

    res.status(201).json({
      message: "Admin creado con éxito.",
      admin: {
        id: created.id,
        nombre,
        apellido: apellido || "",
        email: normalizedEmail,
      },
    });
  } catch (err) {
    console.error("Backoffice create error:", err);
    res.status(500).json({ error: "Error interno." });
  }
});

// DELETE /api/backoffice/admins/:id – delete an admin user
router.delete("/admins/:id", verifyKey, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting the last admin
    const { data: admins, error: countErr } = await supabase
      .from("usuarios")
      .select("id")
      .eq("rol", "admin");

    if (countErr) throw countErr;
    if (!admins || admins.length <= 1) {
      return res
        .status(400)
        .json({ error: "No se puede eliminar el último administrador." });
    }

    const { data: deleted, error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", id)
      .eq("rol", "admin")
      .select("id");

    if (error) throw error;
    if (!deleted || deleted.length === 0) {
      return res.status(404).json({ error: "Admin no encontrado." });
    }

    res.json({ message: "Admin eliminado." });
  } catch (err) {
    console.error("Backoffice delete error:", err);
    res.status(500).json({ error: "Error interno." });
  }
});

module.exports = router;
