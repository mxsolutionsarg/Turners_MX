-- ============================================
-- Turners DB – Seed Data (Supabase / PostgreSQL)
-- ============================================

INSERT INTO servicios (nombre, descripcion, duracion_min, precio, imagen) VALUES
  ('Cambio de aceite',            'Servicio rápido con insumos de calidad.',          30, 15000.00, 'cambio de aceite.jpg'),
  ('Alineación y balanceo',       'Seguridad y confort en ruta.',                     45, 22000.00, 'alineacion y balanceo.jpg'),
  ('Revisión general',            'Diagnóstico, reparación y mantenimiento.',         60, 28000.00, 'mecanica general.jpg'),
  ('Cambio de pastillas de freno','Reemplazo de pastillas con repuestos originales.', 50, 26000.00, 'Frenos.jpg');
