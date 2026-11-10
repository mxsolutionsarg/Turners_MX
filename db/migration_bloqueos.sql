-- ============================================
-- Migration 2: Add bloqueos table for schedule management
-- ============================================
USE u447396976_turners_db;

CREATE TABLE IF NOT EXISTS bloqueos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  motivo       VARCHAR(255) DEFAULT 'Cerrado',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
