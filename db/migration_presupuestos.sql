-- ============================================
-- Presupuestos – Migration
-- ============================================
USE u447396976_turners_db;

CREATE TABLE IF NOT EXISTS presupuestos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  turno_id      INT,
  vehiculo_id   INT,
  usuario_id    INT NOT NULL,
  fecha         DATE NOT NULL,
  observaciones TEXT,
  estado        ENUM('borrador','enviado','aprobado') DEFAULT 'borrador',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (turno_id)    REFERENCES turnos(id)    ON DELETE SET NULL,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id),
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS presupuesto_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  presupuesto_id  INT NOT NULL,
  descripcion     VARCHAR(255) NOT NULL,
  cantidad        INT DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id) ON DELETE CASCADE
) ENGINE=InnoDB;
