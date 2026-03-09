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

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/purchases")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseOrderRepository purchaseRepo;
    private final ItemRepository itemRepo;
    private final SupplierRepository supplierRepo;
    private final OperationStatusRepository statusRepo;
    private final PaymentMethodRepository paymentRepo;
    private final UserRepository userRepo;
    private final StockMovementRepository stockMovementRepo;
    private final NotificationRepository notificationRepo;
    private final CashService cashService;

    @GetMapping
    public ResponseEntity<Page<PurchaseOrder>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long supplier,
            @RequestParam(required = false) Long status,
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            org.springframework.security.core.Authentication auth) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        final Long effectiveSupplier = supplier;

        Specification<PurchaseOrder> spec = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (effectiveSupplier != null)
                predicates.add(cb.equal(root.get("supplier").get("id"), effectiveSupplier));
            if (status != null)
                predicates.add(cb.equal(root.get("status").get("id"), status));
            if (category != null) {
                jakarta.persistence.criteria.Join<PurchaseOrder, PurchaseLine> linesJoin = root.join("lines");
                predicates.add(cb.equal(linesJoin.get("item").get("category").get("id"), category));
                query.distinct(true);
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("supplier").get("name")), pattern),
                        cb.like(cb.lower(root.get("notes")), pattern)));
            }
            if (from != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return ResponseEntity.ok(purchaseRepo.findAll(spec, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrder> getById(@PathVariable Long id) {
        return purchaseRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PurchaseOrder> create(@RequestBody OrderRequest req,
            org.springframework.security.core.Authentication auth) {
        PurchaseOrder order = new PurchaseOrder();

        if (auth != null) {
            userRepo.findByUsername(auth.getName()).ifPresent(order::setCreatedBy);
        }

        if (req.getSupplierId() != null)
            supplierRepo.findById(req.getSupplierId()).ifPresent(order::setSupplier);
        if (req.getStatusId() != null)
            statusRepo.findById(req.getStatusId()).ifPresent(order::setStatus);
        if (req.getPaymentMethodId() != null)
            paymentRepo.findById(req.getPaymentMethodId()).ifPresent(order::setPaymentMethod);
        order.setNotes(req.getNotes());

        if (req.getLines() != null) {
            for (OrderRequest.OrderLineRequest lineReq : req.getLines()) {
                Item item = itemRepo.findById(lineReq.getItemId()).orElseThrow();
                PurchaseLine line = new PurchaseLine();
                line.setPurchaseOrder(order);
                line.setItem(item);
                line.setQuantity(lineReq.getQuantity());
                line.setUnitCost(lineReq.getUnitCost());
                order.getLines().add(line);
                order.setTotal(order.getTotal()
                        .add(lineReq.getUnitCost().multiply(lineReq.getQuantity())));

                // Auto-update stock
                java.math.BigDecimal conversion = item.getPurchaseConversion() != null ? item.getPurchaseConversion()
                        : java.math.BigDecimal.ONE;
                java.math.BigDecimal addedStock = lineReq.getQuantity().multiply(conversion);

                item.setStock(item.getStock().add(addedStock));
                itemRepo.save(item);

                // Record stock movement
                StockMovement movement = new StockMovement();
                movement.setItem(item);
                movement.setMovementType("IN");
                movement.setQuantity(addedStock);
                movement.setReason("Purchase order");
                stockMovementRepo.save(movement);

                // Dismiss low-stock notifications for this item if stock now OK
                if (item.getStock().compareTo(item.getMinStock()) > 0) {
                    notificationRepo.findByIsReadFalseOrderByCreatedAtDesc().stream()
                            .filter(n -> n.getMessage().contains(item.getName()))
                            .forEach(n -> {
                                n.setIsRead(true);
                                notificationRepo.save(n);
                            });
                }
            }
        }

        PurchaseOrder saved = purchaseRepo.save(order);
        if (saved.getStatus() != null
                && ("Completed".equals(saved.getStatus().getName()) || "Completado".equals(saved.getStatus().getName())
                        || "Approved".equals(saved.getStatus().getName())
                        || "Aprobado".equals(saved.getStatus().getName()))
                &&
                saved.getTotal().compareTo(java.math.BigDecimal.ZERO) > 0 &&
                saved.getPaymentMethod() != null &&
                (saved.getPaymentMethod().getName().toLowerCase().contains("efectivo") ||
                        saved.getPaymentMethod().getName().toLowerCase().contains("cash"))) {
            cashService.record("EXPENSE", saved.getTotal(), "Compra #" + saved.getId());
            saved.setCashRegistered(true);
            saved = purchaseRepo.save(saved);
        }
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PurchaseOrder> updateStatus(@PathVariable Long id, @RequestParam Long statusId) {
        return purchaseRepo.findById(id).map(order -> {
            statusRepo.findById(statusId).ifPresent(order::setStatus);
            if (order.getStatus() != null
                    && ("Completed".equals(order.getStatus().getName())
                            || "Completado".equals(order.getStatus().getName())
                            || "Approved".equals(order.getStatus().getName())
                            || "Aprobado".equals(order.getStatus().getName()))
                    &&
                    !Boolean.TRUE.equals(order.getCashRegistered()) &&
                    order.getTotal().compareTo(java.math.BigDecimal.ZERO) > 0 &&
                    order.getPaymentMethod() != null &&
                    (order.getPaymentMethod().getName().toLowerCase().contains("efectivo") ||
                            order.getPaymentMethod().getName().toLowerCase().contains("cash"))) {
                cashService.record("EXPENSE", order.getTotal(), "Compra #" + order.getId());
                order.setCashRegistered(true);
            }
            return ResponseEntity.ok(purchaseRepo.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Approval flow: Pending → Approved
    @PatchMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        return purchaseRepo.findById(id).map(order -> {
            // Approved status for PURCHASE is id 54
            statusRepo.findAll().stream()
                    .filter(s -> "Approved".equals(s.getName()) && "PURCHASE".equals(s.getType()))
                    .findFirst()
                    .ifPresent(order::setStatus);
            if (order.getStatus() != null
                    && ("Approved".equals(order.getStatus().getName()) || "Aprobado".equals(order.getStatus().getName())
                            || "Completed".equals(order.getStatus().getName())
                            || "Completado".equals(order.getStatus().getName()))
                    &&
                    !Boolean.TRUE.equals(order.getCashRegistered()) &&
                    order.getTotal().compareTo(java.math.BigDecimal.ZERO) > 0 &&
                    order.getPaymentMethod() != null &&
                    (order.getPaymentMethod().getName().toLowerCase().contains("efectivo") ||
                            order.getPaymentMethod().getName().toLowerCase().contains("cash"))) {
                cashService.record("EXPENSE", order.getTotal(), "Compra #" + order.getId());
                order.setCashRegistered(true);
            }
            return ResponseEntity.ok(purchaseRepo.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Rejection flow: set to Cancelled
    @PatchMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id) {
        return purchaseRepo.findById(id).map(order -> {
            statusRepo.findAll().stream()
                    .filter(s -> "Cancelled".equals(s.getName()) && "PURCHASE".equals(s.getType()))
                    .findFirst()
                    .ifPresent(order::setStatus);
            return ResponseEntity.ok(purchaseRepo.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }
}
