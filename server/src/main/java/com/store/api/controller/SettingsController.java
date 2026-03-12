package com.store.api.controller;

import org.springframework.security.core.Authentication;
import com.store.api.repository.UserRepository;
import com.store.api.entity.PaymentMethod;
import com.store.api.entity.OperationStatus;
import com.store.api.entity.SaleOrder;
import com.store.api.entity.PurchaseOrder;
import com.store.api.repository.PaymentMethodRepository;
import com.store.api.repository.OperationStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final PaymentMethodRepository paymentRepo;
    private final OperationStatusRepository statusRepo;
    private final SaleOrderRepository saleRepo;
    private final PurchaseOrderRepository purchaseRepo;
    private final UserRepository userRepo;

    // --- Payment Methods ---
    @GetMapping("/payment-methods")
    public ResponseEntity<List<PaymentMethod>> listPayments() {
        return ResponseEntity.ok(paymentRepo.findAll());
    }

    @PostMapping("/payment-methods")
    public ResponseEntity<PaymentMethod> createPayment(@RequestBody PaymentMethod req, Authentication auth) {
        if (auth != null) {
            userRepo.findByUsername(auth.getName()).ifPresent(req::setCreatedBy);
        }
        return ResponseEntity.ok(paymentRepo.save(req));
    }

    @PutMapping("/payment-methods/{id}")
    public ResponseEntity<PaymentMethod> updatePayment(@PathVariable Long id, @RequestBody PaymentMethod req) {
        return paymentRepo.findById(id).map(p -> {
            p.setName(req.getName());
            p.setDescription(req.getDescription());
            return ResponseEntity.ok(paymentRepo.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/payment-methods/{id}")
    public ResponseEntity<Void> deletePayment(@PathVariable Long id) {
        paymentRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // --- Operation Statuses ---
    @GetMapping("/statuses")
    public ResponseEntity<List<OperationStatus>> listStatuses(@RequestParam(required = false) String type) {
        if (type != null)
            return ResponseEntity.ok(statusRepo.findByType(type));
        return ResponseEntity.ok(statusRepo.findAll());
    }

    @PostMapping("/statuses")
    public ResponseEntity<OperationStatus> createStatus(@RequestBody OperationStatus req, Authentication auth) {
        if (auth != null) {
            userRepo.findByUsername(auth.getName()).ifPresent(req::setCreatedBy);
        }
        return ResponseEntity.ok(statusRepo.save(req));
    }

    @PutMapping("/statuses/{id}")
    public ResponseEntity<OperationStatus> updateStatus(@PathVariable Long id, @RequestBody OperationStatus req) {
        return statusRepo.findById(id).map(s -> {
            s.setName(req.getName());
            s.setType(req.getType());
            s.setColor(req.getColor());
            return ResponseEntity.ok(statusRepo.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/statuses/{id}")
    public ResponseEntity<Void> deleteStatus(@PathVariable Long id) {
        statusRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/statuses/{id}/usage")
    public ResponseEntity<?> getStatusUsage(@PathVariable Long id) {
        return statusRepo.findById(id).map(s -> {
            if ("SALE".equals(s.getType())) {
                List<Long> ids = saleRepo.findByStatusId(id).stream().map(SaleOrder::getId).toList();
                return ResponseEntity.ok(java.util.Map.of("type", "SALE", "ids", ids));
            } else {
                List<Long> ids = purchaseRepo.findByStatusId(id).stream().map(PurchaseOrder::getId).toList();
                return ResponseEntity.ok(java.util.Map.of("type", "PURCHASE", "ids", ids));
            }
        }).orElse(ResponseEntity.notFound().build());
    }
}
