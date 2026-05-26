package com.store.api.service;

import com.store.api.entity.CashRegister;
import com.store.api.repository.CashRegisterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledCashService {

    private final CashRegisterRepository cashRegisterRepo;

    // Close cash register at 23:59 (11:59 PM) every day
    @Scheduled(cron = "0 59 23 * * ?")
    @Transactional
    public void closeCashAtEndOfDay() {
        log.info("Closing cash register at end of day (23:59)...");
        try {
            Optional<CashRegister> openRegister = cashRegisterRepo.findFirstByClosedAtIsNullOrderByOpenedAtDesc();

            if (openRegister.isPresent()) {
                CashRegister register = openRegister.get();
                register.setClosedAt(LocalDateTime.now());
                // If no closing amount was set manually, use the calculated net amount
                if (register.getClosingAmount() == null) {
                    register.setClosingAmount(BigDecimal.ZERO);
                }
                register.setNotes((register.getNotes() != null ? register.getNotes() + " | " : "") + "Cierre automático");
                cashRegisterRepo.save(register);
                log.info("Cash register {} closed automatically at end of day", register.getId());
            } else {
                log.info("No open cash register to close at end of day");
            }
        } catch (Exception e) {
            log.error("Error closing cash register at end of day: ", e);
        }
    }

    // Open cash register at 00:00 (12:00 AM) every day
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void openCashAtStartOfDay() {
        log.info("Opening new cash register at start of day (00:00)...");
        try {
            // Check if there's already an open register
            Optional<CashRegister> openRegister = cashRegisterRepo.findFirstByClosedAtIsNullOrderByOpenedAtDesc();

            if (openRegister.isEmpty()) {
                // Create new cash register for the day
                CashRegister newRegister = new CashRegister();
                newRegister.setOpeningAmount(BigDecimal.ZERO);
                newRegister.setOpenedAt(LocalDateTime.now());
                newRegister.setNotes("Apertura automática");
                cashRegisterRepo.save(newRegister);
                log.info("New cash register {} opened automatically at start of day", newRegister.getId());
            } else {
                log.info("Cash register already open, skipping auto-open");
            }
        } catch (Exception e) {
            log.error("Error opening cash register at start of day: ", e);
        }
    }
}
