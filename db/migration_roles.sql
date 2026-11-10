-- ============================================
-- Migration: Add roles and usuario_id to vehiculos
-- ============================================
USE u447396976_turners_db;

-- Add rol column to usuarios (ignore if exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA='turners_db' AND TABLE_NAME='usuarios' AND COLUMN_NAME='rol');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE usuarios ADD COLUMN rol ENUM(''cliente'',''admin'') DEFAULT ''cliente'' AFTER password_hash', 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add usuario_id to vehiculos (ignore if exists)
SET @col_exists2 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA='turners_db' AND TABLE_NAME='vehiculos' AND COLUMN_NAME='usuario_id');
SET @sql2 = IF(@col_exists2 = 0, 
  'ALTER TABLE vehiculos ADD COLUMN usuario_id INT AFTER cliente_id', 
  'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Make cliente_id nullable (clients register vehicles without selecting a client)
ALTER TABLE vehiculos MODIFY COLUMN cliente_id INT NULL;
