-- ============================================================
-- Coffee Beans Store — Database Schema
-- ============================================================

-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Categories (for products and suppliers)
CREATE TABLE IF NOT EXISTS categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    type        VARCHAR(20)  NOT NULL DEFAULT 'PRODUCT'
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    legal_name     VARCHAR(150),
    tax_id         VARCHAR(30),
    alias          VARCHAR(80),
    phone          VARCHAR(30),
    email          VARCHAR(100),
    address        VARCHAR(200),
    category_id    BIGINT REFERENCES categories(id),
    account_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id              BIGSERIAL PRIMARY KEY,
    first_name      VARCHAR(80)  NOT NULL,
    last_name       VARCHAR(80),
    email           VARCHAR(100),
    phone           VARCHAR(30),
    address         VARCHAR(200),
    tax_id          VARCHAR(30),
    notes           TEXT,
    account_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80) NOT NULL,
    description TEXT,
    created_by  BIGINT REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Operation Statuses
CREATE TABLE IF NOT EXISTS operation_statuses (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(60) NOT NULL,
    type        VARCHAR(20) NOT NULL,
    color       VARCHAR(20) DEFAULT '#6B3F1F',
    created_by  BIGINT REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Products / Items
CREATE TABLE IF NOT EXISTS items (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    description  TEXT,
    price        NUMERIC(14,2) NOT NULL DEFAULT 0,
    cost         NUMERIC(14,2) NOT NULL DEFAULT 0,
    image_url    VARCHAR(500),
    stock        INTEGER      NOT NULL DEFAULT 0,
    min_stock    INTEGER      NOT NULL DEFAULT 0,
    category_id  BIGINT REFERENCES categories(id),
    supplier_id  BIGINT REFERENCES suppliers(id),
    visible      BOOLEAN      NOT NULL DEFAULT TRUE,
    barcode      VARCHAR(100),
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Purchase Orders (from suppliers)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id                 BIGSERIAL PRIMARY KEY,
    supplier_id        BIGINT REFERENCES suppliers(id),
    status_id          BIGINT REFERENCES operation_statuses(id),
    payment_method_id  BIGINT REFERENCES payment_methods(id),
    notes              TEXT,
    total              NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_by         BIGINT REFERENCES users(id),
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Purchase Lines
CREATE TABLE IF NOT EXISTS purchase_lines (
    id           BIGSERIAL PRIMARY KEY,
    purchase_id  BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id      BIGINT NOT NULL REFERENCES items(id),
    quantity     INTEGER      NOT NULL,
    unit_cost    NUMERIC(14,2) NOT NULL
);

-- Sales Orders (to customers)
CREATE TABLE IF NOT EXISTS sales_orders (
    id                 BIGSERIAL PRIMARY KEY,
    customer_id        BIGINT REFERENCES customers(id),
    status_id          BIGINT REFERENCES operation_statuses(id),
    payment_method_id  BIGINT REFERENCES payment_methods(id),
    notes              TEXT,
    total              NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_by         BIGINT REFERENCES users(id),
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sale Lines
CREATE TABLE IF NOT EXISTS sale_lines (
    id          BIGSERIAL PRIMARY KEY,
    sale_id     BIGINT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    item_id     BIGINT NOT NULL REFERENCES items(id),
    quantity    INTEGER      NOT NULL,
    unit_price  NUMERIC(14,2) NOT NULL
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id            BIGSERIAL PRIMARY KEY,
    item_id       BIGINT NOT NULL REFERENCES items(id),
    movement_type VARCHAR(20) NOT NULL,
    quantity      INTEGER     NOT NULL,
    reason        TEXT,
    reference_id  BIGINT,
    reference_type VARCHAR(30),
    created_by    BIGINT REFERENCES users(id),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Cash Register Sessions
CREATE TABLE IF NOT EXISTS cash_registers (
    id              BIGSERIAL PRIMARY KEY,
    opening_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    closing_amount  NUMERIC(14,2),
    opened_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMP,
    opened_by       BIGINT REFERENCES users(id),
    notes           TEXT
);

-- Cash Movements
CREATE TABLE IF NOT EXISTS cash_movements (
    id           BIGSERIAL PRIMARY KEY,
    register_id  BIGINT NOT NULL REFERENCES cash_registers(id),
    movement_type VARCHAR(20) NOT NULL,
    amount        NUMERIC(14,2) NOT NULL,
    description   TEXT,
    created_by    BIGINT REFERENCES users(id),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Internal Costs (expenses not tied to purchases)
CREATE TABLE IF NOT EXISTS internal_costs (
    id          BIGSERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    amount      NUMERIC(14,2) NOT NULL,
    category    VARCHAR(100),
    cost_date   DATE NOT NULL,
    created_by  BIGINT REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    message     TEXT NOT NULL,
    type        VARCHAR(30) NOT NULL DEFAULT 'INFO',
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    action      VARCHAR(30) NOT NULL,
    entity      VARCHAR(60) NOT NULL,
    entity_id   BIGINT,
    old_value   TEXT,
    new_value   TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
