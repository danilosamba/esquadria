-- Schema for Luz Orçamentos Migration to MySQL

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    force_reset TINYINT(1) DEFAULT 1,
    created_at BIGINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(255),
    address TEXT,
    phone VARCHAR(255),
    email VARCHAR(255),
    architect VARCHAR(255),
    salesperson VARCHAR(255),
    created_at BIGINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    description VARCHAR(255) NOT NULL UNIQUE,
    unit_price DECIMAL(15, 2),
    unit VARCHAR(10) DEFAULT "M"
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budgets (
    id VARCHAR(10) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    data JSON NOT NULL,
    created_at BIGINT,
    INDEX (user_id),
    CONSTRAINT fk_budget_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default Admin User (Password: 142536)
INSERT IGNORE INTO users (id, name, email, password, is_admin, is_active, force_reset, created_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'admin',
    'admin@luz.com',
    '$2y$10$hVVnJPLbQ1MPIkNYtRIS2.NKiweKup3PWN79umIJleW8Ecbg/QIaa',
    1,
    1,
    0,
    1710000000000
);
