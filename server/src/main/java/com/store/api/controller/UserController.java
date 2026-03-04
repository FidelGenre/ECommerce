package com.store.api.controller;

import com.store.api.entity.User;
import com.store.api.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<Page<User>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("username"));
        return ResponseEntity.ok(userRepo.findAll(pageable));
    }

    @PostMapping
    public ResponseEntity<User> create(@RequestBody UserRequest req) {
        User user = new User();
        user.setUsername(req.getUsername());
        user.setEmail(req.getEmail());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setRole(req.getRole() != null ? req.getRole() : "CUSTOMER");
        return ResponseEntity.ok(userRepo.save(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> update(@PathVariable Long id, @RequestBody UserRequest req) {
        return userRepo.findById(id).map(u -> {
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
    public ResponseEntity<User> toggle(@PathVariable Long id) {
        return userRepo.findById(id).map(u -> {
            u.setActive(!u.getActive());
            return ResponseEntity.ok(userRepo.save(u));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userRepo.deleteById(id);
        return ResponseEntity.noContent().build();
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
}
