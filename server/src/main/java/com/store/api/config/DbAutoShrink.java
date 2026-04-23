package com.store.api.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class DbAutoShrink implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        log.info("Checking and shrinking database column sizes...");

        String[] alters = {
            "ALTER TABLE account_movements ALTER COLUMN movement_type TYPE VARCHAR(20)",
            "ALTER TABLE account_movements ALTER COLUMN description TYPE VARCHAR(100)",
            "ALTER TABLE audit_log ALTER COLUMN action TYPE VARCHAR(40)",
            "ALTER TABLE audit_log ALTER COLUMN entity TYPE VARCHAR(50)",
            "ALTER TABLE audit_log ALTER COLUMN old_value TYPE VARCHAR(50)",
            "ALTER TABLE audit_log ALTER COLUMN new_value TYPE VARCHAR(50)",
            "ALTER TABLE cash_movements ALTER COLUMN movement_type TYPE VARCHAR(20)",
            "ALTER TABLE cash_movements ALTER COLUMN description TYPE VARCHAR(100)",
            "ALTER TABLE cash_registers ALTER COLUMN notes TYPE VARCHAR(40)",
            "ALTER TABLE categories ALTER COLUMN name TYPE VARCHAR(40)",
            "ALTER TABLE categories ALTER COLUMN description TYPE VARCHAR(100)",
            "ALTER TABLE categories ALTER COLUMN type TYPE VARCHAR(20)",
            "ALTER TABLE customers ALTER COLUMN first_name TYPE VARCHAR(40)",
            "ALTER TABLE customers ALTER COLUMN last_name TYPE VARCHAR(40)",
            "ALTER TABLE customers ALTER COLUMN email TYPE VARCHAR(50)",
            "ALTER TABLE customers ALTER COLUMN phone TYPE VARCHAR(20)",
            "ALTER TABLE customers ALTER COLUMN address TYPE VARCHAR(50)",
            "ALTER TABLE customers ALTER COLUMN document_type TYPE VARCHAR(15)",
            "ALTER TABLE customers ALTER COLUMN tax_id TYPE VARCHAR(20)",
            "ALTER TABLE customers ALTER COLUMN notes TYPE VARCHAR(40)",
            "ALTER TABLE internal_costs ALTER COLUMN description TYPE VARCHAR(100)",
            "ALTER TABLE internal_costs ALTER COLUMN category TYPE VARCHAR(50)",
            "ALTER TABLE items ALTER COLUMN name TYPE VARCHAR(40)",
            "ALTER TABLE items ALTER COLUMN description TYPE VARCHAR(100)",
            "ALTER TABLE items ALTER COLUMN image_url TYPE VARCHAR(500)",
            "ALTER TABLE items ALTER COLUMN barcode TYPE VARCHAR(50)",
            "ALTER TABLE items ALTER COLUMN unit TYPE VARCHAR(20)",
            "ALTER TABLE items ALTER COLUMN purchase_unit TYPE VARCHAR(20)",
            "ALTER TABLE notifications ALTER COLUMN message TYPE VARCHAR(100)",
            "ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(20)",
            "ALTER TABLE operation_statuses ALTER COLUMN name TYPE VARCHAR(40)",
            "ALTER TABLE operation_statuses ALTER COLUMN type TYPE VARCHAR(20)",
            "ALTER TABLE operation_statuses ALTER COLUMN color TYPE VARCHAR(20)",
            "ALTER TABLE payment_methods ALTER COLUMN name TYPE VARCHAR(40)",
            "ALTER TABLE payment_methods ALTER COLUMN description TYPE VARCHAR(100)",
            "ALTER TABLE purchase_orders ALTER COLUMN notes TYPE VARCHAR(40)",
            "ALTER TABLE roles ALTER COLUMN code TYPE VARCHAR(20)",
            "ALTER TABLE roles ALTER COLUMN name TYPE VARCHAR(40)",
            "ALTER TABLE sales_orders ALTER COLUMN notes TYPE VARCHAR(40)",
            "ALTER TABLE sales_orders ALTER COLUMN mp_preference_id TYPE VARCHAR(100)",
            "ALTER TABLE sales_orders ALTER COLUMN mp_payment_id TYPE VARCHAR(100)",
            "ALTER TABLE sales_orders ALTER COLUMN mp_init_point TYPE VARCHAR(500)",
            "ALTER TABLE stock_movements ALTER COLUMN movement_type TYPE VARCHAR(20)",
            "ALTER TABLE stock_movements ALTER COLUMN reason TYPE VARCHAR(100)",
            "ALTER TABLE stock_movements ALTER COLUMN reference_type TYPE VARCHAR(50)",
            "ALTER TABLE suppliers ALTER COLUMN name TYPE VARCHAR(40)",
            "ALTER TABLE suppliers ALTER COLUMN legal_name TYPE VARCHAR(40)",
            "ALTER TABLE suppliers ALTER COLUMN tax_id TYPE VARCHAR(20)",
            "ALTER TABLE suppliers ALTER COLUMN alias TYPE VARCHAR(40)",
            "ALTER TABLE suppliers ALTER COLUMN phone TYPE VARCHAR(20)",
            "ALTER TABLE suppliers ALTER COLUMN email TYPE VARCHAR(50)",
            "ALTER TABLE suppliers ALTER COLUMN address TYPE VARCHAR(50)",
            "ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(40)",
            "ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(50)",
            "ALTER TABLE users ALTER COLUMN document_type TYPE VARCHAR(15)",
            "ALTER TABLE users ALTER COLUMN document_number TYPE VARCHAR(20)",
            "ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50)"
        };

        for (String q : alters) {
            try {
                jdbc.execute(q);
                log.info("Executed: {}", q);
            } catch (Exception e) {
                log.warn("Failed to execute (might be normal if table is different): {} - {}", q, e.getMessage());
            }
        }
        
        log.info("Database shrink completed.");
    }
}
