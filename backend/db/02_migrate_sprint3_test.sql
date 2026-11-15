-- SPRINT 3: MIGRACION desde esquema Sprint 2, UNA SOLA VEZ.
-- Hacer antes respaldo con MySQL Workbench > Server > Data Export.
-- No volver a ejecutar si ya contiene las columnas y relaciones nuevas.
USE controlatudinero_test;
SELECT DATABASE() AS base_que_se_modificara;

-- 1. El FK antiguo impide unificar categorias iguales de distintos usuarios.
ALTER TABLE transactions DROP FOREIGN KEY fk_tx_category_owner;

-- 2. Mapeo temporal: mismo nombre y tipo pasan a un ID global canonico.
CREATE TEMPORARY TABLE ctd_category_map AS
SELECT c.id AS old_id, (
  SELECT MIN(c2.id) FROM categories c2
  WHERE c2.name = c.name AND c2.type = c.type
) AS new_id FROM categories c;

UPDATE transactions t JOIN ctd_category_map m ON m.old_id = t.category_id
SET t.category_id = m.new_id
WHERE t.category_id <> m.new_id;

DELETE c FROM categories c JOIN ctd_category_map m ON m.old_id = c.id
WHERE m.old_id <> m.new_id;
DROP TEMPORARY TABLE ctd_category_map;

-- 3. Convertir categories de usuario a catalogo general.
ALTER TABLE categories
  DROP FOREIGN KEY fk_category_user,
  DROP INDEX uq_user_type_name,
  DROP INDEX uq_category_id_user,
  DROP COLUMN user_id,
  ADD UNIQUE KEY uq_category_type_name (type, name);

INSERT IGNORE INTO categories (name, type) VALUES
  ('Sueldo','income'), ('Otros ingresos','income'),
  ('Comida','expense'), ('Transporte','expense'),
  ('Entretenimiento','expense'), ('Compras','expense');

-- 4. Nuevas cuentas individuales y subcategorias del usuario.
CREATE TABLE accounts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  account_type VARCHAR(40) NOT NULL,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_account_user_name (user_id, name),
  UNIQUE KEY uq_account_id_user (id, user_id),
  CONSTRAINT fk_account_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_account_opening CHECK (opening_balance >= 0),
  CONSTRAINT chk_account_balance CHECK (balance >= 0)
) ENGINE=InnoDB;

CREATE TABLE subcategories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sub_user_category_name (user_id, category_id, name),
  UNIQUE KEY uq_sub_id_user_category (id, user_id, category_id),
  CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_sub_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 5. Nuevas columnas en movimientos. NULL permite conservar registros antiguos.
ALTER TABLE transactions
  ADD COLUMN subcategory_id INT UNSIGNED NULL AFTER category_id,
  ADD COLUMN account_id INT UNSIGNED NULL AFTER subcategory_id,
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD CONSTRAINT fk_tx_category FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tx_sub_owner FOREIGN KEY (subcategory_id, user_id, category_id)
    REFERENCES subcategories (id, user_id, category_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tx_account_owner FOREIGN KEY (account_id, user_id)
    REFERENCES accounts (id, user_id) ON DELETE RESTRICT;

ALTER TABLE savings_goals
  ADD COLUMN account_id INT UNSIGNED NULL AFTER user_id,
  ADD CONSTRAINT fk_goal_account_owner FOREIGN KEY (account_id, user_id)
    REFERENCES accounts(id, user_id) ON DELETE RESTRICT;

-- 6. Confirmacion.
SHOW TABLES;
SELECT COUNT(*) AS usuarios_conservados FROM users;
SELECT COUNT(*) AS movimientos_conservados FROM transactions;
SELECT COUNT(*) AS categorias_generales FROM categories;
