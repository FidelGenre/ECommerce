package com.store.api.controller;

import com.store.api.dto.StockAdjustmentRequest;
import com.store.api.entity.*;
import com.store.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockMovementRepository movementRepo;
    private final ItemRepository itemRepo;
    private final NotificationRepository notificationRepo;
    private final UserRepository userRepo;

    @GetMapping("/movements")
    public ResponseEntity<Page<StockMovement>> movements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long item,
            @RequestParam(required = false) String itemName,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<StockMovement> spec = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (item != null)
                predicates.add(cb.equal(root.get("item").get("id"), item));
            if (itemName != null && !itemName.isBlank())
                predicates.add(cb.like(cb.lower(root.get("item").get("name")), "%" + itemName.toLowerCase() + "%"));
            if (type != null)
                predicates.add(cb.equal(root.get("movementType"), type));
            if (from != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return ResponseEntity.ok(movementRepo.findAll(spec, pageable));
    }

    @PostMapping("/adjust")
    public ResponseEntity<StockMovement> adjust(@RequestBody StockAdjustmentRequest req,
            Authentication auth) {
        Item item = itemRepo.findById(req.getItemId()).orElseThrow();

        item.setStock(item.getStock().add(req.getQuantity()));
        itemRepo.save(item);

        StockMovement movement = new StockMovement();
        movement.setItem(item);
        movement.setMovementType("ADJUSTMENT");
        movement.setQuantity(req.getQuantity());
        movement.setReason(req.getReason());
        movement.setReferenceType("MANUAL");

        if (auth != null) {
            userRepo.findByUsername(auth.getName()).ifPresent(movement::setCreatedBy);
        }

        movementRepo.save(movement);

        if (item.getStock().compareTo(item.getMinStock()) <= 0) {
            Notification notification = new Notification();
            notification.setMessage("Low stock: " + item.getName() + " (" + item.getStock() + " left)");
            notification.setType("WARNING");
            notificationRepo.save(notification);
        }

        return ResponseEntity.ok(movement);
    }
}
