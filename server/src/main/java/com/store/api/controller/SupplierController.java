package com.store.api.controller;

import com.store.api.entity.Supplier;
import com.store.api.entity.Category;
import com.store.api.repository.SupplierRepository;
import com.store.api.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import com.store.api.entity.AccountMovement;
import com.store.api.repository.AccountMovementRepository;

@RestController
@RequestMapping("/api/admin/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierRepository supplierRepository;
    private final CategoryRepository categoryRepository;
    private final AccountMovementRepository movementRepo;

    @GetMapping
    public ResponseEntity<Page<Supplier>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("name"));
        Specification<Supplier> spec = (root, query, cb) -> {
            if (q == null || q.isBlank())
                return cb.conjunction();
            String pattern = "%" + q.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("alias")), pattern));
        };
        return ResponseEntity.ok(supplierRepository.findAll(spec, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Supplier> getById(@PathVariable Long id) {
        return supplierRepository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Supplier> create(@RequestBody Supplier req) {
        if (req.getCategory() != null && req.getCategory().getId() != null) {
            categoryRepository.findById(req.getCategory().getId()).ifPresent(req::setCategory);
        }
        return ResponseEntity.ok(supplierRepository.save(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Supplier> update(@PathVariable Long id, @RequestBody Supplier req) {
        return supplierRepository.findById(id).map(s -> {
            s.setName(req.getName());
            s.setLegalName(req.getLegalName());
            s.setTaxId(req.getTaxId());
            s.setAlias(req.getAlias());
            s.setPhone(req.getPhone());
            s.setEmail(req.getEmail());
            s.setAddress(req.getAddress());
            if (req.getCategory() != null && req.getCategory().getId() != null) {
                categoryRepository.findById(req.getCategory().getId()).ifPresent(s::setCategory);
            }
            return ResponseEntity.ok(supplierRepository.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        supplierRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Account balance adjustment
    @PatchMapping("/{id}/balance")
    public ResponseEntity<Supplier> adjustBalance(@PathVariable Long id,
            @RequestBody java.util.Map<String, Object> body) {
        return supplierRepository.findById(id).map(s -> {
            java.math.BigDecimal amount = new java.math.BigDecimal(body.get("amount").toString());
            s.setAccountBalance(s.getAccountBalance().add(amount));

            // Record the movement
            AccountMovement m = new AccountMovement();
            m.setSupplier(s);
            m.setAmount(amount);
            m.setMovementType(amount.compareTo(java.math.BigDecimal.ZERO) > 0 ? "CHARGE" : "PAYMENT");
            if (body.containsKey("description")) {
                m.setDescription(body.get("description").toString());
            } else {
                m.setDescription("Ajuste manual de saldo");
            }
            movementRepo.save(m);

            return ResponseEntity.ok(supplierRepository.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Ledger history
    @GetMapping("/{id}/movements")
    public ResponseEntity<java.util.List<AccountMovement>> movements(@PathVariable Long id) {
        return ResponseEntity.ok(movementRepo.findBySupplierIdOrderByCreatedAtDesc(id));
    }
}
