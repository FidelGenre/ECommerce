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

                // Auto-decrement stock
                java.math.BigDecimal actualQuantity = lineReq.getQuantity();
                if (item.getUnitSize() != null && item.getUnitSize().compareTo(java.math.BigDecimal.ZERO) > 0) {
                    actualQuantity = actualQuantity.multiply(item.getUnitSize());
                }
                item.setStock(item.getStock().subtract(actualQuantity));
                itemRepo.save(item);

                // Record stock movement
                StockMovement movement = new StockMovement();
                movement.setItem(item);
                movement.setMovementType("OUT");
                movement.setQuantity(actualQuantity);
                movement.setReason("Sale order #" + order.getId());
                stockMovementRepo.save(movement);

                // Process Recipe / BOM (Insumos)
                if (item.getComponents() != null && !item.getComponents().isEmpty()) {
                    for (com.store.api.entity.ItemComponent component : item.getComponents()) {
                        Item subItem = component.getComponentItem();
                        java.math.BigDecimal totalDeduction = component.getQuantity().multiply(lineReq.getQuantity());

                        subItem.setStock(subItem.getStock().subtract(totalDeduction));
                        itemRepo.save(subItem);

                        StockMovement subMovement = new StockMovement();
                        subMovement.setItem(subItem);
                        subMovement.setMovementType("OUT");
                        subMovement.setQuantity(totalDeduction);
                        subMovement
                                .setReason("Recipe component for " + item.getName() + " (Sale #" + order.getId() + ")");
                        stockMovementRepo.save(subMovement);
                    }
                }

                // Low-stock notification
                if (item.getStock().compareTo(item.getMinStock()) <= 0) {
                    Notification notification = new Notification();
                    notification.setMessage("Low stock: " + item.getName() + " (" + item.getStock() + " left, min: "
                            + item.getMinStock() + ")");
                    notification.setType("WARNING");
                    notificationRepo.save(notification);
                }
            }
        }

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
            }
            customerRepo.save(c);
        }

        SaleOrder saved = saleRepo.save(order);
        if (saved.getStatus() != null
                && ("Completed".equals(saved.getStatus().getName()) || "Completado".equals(saved.getStatus().getName()))
                &&
                saved.getPaymentMethod() != null &&
                (saved.getPaymentMethod().getName().toLowerCase().contains("efectivo") ||
                        saved.getPaymentMethod().getName().toLowerCase().contains("cash"))) {
            cashService.record("INCOME", saved.getTotal(), "Venta #" + saved.getId());
            saved.setCashRegistered(true);
            saved = saleRepo.save(saved);
        }
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<SaleOrder> updateStatus(@PathVariable Long id, @RequestParam Long statusId) {
        return saleRepo.findById(id).map(order -> {
            statusRepo.findById(statusId).ifPresent(order::setStatus);
            if (order.getStatus() != null
                    && ("Completed".equals(order.getStatus().getName())
                            || "Completado".equals(order.getStatus().getName()))
                    &&
                    !Boolean.TRUE.equals(order.getCashRegistered()) &&
                    order.getPaymentMethod() != null &&
                    (order.getPaymentMethod().getName().toLowerCase().contains("efectivo") ||
                            order.getPaymentMethod().getName().toLowerCase().contains("cash"))) {
                cashService.record("INCOME", order.getTotal(), "Venta #" + order.getId());
                order.setCashRegistered(true);
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
