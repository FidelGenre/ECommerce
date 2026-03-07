package com.store.api.controller;

import com.store.api.entity.User;
import com.store.api.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.store.api.repository.SaleOrderRepository;
import com.store.api.repository.CashMovementRepository;
import com.store.api.repository.PurchaseOrderRepository;
import com.store.api.repository.AccountMovementRepository;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final com.store.api.repository.CustomerRepository customerRepo;
    private final SaleOrderRepository saleRepo;
    private final CashMovementRepository cashRepo;
    private final PurchaseOrderRepository purchaseRepo;
    private final AccountMovementRepository accountMoveRepo;

    @GetMapping
    public ResponseEntity<Page<UserCustomerDTO>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("username"));

        Specification<User> spec = Specification.where(null);
        if (search != null && !search.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("username")), "%" + search.toLowerCase() + "%"),
                    cb.like(cb.lower(root.get("email")), "%" + search.toLowerCase() + "%")));
        }
        if (active != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("active"), active));
        }
        if (role != null && !role.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("role"), role));
        }

        Page<User> users = userRepo.findAll(spec, pageable);
        return ResponseEntity.ok(users.map(u -> {
            UserCustomerDTO dto = new UserCustomerDTO();
            dto.setId(u.getId());
            dto.setUsername(u.getUsername());
            dto.setEmail(u.getEmail());
            dto.setRole(u.getRole());
            dto.setActive(u.getActive());
            dto.setCreatedAt(u.getCreatedAt());
            if (u.getCustomer() != null) {
                dto.setFirstName(u.getCustomer().getFirstName());
                dto.setLastName(u.getCustomer().getLastName());
                dto.setPhone(u.getCustomer().getPhone());
                dto.setAccountBalance(u.getCustomer().getAccountBalance());
                dto.setLoyaltyPoints(u.getCustomer().getLoyaltyPoints());
            }
            return dto;
        }));
    }

    @PostMapping
    public ResponseEntity<User> create(@RequestBody UserRequest req) {
        User user = new User();
        user.setUsername(req.getUsername());
        user.setEmail(req.getEmail());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setRole(req.getRole() != null ? req.getRole() : "CUSTOMER");
        user = userRepo.save(user);

        // Auto-create customer profile
        if ("CUSTOMER".equals(user.getRole())) {
            com.store.api.entity.Customer c = new com.store.api.entity.Customer();
            c.setUser(user);
            c.setEmail(user.getEmail());
            c.setFirstName(user.getUsername());
            customerRepo.save(c);
        }

        return ResponseEntity.ok(user);
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> update(@PathVariable Long id, @RequestBody UserRequest req) {
        return userRepo.findById(id).map(u -> {
            if ("admin".equalsIgnoreCase(u.getUsername()))
                return ResponseEntity.status(403).<User>body(null);
            u.setUsername(req.getUsername());
            u.setEmail(req.getEmail());
            if (req.getPassword() != null && !req.getPassword().isBlank()) {
                u.setPasswordHash(passwordEncoder.encode(req.getPassword()));
            }
            if (req.getRole() != null)
                u.setRole(req.getRole());
            return ResponseEntity.ok(userRepo.save(u));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> toggle(@PathVariable Long id) {
        return userRepo.findById(id).map(u -> {
            if ("admin".equalsIgnoreCase(u.getUsername()))
                return ResponseEntity.status(403).<User>body(null);
            u.setActive(!u.getActive());
            return ResponseEntity.ok(userRepo.save(u));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return userRepo.findById(id).map(u -> {
            if ("admin".equalsIgnoreCase(u.getUsername()))
                return ResponseEntity.status(403).<Void>body(null);

            if (u.getCustomer() != null && u.getCustomer().getAccountBalance().compareTo(BigDecimal.ZERO) != 0) {
                return ResponseEntity.status(409)
                        .body("El usuario no puede ser eliminado porque tiene un saldo pendiente o a favor.");
            }

            saleRepo.findByCreatedById(id).forEach(s -> {
                s.setCreatedBy(null);
                saleRepo.save(s);
            });
            cashRepo.findByCreatedById(id).forEach(c -> {
                c.setCreatedBy(null);
                cashRepo.save(c);
            });
            purchaseRepo.findByCreatedById(id).forEach(p -> {
                p.setCreatedBy(null);
                purchaseRepo.save(p);
            });

            if (u.getCustomer() != null) {
                Long cid = u.getCustomer().getId();
                saleRepo.findByCustomerId(cid).forEach(s -> {
                    s.setCustomer(null);
                    saleRepo.save(s);
                });
                accountMoveRepo.deleteAll(accountMoveRepo.findByCustomerIdOrderByCreatedAtDesc(cid));
                customerRepo.delete(u.getCustomer());
            }

            userRepo.deleteById(id);
            return ResponseEntity.<Void>noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // Customer portal: get own profile
    @GetMapping("/{id}/profile")
    public ResponseEntity<User> profile(@PathVariable Long id) {
        return userRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @Data
    static class UserRequest {
        private String username;
        private String email;
        private String password;
        private String role;
    }

    @Data
    static class UserCustomerDTO {
        private Long id;
        private String username;
        private String email;
        private String role;
        private Boolean active;
        private LocalDateTime createdAt;
        private BigDecimal accountBalance;
        private Integer loyaltyPoints;
        private String firstName;
        private String lastName;
        private String phone;
    }
}
