-- ============================================================
-- Seed Data
-- ============================================================

-- Admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, active, created_at) VALUES
('admin', 'admin@coffeebeans.com', '$2a$10$RQkX7wPZ4Ivv6hJiwuliWuVokJ8.1wMBnstlS2M/T6cfHkX5TRzvm', 'ADMIN', true, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Categories
INSERT INTO categories (name, description, type) VALUES
('Whole Bean',  'Premium whole bean offerings',    'PRODUCT'),
('Ground',      'Pre-ground varieties',             'PRODUCT'),
('Accessories', 'Brewing gear and accessories',     'PRODUCT'),
('Roasters',    'Bean roaster suppliers',           'SUPPLIER'),
('Distributors','General distributors',             'SUPPLIER')
ON CONFLICT DO NOTHING;

-- Payment Methods
INSERT INTO payment_methods (name, description) VALUES
('Cash',        'Cash payment'),
('Card',        'Debit or credit card'),
('Transfer',    'Bank transfer'),
('QR',          'QR code payment')
ON CONFLICT DO NOTHING;

-- Operation Statuses
INSERT INTO operation_statuses (name, type, color) VALUES
('Pending',   'SALE',     '#F59E0B'),
('Completed', 'SALE',     '#10B981'),
('Cancelled', 'SALE',     '#EF4444'),
('Reserved',  'SALE',     '#6366F1'),
('Pending',   'PURCHASE', '#F59E0B'),
('Completed', 'PURCHASE', '#10B981'),
('Cancelled', 'PURCHASE', '#EF4444'),
('Approved',  'PURCHASE', '#3B82F6')
ON CONFLICT DO NOTHING;

-- Sample Supplier
INSERT INTO suppliers (name, legal_name, alias, email, category_id, account_balance, created_at) VALUES
('Mountain Roasters', 'Mountain Roasters S.A.', 'mroast', 'contact@mountainroasters.com', (SELECT id FROM categories WHERE name = 'Roasters' LIMIT 1), 0.00, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Sample Items
INSERT INTO items (name, description, price, cost, stock, min_stock, category_id, visible, created_at) VALUES
('Arabica Select',   'Premium single-origin arabica',      2800, 1400, 50, 10, (SELECT id FROM categories WHERE name = 'Whole Bean'   LIMIT 1), TRUE, CURRENT_TIMESTAMP),
('Dark Roast Blend', 'Bold dark roast blend',              2400, 1200, 35, 8,  (SELECT id FROM categories WHERE name = 'Whole Bean'   LIMIT 1), TRUE, CURRENT_TIMESTAMP),
('Medium Ground',    'Balanced medium grind',              2200, 1100, 40, 10, (SELECT id FROM categories WHERE name = 'Ground'       LIMIT 1), TRUE, CURRENT_TIMESTAMP),
('French Press Kit', 'Glass french press 600ml',           5500, 2800, 15, 3,  (SELECT id FROM categories WHERE name = 'Accessories'  LIMIT 1), TRUE, CURRENT_TIMESTAMP),
('Moka Pot',         'Stovetop espresso maker, 6-cup',     4800, 2400, 12, 3,  (SELECT id FROM categories WHERE name = 'Accessories'  LIMIT 1), TRUE, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
