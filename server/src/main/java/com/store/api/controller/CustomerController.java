package com.store.api.controller;

import com.store.api.entity.Customer;
import com.store.api.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.jpa.domain.Specification;
import com.store.api.entity.AccountMovement;
import com.store.api.repository.AccountMovementRepository;
import com.store.api.repository.SaleOrderRepository;

@RestController
@RequestMapping("/api/admin/customers")
@RequiredArgsConstructor
public class CustomerController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CustomerController.class);

    private final CustomerRepository customerRepository;
    private final AccountMovementRepository movementRepo;
    private final SaleOrderRepository saleRepo;

    @GetMapping
    public ResponseEntity<Page<Customer>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "false") boolean all) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("firstName"));
        Specification<Customer> spec = (root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("firstName")), pattern),
                        cb.like(cb.lower(root.get("lastName")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern)));
            }
            if (active != null) {
                predicates.add(cb.or(
                        cb.isNull(root.get("user")),
                        cb.equal(root.get("user").get("active"), active)));
            }

            if (!all) {
                if (role != null && !role.isBlank()) {
                    predicates.add(cb.or(
                            cb.isNull(root.get("user")),
                            cb.equal(root.get("user").get("role"), role)));
                } else {
                    predicates.add(cb.or(
                            cb.isNull(root.get("user")),
                            cb.notEqual(root.get("user").get("role"), "ADMIN")));
                }
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        var result = customerRepository.findAll(spec, pageable);
        log.info("Customer list: page={}, size={}, q={}, active={}, role={}, all={}, found={}", page, size, q, active,
                role, all, result.getTotalElements());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Customer> getById(@PathVariable Long id) {
        return customerRepository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Customer> create(@RequestBody Customer req) {
        return ResponseEntity.ok(customerRepository.save(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Customer> update(@PathVariable Long id, @RequestBody Customer req) {
        return customerRepository.findById(id).map(c -> {
            c.setFirstName(req.getFirstName());
            c.setLastName(req.getLastName());
            c.setEmail(req.getEmail());
            c.setPhone(req.getPhone());
            c.setAddress(req.getAddress());
            c.setTaxId(req.getTaxId());
            c.setNotes(req.getNotes());
            return ResponseEntity.ok(customerRepository.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return customerRepository.findById(id).map(c -> {
            if (c.getAccountBalance().compareTo(java.math.BigDecimal.ZERO) != 0) {
                return ResponseEntity.status(409)
                        .body("El cliente no puede ser eliminado porque tiene un saldo pendiente o a favor.");
            }
            saleRepo.findByCustomerId(id).forEach(s -> {
                s.setCustomer(null);
                saleRepo.save(s);
            });
            movementRepo.deleteAll(movementRepo.findByCustomerIdOrderByCreatedAtDesc(id));
            customerRepository.delete(c);
            return ResponseEntity.<Void>noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // Account balance adjustment
    @PatchMapping("/{id}/balance")
    public ResponseEntity<Customer> adjustBalance(@PathVariable Long id,
            @RequestBody java.util.Map<String, Object> body) {
        return customerRepository.findById(id).map(c -> {
            java.math.BigDecimal amount = new java.math.BigDecimal(body.get("amount").toString());
            c.setAccountBalance(c.getAccountBalance().add(amount));

            // Record the movement
            AccountMovement m = new AccountMovement();
            m.setCustomer(c);
            m.setAmount(amount);
            m.setMovementType(amount.compareTo(java.math.BigDecimal.ZERO) > 0 ? "CHARGE" : "PAYMENT");
            if (body.containsKey("description")) {
                m.setDescription(body.get("description").toString());
            } else {
                m.setDescription("Ajuste manual de saldo");
            }
            movementRepo.save(m);

            return ResponseEntity.ok(customerRepository.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Ledger history
    @GetMapping("/{id}/movements")
    public ResponseEntity<java.util.List<AccountMovement>> movements(@PathVariable Long id) {
        return ResponseEntity.ok(movementRepo.findByCustomerIdOrderByCreatedAtDesc(id));
    }

    // Loyalty points
    @PatchMapping("/{id}/loyalty")
    public ResponseEntity<Customer> adjustLoyalty(@PathVariable Long id,
            @RequestBody java.util.Map<String, Object> body) {
        return customerRepository.findById(id).map(c -> {
            int points = Integer.parseInt(body.get("points").toString());
            c.setLoyaltyPoints(c.getLoyaltyPoints() + points);
            return ResponseEntity.ok(customerRepository.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Account detail
    @GetMapping("/{id}/account")
    public ResponseEntity<?> account(@PathVariable Long id) {
        return customerRepository.findById(id).map(c -> {
            java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
            result.put("id", c.getId());
            result.put("name", c.getFirstName() + " " + (c.getLastName() != null ? c.getLastName() : ""));
            result.put("balance", c.getAccountBalance());
            result.put("loyaltyPoints", c.getLoyaltyPoints());
            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }

    // Sale history
    @GetMapping("/{id}/sales")
    public ResponseEntity<java.util.List<com.store.api.entity.SaleOrder>> getSales(@PathVariable Long id) {
        return ResponseEntity.ok(saleRepo.findByCustomerId(id));
    }
}
