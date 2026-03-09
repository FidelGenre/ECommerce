package com.store.api.controller;

import com.store.api.dto.LoginRequest;
import com.store.api.dto.LoginResponse;
import com.store.api.entity.User;
import com.store.api.repository.CustomerRepository;
import com.store.api.repository.UserRepository;
import com.store.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import com.store.api.repository.SaleOrderRepository;
import com.store.api.repository.CashMovementRepository;
import com.store.api.repository.PurchaseOrderRepository;
import com.store.api.repository.AccountMovementRepository;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CustomerRepository customerRepo;
    private final SaleOrderRepository saleRepo;
    private final CashMovementRepository cashRepo;
    private final PurchaseOrderRepository purchaseRepo;
    private final AccountMovementRepository accountMoveRepo;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        User user = userRepository.findByUsername(req.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
        if (!user.getActive()) {
            return ResponseEntity.status(403).body("Account disabled");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return ResponseEntity.ok(new LoginResponse(token, user.getUsername(), user.getRole(), user.getId()));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody LoginRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            return ResponseEntity.badRequest().body("Username already taken");
        }
        User user = new User();
        user.setUsername(req.getUsername());
        user.setEmail(req.getUsername() + "@placeholder.com");
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setRole("CUSTOMER");
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return ResponseEntity.ok(new LoginResponse(token, user.getUsername(), user.getRole(), user.getId()));
    }

    @GetMapping("/refresh")
    public ResponseEntity<?> refresh(org.springframework.security.core.Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(401).build();
        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null)
            return ResponseEntity.notFound().build();
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return ResponseEntity.ok(new LoginResponse(token, user.getUsername(), user.getRole(), user.getId()));
    }

    @PatchMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestBody java.util.Map<String, String> body,
            org.springframework.security.core.Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(401).build();
        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null)
            return ResponseEntity.notFound().build();

        if (body.containsKey("email") && !body.get("email").isBlank())
            user.setEmail(body.get("email"));
        if (body.containsKey("password") && !body.get("password").isBlank())
            user.setPasswordHash(passwordEncoder.encode(body.get("password")));

        userRepository.save(user);
        return ResponseEntity.ok(java.util.Map.of("username", user.getUsername(), "email", user.getEmail()));
    }

    /**
     * Returns the Customer record linked to the logged-in user (matched by email).
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMe(org.springframework.security.core.Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(401).build();
        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null)
            return ResponseEntity.notFound().build();
        com.store.api.entity.Customer c = customerRepo.findByEmail(user.getEmail()).orElseGet(() -> {
            com.store.api.entity.Customer nc = new com.store.api.entity.Customer();
            nc.setEmail(user.getEmail());
            String[] parts = user.getUsername().split(" ", 2);
            nc.setFirstName(parts[0]);
            nc.setLastName(parts.length > 1 ? parts[1] : "");
            return customerRepo.save(nc);
        });
        return ResponseEntity.ok(c);
    }

    /**
     * Updates firstName, lastName, phone, address, taxId on the Customer record.
     */
    @PatchMapping("/me")
    public ResponseEntity<?> updateMe(
            @RequestBody java.util.Map<String, String> body,
            org.springframework.security.core.Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(401).build();
        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null)
            return ResponseEntity.notFound().build();
        com.store.api.entity.Customer c = customerRepo.findByEmail(user.getEmail()).orElseGet(() -> {
            com.store.api.entity.Customer nc = new com.store.api.entity.Customer();
            nc.setEmail(user.getEmail());
            return customerRepo.save(nc);
        });
        if (body.containsKey("firstName") && !body.get("firstName").isBlank())
            c.setFirstName(body.get("firstName"));
        if (body.containsKey("lastName"))
            c.setLastName(body.get("lastName"));
        if (body.containsKey("phone"))
            c.setPhone(body.get("phone"));
        if (body.containsKey("address"))
            c.setAddress(body.get("address"));
        if (body.containsKey("taxId"))
            c.setTaxId(body.get("taxId"));
        if (body.containsKey("email") && !body.get("email").isBlank()) {
            c.setEmail(body.get("email"));
            user.setEmail(body.get("email"));
            userRepository.save(user);
        }
        if (body.containsKey("password") && !body.get("password").isBlank())
            user.setPasswordHash(passwordEncoder.encode(body.get("password")));
        userRepository.save(user);
        customerRepo.save(c);
        return ResponseEntity.ok(c);
    }

    /**
     * Deletes the logged-in user's account and associated customer profile.
     */
    @DeleteMapping("/me")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteMe(org.springframework.security.core.Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(401).build();
        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null)
            return ResponseEntity.notFound().build();

        if ("admin".equalsIgnoreCase(user.getUsername())) {
            return ResponseEntity.status(403).body("Admin cannot delete itself.");
        }

        if (user.getCustomer() != null && user.getCustomer().getAccountBalance().compareTo(BigDecimal.ZERO) != 0) {
            return ResponseEntity.status(409)
                    .body("Tu cuenta no puede ser eliminada porque tienes un saldo pendiente o a favor en la tienda.");
        }

        Long id = user.getId();
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

        if (user.getCustomer() != null) {
            Long cid = user.getCustomer().getId();
            saleRepo.findByCustomerId(cid).forEach(s -> {
                s.setCustomer(null);
                saleRepo.save(s);
            });
            accountMoveRepo.deleteAll(accountMoveRepo.findByCustomerIdOrderByCreatedAtDesc(cid));
            customerRepo.delete(user.getCustomer());
        }

        userRepository.delete(user);
        return ResponseEntity.ok().build();
    }
}
