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
            "ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(40)",
            "ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(50)",
            "ALTER TABLE users ALTER COLUMN document_type TYPE VARCHAR(15)",
            "ALTER TABLE users ALTER COLUMN document_number TYPE VARCHAR(20)",

            "ALTER TABLE customers ALTER COLUMN first_name TYPE VARCHAR(40)",
            "ALTER TABLE customers ALTER COLUMN last_name TYPE VARCHAR(40)",
            "ALTER TABLE customers ALTER COLUMN email TYPE VARCHAR(50)",
            "ALTER TABLE customers ALTER COLUMN phone TYPE VARCHAR(30)",
            "ALTER TABLE customers ALTER COLUMN address TYPE VARCHAR(100)",
            "ALTER TABLE customers ALTER COLUMN tax_id TYPE VARCHAR(20)",
            "ALTER TABLE customers ALTER COLUMN document_type TYPE VARCHAR(15)",

            "ALTER TABLE suppliers ALTER COLUMN name TYPE VARCHAR(40)",
            "ALTER TABLE suppliers ALTER COLUMN legal_name TYPE VARCHAR(40)",
            "ALTER TABLE suppliers ALTER COLUMN alias TYPE VARCHAR(40)",
            "ALTER TABLE suppliers ALTER COLUMN phone TYPE VARCHAR(30)",
            "ALTER TABLE suppliers ALTER COLUMN email TYPE VARCHAR(50)",
            "ALTER TABLE suppliers ALTER COLUMN address TYPE VARCHAR(100)",
            "ALTER TABLE suppliers ALTER COLUMN tax_id TYPE VARCHAR(20)",

            "ALTER TABLE items ALTER COLUMN name TYPE VARCHAR(60)",
            "ALTER TABLE items ALTER COLUMN barcode TYPE VARCHAR(40)",

            "ALTER TABLE categories ALTER COLUMN name TYPE VARCHAR(40)"
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
