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
                    .orElseGet(() -> {
                        // No open register — auto-create one rather than skip
                        CashRegister auto = new CashRegister();
                        auto.setOpeningAmount(BigDecimal.ZERO);
                        auto.setNotes("Apertura automática");
                        return registerRepo.save(auto);
                    });

            CashMovement movement = new CashMovement();
            movement.setRegister(register);
            movement.setMovementType(movementType);
            movement.setAmount(amount.abs());
            movement.setDescription(description);
            movementRepo.save(movement);
        } catch (Exception e) {
            System.err.println("CashService: could not record movement - " + e.getMessage());
        }
    }
}
