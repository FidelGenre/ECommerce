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
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") String dir,
            org.springframework.security.core.Authentication auth) {
        Sort.Direction direction = dir.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sort));
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
                jakarta.persistence.criteria.Join<PurchaseOrder, PurchaseLine> qLinesJoin = root.join("lines",
                        jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("supplier").get("name")), pattern),
                        cb.like(cb.lower(root.get("notes")), pattern),
                        cb.like(root.get("id").as(String.class), pattern),
                        cb.like(cb.lower(qLinesJoin.get("item").get("name")), pattern)));
                query.distinct(true);
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

    private boolean isApprovedStatus(String name) {
        if (name == null) return false;
        String n = name.toLowerCase();
        return n.equals("completado") || n.equals("completed") || n.equals("aprobado") || n.equals("approved");
    }

    private void addStockForPurchase(PurchaseOrder order, com.store.api.entity.User createdBy) {
        if (Boolean.TRUE.equals(order.getStockAdded())) return;
        for (PurchaseLine line : order.getLines()) {
            Item item = line.getItem();
            java.math.BigDecimal conversion = item.getPurchaseConversion() != null
                    ? item.getPurchaseConversion() : java.math.BigDecimal.ONE;
            java.math.BigDecimal addedStock = line.getQuantity().multiply(conversion);

            item.setStock(item.getStock().add(addedStock));
            itemRepo.save(item);

            StockMovement movement = new StockMovement();
            movement.setItem(item);
            movement.setMovementType("IN");
            movement.setQuantity(addedStock);
            movement.setReason("Orden de compra #" + order.getId());
            movement.setReferenceId(order.getId());
            movement.setReferenceType("PURCHASE");
            movement.setCreatedBy(createdBy);
            stockMovementRepo.save(movement);

            if (item.getStock().compareTo(item.getMinStock()) > 0) {
                notificationRepo.findByIsReadFalseOrderByCreatedAtDesc().stream()
                        .filter(n -> n.getMessage().contains(item.getName()))
                        .forEach(n -> { n.setIsRead(true); notificationRepo.save(n); });
            }
        }
        order.setStockAdded(true);
    }

    private void removeStockForPurchase(PurchaseOrder order, com.store.api.entity.User cancelledBy) {
        if (!Boolean.TRUE.equals(order.getStockAdded())) return;
        for (PurchaseLine line : order.getLines()) {
            Item item = line.getItem();
            java.math.BigDecimal conversion = item.getPurchaseConversion() != null
                    ? item.getPurchaseConversion() : java.math.BigDecimal.ONE;
            java.math.BigDecimal removedStock = line.getQuantity().multiply(conversion);

            item.setStock(item.getStock().subtract(removedStock));
            itemRepo.save(item);

            StockMovement movement = new StockMovement();
            movement.setItem(item);
            movement.setMovementType("OUT");
            movement.setQuantity(removedStock);
            movement.setReason("Cancelación de compra #" + order.getId());
            movement.setReferenceId(order.getId());
            movement.setReferenceType("PURCHASE_CANCEL");
            movement.setCreatedBy(cancelledBy);
            stockMovementRepo.save(movement);
        }
        order.setStockAdded(false);
    }

    @PostMapping
    public ResponseEntity<PurchaseOrder> create(@RequestBody OrderRequest req,
            org.springframework.security.core.Authentication auth) {
        PurchaseOrder order = new PurchaseOrder();

        com.store.api.entity.User createdBy = auth != null ? userRepo.findByUsername(auth.getName()).orElse(null) : null;
        if (createdBy != null) order.setCreatedBy(createdBy);

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
                order.setTotal(order.getTotal().add(lineReq.getUnitCost().multiply(lineReq.getQuantity())));
            }
        }

        PurchaseOrder saved = purchaseRepo.save(order);

        // Solo sumar stock si el estado inicial ya es aprobado/completado
        if (saved.getStatus() != null && isApprovedStatus(saved.getStatus().getName())) {
            addStockForPurchase(saved, createdBy);
            if (saved.getTotal().compareTo(java.math.BigDecimal.ZERO) > 0 && saved.getPaymentMethod() != null) {
                cashService.record("EXPENSE", saved.getTotal(), "[" + saved.getPaymentMethod().getName() + "] Compra #" + saved.getId());
                saved.setCashRegistered(true);
            }
            saved = purchaseRepo.save(saved);
        }
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PurchaseOrder> updateStatus(@PathVariable Long id, @RequestParam Long statusId,
            org.springframework.security.core.Authentication auth) {
        com.store.api.entity.User updatedBy = auth != null ? userRepo.findByUsername(auth.getName()).orElse(null) : null;
        return purchaseRepo.findById(id).map(order -> {
            String prevStatus = order.getStatus() != null ? order.getStatus().getName() : "";
            statusRepo.findById(statusId).ifPresent(order::setStatus);
            String newStatus = order.getStatus() != null ? order.getStatus().getName() : "";

            boolean becomingApproved = isApprovedStatus(newStatus) && !isApprovedStatus(prevStatus);
            boolean becomingCancelled = newStatus.toLowerCase().contains("cancel");

            if (becomingApproved) {
                addStockForPurchase(order, updatedBy);
                if (!Boolean.TRUE.equals(order.getCashRegistered())
                        && order.getTotal().compareTo(java.math.BigDecimal.ZERO) > 0
                        && order.getPaymentMethod() != null) {
                    cashService.record("EXPENSE", order.getTotal(), "[" + order.getPaymentMethod().getName() + "] Compra #" + order.getId());
                    order.setCashRegistered(true);
                }
            } else if (becomingCancelled) {
                removeStockForPurchase(order, updatedBy);
            }

            return ResponseEntity.ok(purchaseRepo.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id, org.springframework.security.core.Authentication auth) {
        com.store.api.entity.User updatedBy = auth != null ? userRepo.findByUsername(auth.getName()).orElse(null) : null;
        return purchaseRepo.findById(id).map(order -> {
            statusRepo.findAll().stream()
                    .filter(s -> "Aprobado".equals(s.getName()) && "PURCHASE".equals(s.getType()))
                    .findFirst()
                    .ifPresent(order::setStatus);
            addStockForPurchase(order, updatedBy);
            if (!Boolean.TRUE.equals(order.getCashRegistered())
                    && order.getTotal().compareTo(java.math.BigDecimal.ZERO) > 0
                    && order.getPaymentMethod() != null) {
                cashService.record("EXPENSE", order.getTotal(), "[" + order.getPaymentMethod().getName() + "] Compra #" + order.getId());
                order.setCashRegistered(true);
            }
            return ResponseEntity.ok(purchaseRepo.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id, org.springframework.security.core.Authentication auth) {
        com.store.api.entity.User updatedBy = auth != null ? userRepo.findByUsername(auth.getName()).orElse(null) : null;
        return purchaseRepo.findById(id).map(order -> {
            statusRepo.findAll().stream()
                    .filter(s -> "Cancelado".equals(s.getName()) && "PURCHASE".equals(s.getType()))
                    .findFirst()
                    .ifPresent(order::setStatus);
            removeStockForPurchase(order, updatedBy);
            return ResponseEntity.ok(purchaseRepo.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }
}
