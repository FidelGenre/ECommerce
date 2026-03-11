-- =============================================================
-- Coffee Beans Store — Seed Data
-- Run after schema is created (Spring Boot auto-creates tables)
-- =============================================================

-- Payment Methods
INSERT INTO payment_methods(name, description) VALUES
  ('Cash',          'Physical cash payment'),
  ('Credit Card',   'Visa / Mastercard'),
  ('Debit Card',    'Bank debit card'),
  ('Bank Transfer', 'Wire transfer'),
  ('MercadoPago',   'Digital wallet'),
  ('Store Credit',  'Account balance'),
  ('Gift Card',     'Pre-paid gift card');

-- Operation Statuses
INSERT INTO operation_statuses(name, type, color) VALUES
  -- Sale statuses
  ('Pending',   'SALE',     '#F59E0B'),
  ('Completed', 'SALE',     '#10B981'),
  ('Cancelled', 'SALE',     '#EF4444'),
  ('Reserved',  'SALE',     '#3B82F6'),
  -- Purchase statuses
  ('Pending',   'PURCHASE', '#F59E0B'),
  ('Approved',  'PURCHASE', '#3B82F6'),
  ('Completed', 'PURCHASE', '#10B981'),
  ('Cancelled', 'PURCHASE', '#EF4444');

-- Categories (products)
INSERT INTO categories(name, description, type) VALUES
  ('Single Origin',     'Coffee from a specific region',          'PRODUCT'),
  ('Espresso Blends',   'Blends optimised for espresso',          'PRODUCT'),
  ('Decaf',             'Naturally decaffeinated coffees',        'PRODUCT'),
  ('Cold Brew',         'Coarsely ground for cold brewing',       'PRODUCT'),
  ('Accessories',       'Brewing equipment and accessories',      'PRODUCT'),
  ('Gift Sets',         'Curated gift collections',               'PRODUCT');

-- Categories (suppliers)
INSERT INTO categories(name, description, type) VALUES
  ('Coffee Farm',       'Direct-trade coffee farm',               'SUPPLIER'),
  ('Roaster',           'Third-party roaster',                    'SUPPLIER'),
  ('Equipment',         'Coffee equipment supplier',              'SUPPLIER');

-- Suppliers
INSERT INTO suppliers(name, legal_name, tax_id, alias, phone, email, address, account_balance, category_id)
SELECT 'Finca El Paraíso', 'Finca El Paraíso SAS', 'NIT-123', 'El Paraíso', '+57 300 000 0001', 'paraiso@coffee.co', 'Huila, Colombia', 0, id FROM categories WHERE name='Coffee Farm' LIMIT 1;

INSERT INTO suppliers(name, legal_name, tax_id, alias, phone, email, address, account_balance, category_id)
SELECT 'Blue Ridge Roasters', 'Blue Ridge Coffee LLC', 'EIN-456', 'Blue Ridge', '+1 828 000 0002', 'hello@blueridge.com', 'Asheville, NC, USA', 0, id FROM categories WHERE name='Roaster' LIMIT 1;

INSERT INTO suppliers(name, legal_name, tax_id, alias, phone, email, address, account_balance, category_id)
SELECT 'Cafetalia', 'Cafetalia SpA', 'PIVA-789', 'Cafetalia', '+39 02 000 0003', 'info@cafetalia.it', 'Milan, Italy', 0, id FROM categories WHERE name='Equipment' LIMIT 1;

-- Admin user (password: admin123, BCrypt)
INSERT INTO users(username, email, password_hash, role, active)
VALUES ('admin', 'admin@coffeebeans.com', '$2a$10$sdEpNBCY12Od7pxPvHkzpOpU2a1iBov8hJ5nlTqpj0JQolisnxb/m', 'ADMIN', true);
-- (the hash above is BCrypt of 'admin123')
-- For production, regenerate with: BCryptPasswordEncoder().encode("admin123")

-- Demo customer
INSERT INTO users(username, email, password_hash, role, active)
VALUES ('maria', 'maria@example.com', '$2a$10$sdEpNBCY12Od7pxPvHkzpOpU2a1iBov8hJ5nlTqpj0JQolisnxb/m', 'USER', true);

INSERT INTO customers(first_name, last_name, email, phone, account_balance)
VALUES ('María', 'García', 'maria@example.com', '+54 9 11 0000 0001', 0.00);

-- Products (12 real coffee varieties)
INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Moka',
       'Variedad clásica con notas intensas y cuerpo pleno.',
       1.00, 0.50, 119, 10, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Single Origin' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Finca El Paraíso' LIMIT 1);

INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Java',
       'Café de origen único con perfil equilibrado y acidez suave.',
       1.00, 0.50, 71, 10, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Single Origin' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Blue Ridge Roasters' LIMIT 1);

INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Caturra',
       'Variedad colombiana con notas cítricas y cuerpo medio.',
       4.00, 2.00, 75, 10, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Single Origin' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Finca El Paraíso' LIMIT 1);

INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Geisha',
       'Grano premium de Panamá. Floral, jazmín y melocotón, proceso lavado.',
       8.00, 4.00, 12, 5, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Single Origin' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Finca El Paraíso' LIMIT 1);

INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Kona',
       'Café hawaiiano de excelente calidad con sabor suave y aromático.',
       1.00, 0.50, 12, 5, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Single Origin' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Blue Ridge Roasters' LIMIT 1);

INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Bourbón',
       'Variedad de altura con dulzura natural y carácter complejo.',
       1.00, 0.50, 2, 5, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Espresso Blends' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Finca El Paraíso' LIMIT 1);

INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Romex',
       'Blend especial con notas de chocolate y frutas rojas.',
       56.00, 30.00, 34, 8, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Espresso Blends' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Blue Ridge Roasters' LIMIT 1);

INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Typica',
       'Variedad ancestral de sabor limpio, dulce y redondo.',
       46.00, 25.00, 21, 5, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Single Origin' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Finca El Paraíso' LIMIT 1);

INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Maragogipe',
       'El grano elefante. Grande, aromático y de baja acidez.',
       44.00, 22.00, 25, 5, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Single Origin' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Blue Ridge Roasters' LIMIT 1);

INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Pacamara',
       'Híbrido premium entre Pacas y Maragogipe. Complejo y afrutado.',
       54.00, 28.00, 0, 5, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Single Origin' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Finca El Paraíso' LIMIT 1);

INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Caracoli',
       'Grano redondo natural con mayor concentración de sabores.',
       43.01, 22.00, 0, 5, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Single Origin' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Blue Ridge Roasters' LIMIT 1);

INSERT INTO items(name, description, price, cost, stock, min_stock, visible, image_url, category_id, supplier_id)
SELECT 'Niaouli',
       'Variedad especial con perfil aromático único y cuerpo ligero.',
       1.00, 0.50, 0, 5, true, '/images/coffee-hero.png',
       (SELECT id FROM categories WHERE name='Single Origin' LIMIT 1),
       (SELECT id FROM suppliers WHERE name='Finca El Paraíso' LIMIT 1);

