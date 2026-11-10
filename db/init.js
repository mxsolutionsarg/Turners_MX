// db/init.js – Creates tables (if DATABASE_URL is provided) and seeds data in Supabase
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { Client } = require("pg");
const supabase = require("./connection");

async function init() {
  // 1. Si se provee DATABASE_URL, ejecutamos el DDL (db/schema.sql) directamente en Postgres de Supabase
  if (process.env.DATABASE_URL) {
    console.log("🔌 Conectando a PostgreSQL de Supabase mediante DATABASE_URL...");
    const pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await pgClient.connect();
    console.log("✅ Conectado a PostgreSQL (Supabase)");

    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    console.log("📄 Ejecutando db/schema.sql...");
    await pgClient.query(schema);
    console.log("✅ Esquema y tablas creadas en Supabase");
    await pgClient.end();
  } else {
    console.log(
      "ℹ️  No se definió DATABASE_URL en .env; se asume que db/schema.sql ya fue ejecutado en el SQL Editor de Supabase."
    );
  }

  // 2. Seed de servicios iniciales usando @supabase/supabase-js
  console.log("📄 Verificando/insertando servicios iniciales en Supabase...");
  const { data: existingServices, error: checkServErr } = await supabase
    .from("servicios")
    .select("id")
    .limit(1);

  if (checkServErr) {
    throw new Error(
      `Error al consultar tabla 'servicios' en Supabase (${checkServErr.message}). Asegúrate de haber ejecutado db/schema.sql en el SQL Editor de Supabase o configurar DATABASE_URL.`
    );
  }

  if (!existingServices || existingServices.length === 0) {
    const initialServices = [
      {
        nombre: "Cambio de aceite",
        descripcion: "Servicio rápido con insumos de calidad.",
        duracion_min: 30,
        precio: 15000.0,
        imagen: "cambio de aceite.jpg",
      },
      {
        nombre: "Alineación y balanceo",
        descripcion: "Seguridad y confort en ruta.",
        duracion_min: 45,
        precio: 22000.0,
        imagen: "alineacion y balanceo.jpg",
      },
      {
        nombre: "Revisión general",
        descripcion: "Diagnóstico, reparación y mantenimiento.",
        duracion_min: 60,
        precio: 28000.0,
        imagen: "mecanica general.jpg",
      },
      {
        nombre: "Cambio de pastillas de freno",
        descripcion: "Reemplazo de pastillas con repuestos originales.",
        duracion_min: 50,
        precio: 26000.0,
        imagen: "Frenos.jpg",
      },
    ];

    let { error: seedErr } = await supabase
      .from("servicios")
      .insert(initialServices);

    if (seedErr && seedErr.message && seedErr.message.includes("imagen")) {
      const servicesWithoutImagen = initialServices.map(
        ({ imagen, ...rest }) => rest
      );
      const retry = await supabase
        .from("servicios")
        .insert(servicesWithoutImagen);
      seedErr = retry.error;
    }

    if (seedErr) throw seedErr;
    console.log("✅ Servicios iniciales insertados");
  } else {
    console.log("ℹ️  La tabla 'servicios' ya contiene registros, omitiendo seed.");
  }

  // 3. Crear usuario admin por defecto
  const { data: existingAdmin, error: checkAdminErr } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", "admin@turners.com")
    .maybeSingle();

  if (checkAdminErr) throw checkAdminErr;

  if (!existingAdmin) {
    const hash = await bcrypt.hash("admin123", 10);
    const { error: adminErr } = await supabase.from("usuarios").insert({
      nombre: "Administrador",
      apellido: "",
      email: "admin@turners.com",
      password_hash: hash,
      rol: "admin",
    });
    if (adminErr) throw adminErr;
    console.log("✅ Usuario admin creado (admin@turners.com / admin123)");
  } else {
    console.log("ℹ️  El usuario admin@turners.com ya existe.");
  }

  console.log("\n🎉 Base de datos en Supabase lista!");
}

init().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
