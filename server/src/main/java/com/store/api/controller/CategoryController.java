package com.store.api.controller;

import com.store.api.entity.Category;
import com.store.api.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;

    @GetMapping("/public/categories")
    public ResponseEntity<List<Category>> publicList() {
        return ResponseEntity.ok(categoryRepository.findByType("PRODUCT"));
    }

    @GetMapping("/admin/categories")
    public ResponseEntity<List<Category>> adminList(@RequestParam(required = false) String type) {
        if (type != null)
            return ResponseEntity.ok(categoryRepository.findByType(type));
        return ResponseEntity.ok(categoryRepository.findAll());
    }

    @PostMapping("/admin/categories")
    public ResponseEntity<Category> create(@RequestBody Category category) {
        return ResponseEntity.ok(categoryRepository.save(category));
    }

    @PutMapping("/admin/categories/{id}")
    public ResponseEntity<Category> update(@PathVariable Long id, @RequestBody Category req) {
        return categoryRepository.findById(id).map(cat -> {
            cat.setName(req.getName());
            cat.setDescription(req.getDescription());
            cat.setType(req.getType());
            return ResponseEntity.ok(categoryRepository.save(cat));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/admin/categories/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        categoryRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
