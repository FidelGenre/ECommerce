package com.store.api.config;

import com.store.api.entity.SaleOrder;
import com.store.api.entity.PurchaseOrder;
import com.store.api.entity.User;
import com.store.api.repository.SaleOrderRepository;
import com.store.api.repository.PurchaseOrderRepository;
import com.store.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * One-time data fixer: assigns createdBy to orphan sale/purchase orders
 * where createdBy is null.
 */
@Component
@RequiredArgsConstructor
public class DataFixer implements CommandLineRunner {

    private final SaleOrderRepository saleRepo;
    private final PurchaseOrderRepository purchaseRepo;
    private final UserRepository userRepo;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(String... args) {
        User admin = userRepo.findByUsername("admin").orElse(null);
        if (admin == null)
            return;

        long fixedSales = 0;
        for (SaleOrder order : saleRepo.findAll()) {
            if (order.getCustomer() == null && order.getCreatedBy() == null) {
                order.setCreatedBy(admin);
                saleRepo.save(order);
                fixedSales++;
            }
        }
        if (fixedSales > 0) {
            System.out.println("[DataFixer] Assigned createdBy to " + fixedSales + " orphan sale orders");
        }

        long fixedPurchases = 0;
        for (PurchaseOrder order : purchaseRepo.findAll()) {
            if (order.getCreatedBy() == null) {
                order.setCreatedBy(admin);
                purchaseRepo.save(order);
                fixedPurchases++;
            }
        }
        if (fixedPurchases > 0) {
            System.out.println("[DataFixer] Assigned createdBy to " + fixedPurchases + " orphan purchase orders");
        }

        // Fix encoding issues
        jdbcTemplate.execute("UPDATE items SET name = REPLACE(name, 'ParaÃso', 'Paraíso')");
        jdbcTemplate.execute("UPDATE suppliers SET name = REPLACE(name, 'ParaÃso', 'Paraíso')");

        // Backfill created_by for statuses and payment methods with the admin id
        jdbcTemplate
                .execute("UPDATE operation_statuses SET created_by = " + admin.getId() + " WHERE created_by IS NULL");
        jdbcTemplate.execute("UPDATE payment_methods SET created_by = " + admin.getId() + " WHERE created_by IS NULL");
        jdbcTemplate.execute("UPDATE categories SET name = REPLACE(name, 'ParaÃso', 'Paraíso')");

        // Translate Operation Statuses
        jdbcTemplate.execute("UPDATE operation_statuses SET name = 'Completado' WHERE name = 'Completed'");
        jdbcTemplate.execute("UPDATE operation_statuses SET name = 'Pendiente' WHERE name = 'Pending'");
        jdbcTemplate.execute("UPDATE operation_statuses SET name = 'Cancelado' WHERE name = 'Cancelled'");
        jdbcTemplate.execute("UPDATE operation_statuses SET name = 'Reservado' WHERE name = 'Reserved'");
        jdbcTemplate.execute("UPDATE operation_statuses SET name = 'Aprobado' WHERE name = 'Approved'");

        // Translate categories
        jdbcTemplate.execute("UPDATE categories SET name = 'Café de Especialidad' WHERE name = 'Specialty Coffee'");
        jdbcTemplate.execute("UPDATE categories SET name = 'Equipamiento' WHERE name = 'Equipment'");
        jdbcTemplate.execute("UPDATE categories SET name = 'Finca Cafetera' WHERE name = 'Coffee Farm'");
        jdbcTemplate.execute("UPDATE categories SET name = 'Proveedor Local' WHERE name = 'Local Supplier'");

        System.out.println("[DataFixer] Applied translations and encoding fixes.");
    }
}
