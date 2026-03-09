package com.store.api.controller;

import com.store.api.dto.ItemRequest;
import com.store.api.entity.Item;
import com.store.api.entity.Category;
import com.store.api.entity.Supplier;
import com.store.api.repository.ItemRepository;
import com.store.api.repository.CategoryRepository;
import com.store.api.repository.SupplierRepository;
import com.store.api.repository.NotificationRepository;
import com.store.api.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ItemController {

    private final ItemRepository itemRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;
    private final NotificationRepository notificationRepository;

    // Public: visible items for storefront
    @GetMapping("/api/public/items")
    public ResponseEntity<?> publicList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long category) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("name"));
            Specification<Item> spec = (root, query, cb) -> {
                var predicates = new ArrayList<Predicate>();
                predicates.add(cb.isTrue(root.get("visible")));
                if (q != null)
                    predicates.add(cb.like(cb.lower(root.get("name")), "%" + q.toLowerCase() + "%"));
                if (category != null)
                    predicates.add(cb.equal(root.get("category").get("id"), category));
                return cb.and(predicates.toArray(new Predicate[0]));
            };
            return ResponseEntity.ok(itemRepository.findAll(spec, pageable));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.toString());
        }
    }

    // Admin: all items with filters
    @GetMapping("/api/admin/items")
    public ResponseEntity<?> adminList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) Long supplier) {
        try {
            Sort s = sort != null ? Sort.by(sort) : Sort.by("id");
            Pageable pageable = PageRequest.of(page, size, s);
            Specification<Item> spec = (root, query, cb) -> {
                var predicates = new ArrayList<Predicate>();
                if (q != null)
                    predicates.add(cb.like(cb.lower(root.get("name")), "%" + q.toLowerCase() + "%"));
                if (category != null)
                    predicates.add(cb.equal(root.get("category").get("id"), category));
                if (supplier != null)
                    predicates.add(cb.equal(root.get("supplier").get("id"), supplier));
                return cb.and(predicates.toArray(new Predicate[0]));
            };
            return ResponseEntity.ok(itemRepository.findAll(spec, pageable));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.toString());
        }
    }

    @GetMapping("/api/admin/items/{id}")
    public ResponseEntity<Item> getById(@PathVariable Long id) {
        return itemRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/api/admin/items")
    public ResponseEntity<Item> create(@RequestBody ItemRequest req) {
        Item item = buildItem(new Item(), req);
        return ResponseEntity.ok(itemRepository.save(item));
    }

    @PutMapping("/api/admin/items/{id}")
    public ResponseEntity<Item> update(@PathVariable Long id, @RequestBody ItemRequest req) {
        return itemRepository.findById(id)
                .map(item -> ResponseEntity.ok(itemRepository.save(buildItem(item, req))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/api/admin/items/{id}/visibility")
    public ResponseEntity<Item> toggleVisibility(@PathVariable Long id) {
        return itemRepository.findById(id)
                .map(item -> {
                    item.setVisible(!item.getVisible());
                    return ResponseEntity.ok(itemRepository.save(item));
                }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/api/admin/items/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        itemRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Low stock items
    @GetMapping("/api/admin/items/low-stock")
    public ResponseEntity<List<Item>> lowStock(@RequestParam(defaultValue = "5") int threshold) {
        return ResponseEntity.ok(itemRepository.findByStockLessThanEqualAndVisibleTrue(threshold));
    }

    // QR data for a product (returns JSON for frontend QR rendering)
    @GetMapping("/api/admin/items/{id}/qr")
    public ResponseEntity<?> qrData(@PathVariable Long id) {
        return itemRepository.findById(id).map(item -> {
            java.util.Map<String, Object> qr = new java.util.LinkedHashMap<>();
            qr.put("id", item.getId());
            qr.put("name", item.getName());
            qr.put("barcode", item.getBarcode());
            qr.put("price", item.getPrice());
            qr.put("qrContent", "PRODUCT:" + item.getId() + ":" +
                    (item.getBarcode() != null ? item.getBarcode() : item.getName()));
            return ResponseEntity.ok(qr);
        }).orElse(ResponseEntity.notFound().build());
    }

    // Label data for printing multiple products
    @PostMapping("/api/admin/items/labels")
    public ResponseEntity<?> labels(@RequestBody java.util.Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        java.util.List<Long> ids = ((java.util.List<Number>) body.get("ids")).stream()
                .map(Number::longValue).toList();
        java.util.List<java.util.Map<String, Object>> labels = new java.util.ArrayList<>();
        ids.forEach(id -> itemRepository.findById(id).ifPresent(item -> {
            java.util.Map<String, Object> label = new java.util.LinkedHashMap<>();
            label.put("id", item.getId());
            label.put("name", item.getName());
            label.put("price", item.getPrice());
            label.put("barcode", item.getBarcode());
            label.put("category", item.getCategory() != null ? item.getCategory().getName() : "");
            labels.add(label);
        }));
        return ResponseEntity.ok(labels);
    }

    private Item buildItem(Item item, ItemRequest req) {
        item.setName(req.getName());
        item.setDescription(req.getDescription());
        item.setPrice(req.getPrice());
        item.setCost(req.getCost());
        item.setImageUrl(req.getImageUrl());
        if (req.getStock() != null)
            item.setStock(req.getStock());
        if (req.getMinStock() != null)
            item.setMinStock(req.getMinStock());
        if (req.getVisible() != null)
            item.setVisible(req.getVisible());
        item.setBarcode(req.getBarcode());
        item.setUnit(req.getUnit());
        item.setUnitSize(req.getUnitSize());
        item.setPurchaseUnit(req.getPurchaseUnit());
        item.setPurchaseConversion(
                req.getPurchaseConversion() != null ? req.getPurchaseConversion() : java.math.BigDecimal.ONE);
        if (req.getCategoryId() != null) {
            categoryRepository.findById(req.getCategoryId()).ifPresent(item::setCategory);
        }
        if (req.getSupplierId() != null) {
            supplierRepository.findById(req.getSupplierId()).ifPresent(item::setSupplier);
        }
        return item;
    }
}
