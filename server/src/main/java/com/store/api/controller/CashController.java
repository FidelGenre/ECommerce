package com.store.api.controller;

import com.store.api.entity.CashMovement;
import com.store.api.entity.CashRegister;
import com.store.api.repository.CashMovementRepository;
import com.store.api.repository.CashRegisterRepository;
import com.store.api.repository.UserRepository;
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
    private final UserRepository userRepo;

    @GetMapping("/current")
    public ResponseEntity<?> current() {
        return registerRepo.findFirstByClosedAtIsNullOrderByOpenedAtDesc()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<CashRegister>> history(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "openedAt") String sort,
            @RequestParam(defaultValue = "DESC") String dir) {
            
        org.springframework.data.domain.Sort.Direction direction = dir.equalsIgnoreCase("ASC") ? org.springframework.data.domain.Sort.Direction.ASC : org.springframework.data.domain.Sort.Direction.DESC;
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by(direction, sort));

        org.springframework.data.domain.Page<CashRegister> history;
        if (from != null && to != null) {
            history = registerRepo.findByOpenedAtBetween(from, to, pageable);
        } else {
            history = registerRepo.findAll(pageable);
        }

        List<Long> regIds = history.getContent().stream().map(CashRegister::getId).toList();
        if (!regIds.isEmpty()) {
            List<CashMovement> allMovements = movementRepo.findByRegisterIdIn(regIds);
            Map<Long, List<CashMovement>> byReg = allMovements.stream()
                    .collect(java.util.stream.Collectors.groupingBy(m -> m.getRegister().getId()));

            for (CashRegister r : history.getContent()) {
                List<CashMovement> movements = byReg.getOrDefault(r.getId(), java.util.Collections.emptyList());
                Map<String, BigDecimal> totals = new java.util.HashMap<>();
                for (CashMovement m : movements) {
                    String desc = m.getDescription();
                    if (desc != null && desc.startsWith("[")) {
                        int end = desc.indexOf("]");
                        if (end > 0) {
                            String method = desc.substring(1, end);
                            BigDecimal amount = m.getAmount();
                            if ("EXPENSE".equals(m.getMovementType())) {
                                amount = amount.negate();
                            }
                            totals.merge(method, amount, BigDecimal::add);
                        }
                    }
                }
                r.setPaymentTotals(totals);
            }
        }

        return ResponseEntity.ok(history);
    }

    @PostMapping("/open")
    public ResponseEntity<?> open(@RequestBody OpenRequest req,
            org.springframework.security.core.Authentication auth) {
        if (registerRepo.findFirstByClosedAtIsNullOrderByOpenedAtDesc().isPresent()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Caja ya abierta",
                    "message", "No podés abrir una caja nueva porque ya hay una sesión de caja abierta. Cerrala primero."
            ));
        }

        BigDecimal lastClosing = registerRepo.findFirstByClosedAtIsNotNullOrderByClosedAtDesc()
                .map(CashRegister::getClosingAmount)
                .orElse(BigDecimal.ZERO);

        CashRegister register = new CashRegister();
        register.setOpeningAmount(lastClosing);
        register.setNotes(req.getNotes());
        
        // Registrar quién abrió la caja
        if (auth != null) {
            userRepo.findByUsername(auth.getName()).ifPresent(register::setOpenedBy);
        }
        return ResponseEntity.ok(registerRepo.save(register));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<?> close(@PathVariable Long id, @RequestBody OpenRequest req, org.springframework.security.core.Authentication auth) {
        if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Monto inválido", "message", "El monto de cierre no puede ser negativo."));
        }
        return registerRepo.findById(id).map(r -> {
            BigDecimal income = movementRepo.sumByRegisterAndType(id, "INCOME");
            BigDecimal expense = movementRepo.sumByRegisterAndType(id, "EXPENSE");
            if (income == null) income = BigDecimal.ZERO;
            if (expense == null) expense = BigDecimal.ZERO;

            BigDecimal expectedBalance = (r.getOpeningAmount() != null ? r.getOpeningAmount() : BigDecimal.ZERO)
                    .add(income)
                    .subtract(expense);

            boolean hasDiscrepancy = req.getAmount().compareTo(expectedBalance) != 0;

            if (hasDiscrepancy) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Discrepancia en el cierre de caja",
                        "message", "El monto declarado no coincide con el balance esperado (" + expectedBalance + "). Por favor, registrá los ingresos o egresos correspondientes para cuadrar la caja antes de cerrar.",
                        "expected", expectedBalance,
                        "provided", req.getAmount(),
                        "difference", req.getAmount().subtract(expectedBalance)
                ));
            }

            r.setClosingAmount(req.getAmount());
            r.setClosedAt(LocalDateTime.now());
            r.setNotes(req.getNotes());
            if (auth != null) {
                userRepo.findByUsername(auth.getName()).ifPresent(r::setClosedBy);
            }
            return ResponseEntity.ok(registerRepo.save(r));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/movements")
    public ResponseEntity<List<CashMovement>> movements(@PathVariable Long id) {
        return ResponseEntity.ok(movementRepo.findByRegisterId(id));
    }

    @PostMapping("/{id}/movements")
    public ResponseEntity<?> addMovement(@PathVariable Long id, @RequestBody CashMovement req, org.springframework.security.core.Authentication auth) {
        if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "El monto debe ser mayor a 0."));
        }
        if (req.getDescription() == null || req.getDescription().trim().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "El motivo o descripción es obligatorio."));
        }
        return registerRepo.findById(id).map(register -> {
            req.setRegister(register);
            req.setIsManual(true);
            if (auth != null) {
                userRepo.findByUsername(auth.getName()).ifPresent(req::setCreatedBy);
            }
            return ResponseEntity.ok(movementRepo.save(req));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/movements/{moveId}")
    public ResponseEntity<?> deleteMovement(@PathVariable Long moveId) {
        return movementRepo.findById(moveId).map(m -> {
            if (!Boolean.TRUE.equals(m.getIsManual())) {
                return ResponseEntity.badRequest().body("No se pueden eliminar movimientos generados por el sistema.");
            }
            movementRepo.deleteById(moveId);
            return ResponseEntity.noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<Map<String, Object>> summary(@PathVariable Long id) {
        BigDecimal income = movementRepo.sumByRegisterAndType(id, "INCOME");
        BigDecimal expense = movementRepo.sumByRegisterAndType(id, "EXPENSE");
        if (income == null)
            income = BigDecimal.ZERO;
        if (expense == null)
            expense = BigDecimal.ZERO;

        List<CashMovement> movements = movementRepo.findByRegisterId(id);

        Map<String, BigDecimal> salesByPayment = new java.util.HashMap<>();
        Map<String, BigDecimal> purchasesByPayment = new java.util.HashMap<>();

        for (CashMovement m : movements) {
            String desc = m.getDescription();
            if (desc != null && desc.startsWith("[")) {
                int end = desc.indexOf("]");
                if (end > 0) {
                    String method = desc.substring(1, end);
                    if ("INCOME".equals(m.getMovementType()) && desc.contains("Venta")) {
                        salesByPayment.merge(method, m.getAmount(), BigDecimal::add);
                    } else if ("EXPENSE".equals(m.getMovementType()) && desc.contains("Compra")) {
                        purchasesByPayment.merge(method, m.getAmount(), BigDecimal::add);
                    }
                }
            }
        }

        return ResponseEntity.ok(Map.of(
                "totalIncome", income,
                "totalExpense", expense,
                "net", income.subtract(expense),
                "salesByPayment", salesByPayment,
                "purchasesByPayment", purchasesByPayment));
    }

    @Data
    static class OpenRequest {
        private BigDecimal amount;
        private String notes;
        private String discrepancyReason;
        private String openingDiscrepancyReason;
    }
}
