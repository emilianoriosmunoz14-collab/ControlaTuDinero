-- Sprint 3: esquema NUEVO (para bases VACIAS). No ejecutar encima de tablas antiguas.
CREATE DATABASE IF NOT EXISTS controlatudinero CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE controlatudinero;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  type ENUM('income','expense') NOT NULL,
  UNIQUE KEY uq_category_type_name (type, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS accounts (
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

CREATE TABLE IF NOT EXISTS subcategories (
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

CREATE TABLE IF NOT EXISTS transactions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  subcategory_id INT UNSIGNED NULL COMMENT 'Nulo en registros previos a la migracion',
  account_id INT UNSIGNED NULL COMMENT 'Nulo en registros previos a la migracion',
  type ENUM('income','expense') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tx_user_date (user_id, date),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_tx_sub_owner FOREIGN KEY (subcategory_id, user_id, category_id)
    REFERENCES subcategories (id, user_id, category_id) ON DELETE RESTRICT,
  CONSTRAINT fk_tx_account_owner FOREIGN KEY (account_id, user_id)
    REFERENCES accounts (id, user_id) ON DELETE RESTRICT,
  CONSTRAINT chk_tx_amount CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_user (user_id),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS savings_goals (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  account_id INT UNSIGNED NULL COMMENT 'Nulo en metas previas a la migracion',
  name VARCHAR(100) NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  saved_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  target_date DATE NULL,
  CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_goal_account_owner FOREIGN KEY (account_id, user_id)
    REFERENCES accounts(id, user_id) ON DELETE RESTRICT,
  CONSTRAINT chk_goal_target CHECK (target_amount > 0),
  CONSTRAINT chk_goal_saved CHECK (saved_amount >= 0 AND saved_amount <= target_amount)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Catalogo compartido: una categoria de cada tipo, no por usuario.
INSERT IGNORE INTO categories (name, type) VALUES
  ('Sueldo','income'), ('Otros ingresos','income'),
  ('Comida','expense'), ('Transporte','expense'),
  ('Entretenimiento','expense'), ('Compras','expense');
