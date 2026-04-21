package com.store.api.controller;

import com.store.api.entity.Role;
import com.store.api.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleRepository roleRepo;

    @GetMapping
    public ResponseEntity<List<Role>> listControls() {
        return ResponseEntity.ok(roleRepo.findAll());
    }

    @PostMapping
    public ResponseEntity<Role> createRole(@RequestBody Role role) {
        if (roleRepo.existsById(role.getCode())) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(roleRepo.save(role));
    }

    @PutMapping("/{code}")
    public ResponseEntity<Role> updateRole(@PathVariable String code, @RequestBody Role roleRequest) {
        return roleRepo.findById(code).map(role -> {
            role.setName(roleRequest.getName());
            role.setPermissions(roleRequest.getPermissions());
            return ResponseEntity.ok(roleRepo.save(role));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<?> deleteRole(@PathVariable String code) {
        if ("ADMIN".equals(code) || "CLIENTE".equals(code)) {
            return ResponseEntity.status(403).body("Cannot delete system roles");
        }
        return roleRepo.findById(code).map(role -> {
            roleRepo.delete(role);
            return ResponseEntity.<Void>noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
