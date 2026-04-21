package com.store.api.controller;

import com.store.api.entity.InternalCost;
import com.store.api.entity.User;
import com.store.api.repository.InternalCostRepository;
import com.store.api.repository.UserRepository;
import com.store.api.service.CashService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/costs")
@RequiredArgsConstructor
public class InternalCostController {

    private final InternalCostRepository costRepo;
    private final UserRepository userRepo;
    private final CashService cashService;

    @GetMapping
    public ResponseEntity<Page<InternalCost>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "costDate") String sort,
            @RequestParam(defaultValue = "DESC") String dir) {
        Sort.Direction direction = dir.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sort));
        Specification<InternalCost> spec = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (from != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("costDate"), from));
            if (to != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("costDate"), to));
            if (category != null)
                predicates.add(cb.like(cb.lower(root.get("category")), "%" + category.toLowerCase() + "%"));
            if (search != null && !search.isBlank())
                predicates.add(cb.like(cb.lower(root.get("description")), "%" + search.toLowerCase() + "%"));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return ResponseEntity.ok(costRepo.findAll(spec, pageable));
    }

    @PostMapping
    public ResponseEntity<InternalCost> create(@RequestBody Map<String, Object> body,
            Authentication auth) {
        InternalCost cost = new InternalCost();
        cost.setDescription((String) body.get("description"));
        cost.setAmount(new java.math.BigDecimal(body.get("amount").toString()));
        cost.setCategory((String) body.get("category"));
        cost.setCostDate(LocalDate.parse((String) body.get("costDate")));
        cost.setCreatedAt(LocalDateTime.now());

        if (auth != null) {
            userRepo.findByUsername(auth.getName()).ifPresent(cost::setCreatedBy);
        }
        return ResponseEntity.ok(costRepo.save(cost));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        return costRepo.findById(id).map(cost -> {
            if (cost.isPaid()) {
                return ResponseEntity.badRequest().body((Object) "No se puede editar un costo que ya fue pagado.");
            }
            cost.setDescription((String) body.get("description"));
            cost.setAmount(new java.math.BigDecimal(body.get("amount").toString()));
            cost.setCategory((String) body.get("category"));
            cost.setCostDate(LocalDate.parse((String) body.get("costDate")));
            return ResponseEntity.ok((Object) costRepo.save(cost));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!costRepo.existsById(id))
            return ResponseEntity.notFound().build();
        costRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/mark-paid")
    public ResponseEntity<InternalCost> markPaid(@PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        return costRepo.findById(id).map(cost -> {
            boolean wasPaid = cost.isPaid();
            boolean targetPaid = body != null && body.containsKey("paid")
                    ? Boolean.parseBoolean(body.get("paid").toString())
                    : !cost.isPaid();
            cost.setPaid(targetPaid);
            cost.setPaidAt(targetPaid ? LocalDateTime.now() : null);
            InternalCost saved = costRepo.save(cost);
            // Register cash outflow only when transitioning to paid
            if (targetPaid && !wasPaid) {
                cashService.record("EXPENSE", saved.getAmount(), "Costo: " + saved.getDescription());
            }
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }
}
