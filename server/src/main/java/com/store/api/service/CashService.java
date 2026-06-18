package com.store.api.service;

import com.store.api.entity.CashMovement;
import com.store.api.entity.CashRegister;
import com.store.api.repository.CashMovementRepository;
import com.store.api.repository.CashRegisterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Records automatic cash movements when financial events occur
 * (sales, purchases, internal cost payments).
 * Runs in its own independent transaction (REQUIRES_NEW) so any
 * failure here never rolls back the parent sale/purchase transaction.
 */
@Service
@RequiredArgsConstructor
public class CashService {

    private final CashRegisterRepository registerRepo;
    private final CashMovementRepository movementRepo;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String movementType, BigDecimal amount, String description) {
        try {
            CashRegister register = registerRepo.findFirstByClosedAtIsNullOrderByOpenedAtDesc()
                    .orElseThrow(() -> new IllegalStateException(
                            "No hay una caja abierta. Abrí la caja antes de registrar operaciones."));

            CashMovement movement = new CashMovement();
            movement.setRegister(register);
            movement.setMovementType(movementType);
            movement.setAmount(amount.abs());
            movement.setDescription(description);
            movement.setIsManual(false); // generado por el sistema
            movementRepo.save(movement);
        } catch (IllegalStateException e) {
            // Propagar para que el controller pueda informar al usuario
            throw e;
        } catch (Exception e) {
            System.err.println("CashService: no se pudo registrar el movimiento - " + e.getMessage());
        }
    }
}
