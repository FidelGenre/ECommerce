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

@RestController
@RequestMapping("/api/admin/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final AccountMovementRepository movementRepo;

    @GetMapping
    public ResponseEntity<Page<Customer>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("firstName"));
        Specification<Customer> spec = (root, query, cb) -> {
            if (q == null || q.isBlank())
                return cb.conjunction();
            String pattern = "%" + q.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("firstName")), pattern),
                    cb.like(cb.lower(root.get("lastName")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern));
        };
        return ResponseEntity.ok(customerRepository.findAll(spec, pageable));
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
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        customerRepository.deleteById(id);
        return ResponseEntity.noContent().build();
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
}
