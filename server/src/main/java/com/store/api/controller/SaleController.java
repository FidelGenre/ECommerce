package com.store.api.controller;

import com.store.api.dto.OrderRequest;
import com.store.api.entity.*;
import com.store.api.repository.*;
import com.store.api.service.CashService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/sales")
@RequiredArgsConstructor
@Transactional
public class SaleController {

    private final SaleOrderRepository saleRepo;
    private final ItemRepository itemRepo;
    private final CustomerRepository customerRepo;
    private final OperationStatusRepository statusRepo;
    private final PaymentMethodRepository paymentRepo;
    private final StockMovementRepository stockMovementRepo;
    private final NotificationRepository notificationRepo;
    private final UserRepository userRepo;
    private final CashService cashService;
    private final com.store.api.service.StockService stockService;

    @GetMapping
    public ResponseEntity<Page<SaleOrder>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long customer,
            @RequestParam(required = false) Long status,
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<SaleOrder> spec = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (customer != null)
                predicates.add(cb.equal(root.get("customer").get("id"), customer));
            if (status != null)
                predicates.add(cb.equal(root.get("status").get("id"), status));
            if (category != null) {
                jakarta.persistence.criteria.Join<SaleOrder, SaleLine> linesJoin = root.join("lines");
                predicates.add(cb.equal(linesJoin.get("item").get("category").get("id"), category));
                query.distinct(true);
            }
            if (from != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return ResponseEntity.ok(saleRepo.findAll(spec, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SaleOrder> getById(@PathVariable Long id) {
        return saleRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<SaleOrder> create(@RequestBody OrderRequest req,
            org.springframework.security.core.Authentication auth) {
        SaleOrder order = new SaleOrder();

        if (auth != null) {
            userRepo.findByUsername(auth.getName()).ifPresent(order::setCreatedBy);
        }

        if (req.getCustomerId() != null)
            customerRepo.findById(req.getCustomerId()).ifPresent(order::setCustomer);
        if (req.getStatusId() != null)
            statusRepo.findById(req.getStatusId()).ifPresent(order::setStatus);
        if (req.getPaymentMethodId() != null)
            paymentRepo.findById(req.getPaymentMethodId()).ifPresent(order::setPaymentMethod);
        order.setNotes(req.getNotes());

        if (req.getLines() != null) {
            for (OrderRequest.OrderLineRequest lineReq : req.getLines()) {
                Item item = itemRepo.findById(lineReq.getItemId()).orElseThrow();

                SaleLine line = new SaleLine();
                line.setSaleOrder(order);
                line.setItem(item);
                line.setQuantity(lineReq.getQuantity());
                line.setUnitPrice(lineReq.getUnitPrice());
                order.getLines().add(line);
                order.setTotal(order.getTotal()
                        .add(lineReq.getUnitPrice().multiply(lineReq.getQuantity())));
            }
        }

        // Validate stock BEFORE saving or points deduction
        stockService.validateStockAvailability(order);

        if (req.getPointsUsed() != null && req.getPointsUsed() >= 100 && order.getCustomer() != null) {
            Customer c = order.getCustomer();
            int requestedPoints = req.getPointsUsed();
            int availablePoints = c.getLoyaltyPoints() != null ? c.getLoyaltyPoints() : 0;
            int used = Math.min(requestedPoints, availablePoints);
            int stars = used / 100;
            if (stars > 5)
                stars = 5;
            int actualPointsUsed = stars * 100;

            if (actualPointsUsed > 0) {
                c.setLoyaltyPoints(c.getLoyaltyPoints() - actualPointsUsed);
                order.setPointsUsed(actualPointsUsed);
                java.math.BigDecimal discount = order.getTotal().multiply(java.math.BigDecimal.valueOf(stars))
                        .divide(java.math.BigDecimal.valueOf(100));
                order.setTotal(order.getTotal().subtract(discount));
                if (order.getTotal().compareTo(java.math.BigDecimal.ZERO) < 0) {
                    order.setTotal(java.math.BigDecimal.ZERO);
                }
            }
        }

        if (order.getCustomer() != null && order.getTotal().compareTo(java.math.BigDecimal.ZERO) > 0) {
            Customer c = order.getCustomer();
            int earned = order.getTotal().intValue() / 1000; // 1 punto por cada $1000
            if (earned > 0) {
                c.setLoyaltyPoints((c.getLoyaltyPoints() != null ? c.getLoyaltyPoints() : 0) + earned);
                customerRepo.save(c);
            }
        }

        SaleOrder saved = saleRepo.save(order);

        // Deduct stock if status is completed or reserved
        if (saved.getStatus() != null) {
            String statusName = saved.getStatus().getName();
            if ("Completado".equalsIgnoreCase(statusName) || "Completed".equalsIgnoreCase(statusName)
                    || "Reservado".equalsIgnoreCase(statusName) || "Pendiente".equalsIgnoreCase(statusName)
                    || "Pending".equalsIgnoreCase(statusName)) {
                stockService.deductStockForSale(saved, "Manual sale start - Status: " + statusName);
                saved = saleRepo.save(saved);
            }
        }

        if (saved.getStatus() != null
                && ("Completed".equals(saved.getStatus().getName()) || "Completado".equals(saved.getStatus().getName()))
                && saved.getPaymentMethod() != null) {
            String method = saved.getPaymentMethod().getName();
            cashService.record("INCOME", saved.getTotal(), "[" + method + "] Venta #" + saved.getId());
            saved.setCashRegistered(true);
            saved = saleRepo.save(saved);
        }
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<SaleOrder> updateStatus(@PathVariable Long id, @RequestParam Long statusId) {
        return saleRepo.findById(id).map(order -> {
            statusRepo.findById(statusId).ifPresent(order::setStatus);
            if (order.getStatus() != null) {
                String statusName = order.getStatus().getName();

                // Return stock if cancelled
                if ("Cancelado".equalsIgnoreCase(statusName) || "Cancelled".equalsIgnoreCase(statusName)) {
                    stockService.returnStockForSale(order, "Sale cancellation");
                }
                // Deduct stock if now completed or reserved or pending
                else if ("Completado".equalsIgnoreCase(statusName) || "Completed".equalsIgnoreCase(statusName)
                        || "Reservado".equalsIgnoreCase(statusName) || "Pendiente".equalsIgnoreCase(statusName)
                        || "Pending".equalsIgnoreCase(statusName)) {
                    if (!Boolean.TRUE.equals(order.getStockDeducted())) {
                        try {
                            stockService.validateStockAvailability(order);
                        } catch (Exception e) {
                            throw new RuntimeException("No se puede actualizar el estado: " + e.getMessage());
                        }
                    }
                    stockService.deductStockForSale(order, "Sale status updated to " + statusName);
                }

                if (("Completed".equals(statusName) || "Completado".equals(statusName))
                        && !Boolean.TRUE.equals(order.getCashRegistered()) &&
                        order.getPaymentMethod() != null) {

                    String method = order.getPaymentMethod().getName();
                    cashService.record("INCOME", order.getTotal(), "[" + method + "] Venta #" + order.getId());
                    order.setCashRegistered(true);
                }
            }
            return ResponseEntity.ok(saleRepo.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Customer-facing: orders for current customer
    @GetMapping("/my/{userId}")
    public ResponseEntity<?> myOrders(@PathVariable Long userId) {
        return ResponseEntity.ok(saleRepo.findByCreatedById(userId));
    }
}
