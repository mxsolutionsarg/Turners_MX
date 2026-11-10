-- ============================================
-- Turners DB – Supabase (PostgreSQL) Schema
-- ============================================

DROP TABLE IF EXISTS presupuesto_items CASCADE;
DROP TABLE IF EXISTS presupuestos CASCADE;
DROP TABLE IF EXISTS bloqueos CASCADE;
DROP TABLE IF EXISTS seguimientos CASCADE;
DROP TABLE IF EXISTS turnos CASCADE;
DROP TABLE IF EXISTS servicios CASCADE;
DROP TABLE IF EXISTS vehiculos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Usuarios (autenticación + perfil)
CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  apellido      VARCHAR(100) DEFAULT '',
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           VARCHAR(20) DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes del taller (auto-creado al registrarse un usuario)
CREATE TABLE clientes (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  apellido    VARCHAR(100) NOT NULL,
  telefono    VARCHAR(30),
  email       VARCHAR(150),
  dni         VARCHAR(20),
  usuario_id  INT UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Vehículos (identificados por dominio/patente)
CREATE TABLE vehiculos (
  id          SERIAL PRIMARY KEY,
  dominio     VARCHAR(20) NOT NULL UNIQUE,
  marca       VARCHAR(80) NOT NULL,
  modelo      VARCHAR(80) NOT NULL,
  anio        INT,
  color       VARCHAR(40),
  cliente_id  INT REFERENCES clientes(id) ON DELETE SET NULL,
  usuario_id  INT REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Catálogo de servicios
CREATE TABLE servicios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  descripcion   TEXT,
  duracion_min  INT DEFAULT 30,
  precio        NUMERIC(10,2) DEFAULT 0,
  imagen        VARCHAR(255)
);

-- Turnos
CREATE TABLE turnos (
  id            SERIAL PRIMARY KEY,
  fecha         DATE NOT NULL,
  hora          TIME NOT NULL,
  servicio_id   INT NOT NULL REFERENCES servicios(id),
  cliente_id    INT REFERENCES clientes(id) ON DELETE SET NULL,
  vehiculo_id   INT REFERENCES vehiculos(id) ON DELETE SET NULL,
  usuario_id    INT NOT NULL REFERENCES usuarios(id),
  estado        VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado','completado','cancelado')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seguimientos (historial de mantenimientos por vehículo)
CREATE TABLE seguimientos (
  id            SERIAL PRIMARY KEY,
  vehiculo_id   INT NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
  servicio_id   INT NOT NULL REFERENCES servicios(id),
  fecha         DATE NOT NULL,
  kilometraje   INT,
  observaciones TEXT,
  turno_id      INT REFERENCES turnos(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Bloqueos de fechas
CREATE TABLE bloqueos (
  id            SERIAL PRIMARY KEY,
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE NOT NULL,
  motivo        VARCHAR(255) DEFAULT 'Cerrado',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Presupuestos
CREATE TABLE presupuestos (
  id            SERIAL PRIMARY KEY,
  turno_id      INT REFERENCES turnos(id) ON DELETE SET NULL,
  vehiculo_id   INT REFERENCES vehiculos(id) ON DELETE SET NULL,
  usuario_id    INT NOT NULL REFERENCES usuarios(id),
  fecha         DATE NOT NULL,
  observaciones TEXT,
  estado        VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador','enviado','aprobado')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE presupuesto_items (
  id              SERIAL PRIMARY KEY,
  presupuesto_id  INT NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  descripcion     VARCHAR(255) NOT NULL,
  cantidad        INT DEFAULT 1,
  precio_unitario NUMERIC(10,2) NOT NULL
);

-- Permisos para el API de Supabase (PostgREST)
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicios DISABLE ROW LEVEL SECURITY;
ALTER TABLE turnos DISABLE ROW LEVEL SECURITY;
ALTER TABLE seguimientos DISABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueos DISABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos DISABLE ROW LEVEL SECURITY;
ALTER TABLE presupuesto_items DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
