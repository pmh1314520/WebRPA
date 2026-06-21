-- ============================================================
-- WebRPA 测试数据库 - 建表脚本
-- 适用: MySQL 8.0+ / PostgreSQL / SQLite (基本兼容)
-- 用途: 为工作流测试提供标准化的数据库样本环境
-- ============================================================

-- -----------------------------------------------------------
-- 1. 用户表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    user_id     VARCHAR(20)  NOT NULL UNIQUE,
    username    VARCHAR(50)  NOT NULL,
    real_name   VARCHAR(50)  DEFAULT '',
    email       VARCHAR(100) DEFAULT '',
    phone       VARCHAR(20)  DEFAULT '',
    role        ENUM('admin','editor','viewer') DEFAULT 'viewer',
    department  VARCHAR(50)  DEFAULT '未分配',
    status      ENUM('active','inactive','suspended') DEFAULT 'active',
    score       DECIMAL(5,1) DEFAULT 0.0,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_status (status),
    INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 2. 订单表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    order_id        VARCHAR(30)  NOT NULL UNIQUE,
    customer_name   VARCHAR(50)  NOT NULL,
    product         VARCHAR(100) NOT NULL,
    quantity        INT          DEFAULT 1,
    unit_price      DECIMAL(10,2) DEFAULT 0.00,
    total_amount    DECIMAL(10,2) DEFAULT 0.00,
    currency        VARCHAR(5)   DEFAULT 'CNY',
    status          ENUM('pending','paid','shipping','delivered','refunded','cancelled') DEFAULT 'pending',
    payment_method  VARCHAR(20)  DEFAULT '',
    shipping_address TEXT,
    order_date      DATE,
    delivery_date   DATE,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer (customer_name),
    INDEX idx_status (status),
    INDEX idx_order_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 3. 产品表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    product_id  VARCHAR(20)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    category    VARCHAR(50)  NOT NULL,
    price       DECIMAL(10,2) NOT NULL,
    stock       INT          DEFAULT 0,
    status      ENUM('on_sale','off_sale','discontinued') DEFAULT 'on_sale',
    description TEXT,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 4. 操作日志表（审计用）
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    user_id     VARCHAR(20)  NOT NULL,
    action      VARCHAR(50)  NOT NULL,
    target      VARCHAR(100) DEFAULT '',
    detail      TEXT,
    ip_address  VARCHAR(45)  DEFAULT '',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 5. 配置键值表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS config_kv (
    config_key   VARCHAR(100) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description  VARCHAR(200) DEFAULT '',
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 6. 任务调度表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    task_name   VARCHAR(100) NOT NULL,
    workflow_id VARCHAR(50)  NOT NULL,
    trigger_type ENUM('manual','cron','interval','once') DEFAULT 'manual',
    trigger_config JSON,
    enabled     BOOLEAN DEFAULT TRUE,
    last_run    DATETIME,
    next_run    DATETIME,
    run_count   INT DEFAULT 0,
    status      ENUM('idle','running','failed') DEFAULT 'idle',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_enabled (enabled),
    INDEX idx_next_run (next_run)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
