// backend/routes/auth.js – Register + Login with auto-client creation (Supabase)
const router = require("express").Router();
const supabase = require("../db/connection");
const bcrypt = require("bcryptjs");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { nombre, apellido, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res
        .status(400)
        .json({ error: "Nombre, email y contraseña son obligatorios." });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const { data: existing, error: checkErr } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (existing) {
      return res.status(409).json({ error: "Este correo ya está registrado." });
    }

    // Create usuario
    const password_hash = await bcrypt.hash(password, 10);
    const { data: newUser, error: userErr } = await supabase
      .from("usuarios")
      .insert({
        nombre,
        apellido: apellido || "",
        email: normalizedEmail,
        password_hash,
        rol: "cliente",
      })
      .select("id")
      .single();

    if (userErr) throw userErr;
    const userId = newUser.id;

    // Auto-create linked cliente record
    const { error: clientErr } = await supabase.from("clientes").insert({
      nombre,
      apellido: apellido || "",
      email: normalizedEmail,
      usuario_id: userId,
    });

    if (clientErr) {
      // Rollback usuario creation if cliente fails
      await supabase.from("usuarios").delete().eq("id", userId);
      throw clientErr;
    }

    res.status(201).json({
      message: "Usuario registrado con éxito.",
      user: {
        id: userId,
        nombre,
        apellido: apellido || "",
        email: normalizedEmail,
        rol: "cliente",
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email y contraseña son obligatorios." });
    }

    const { data: user, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return res
        .status(401)
        .json({ error: "Correo o contraseña incorrectos." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res
        .status(401)
        .json({ error: "Correo o contraseña incorrectos." });
    }

    res.json({
      message: `Bienvenido, ${user.nombre}`,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido || "",
        email: user.email,
        rol: user.rol || "cliente",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

module.exports = router;
