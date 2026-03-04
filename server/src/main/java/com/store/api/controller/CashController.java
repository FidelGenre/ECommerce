package com.store.api.controller;

import com.store.api.entity.CashMovement;
import com.store.api.entity.CashRegister;
import com.store.api.repository.CashMovementRepository;
import com.store.api.repository.CashRegisterRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/cash")
@RequiredArgsConstructor
public class CashController {

    private final CashRegisterRepository registerRepo;
    private final CashMovementRepository movementRepo;

    @GetMapping("/current")
    public ResponseEntity<?> current() {
        return registerRepo.findFirstByClosedAtIsNullOrderByOpenedAtDesc()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping
    public ResponseEntity<List<CashRegister>> history() {
        return ResponseEntity.ok(registerRepo.findAll());
    }

    @PostMapping("/open")
    public ResponseEntity<CashRegister> open(@RequestBody OpenRequest req) {
        CashRegister register = new CashRegister();
        register.setOpeningAmount(req.getAmount());
        register.setNotes(req.getNotes());
        return ResponseEntity.ok(registerRepo.save(register));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<CashRegister> close(@PathVariable Long id, @RequestBody OpenRequest req) {
        return registerRepo.findById(id).map(r -> {
            r.setClosingAmount(req.getAmount());
            r.setClosedAt(LocalDateTime.now());
            r.setNotes(req.getNotes());
            return ResponseEntity.ok(registerRepo.save(r));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/movements")
    public ResponseEntity<List<CashMovement>> movements(@PathVariable Long id) {
        return ResponseEntity.ok(movementRepo.findByRegisterId(id));
    }

    @PostMapping("/{id}/movements")
    public ResponseEntity<CashMovement> addMovement(@PathVariable Long id, @RequestBody CashMovement req) {
        return registerRepo.findById(id).map(register -> {
            req.setRegister(register);
            return ResponseEntity.ok(movementRepo.save(req));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<Map<String, BigDecimal>> summary(@PathVariable Long id) {
        BigDecimal income = movementRepo.sumByRegisterAndType(id, "INCOME");
        BigDecimal expense = movementRepo.sumByRegisterAndType(id, "EXPENSE");
        return ResponseEntity.ok(Map.of(
                "income", income,
                "expense", expense,
                "net", income.subtract(expense)));
    }

    @Data
    static class OpenRequest {
        private BigDecimal amount;
        private String notes;
    }
}
