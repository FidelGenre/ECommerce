package com.store.api.repository;

import com.store.api.entity.CashRegister;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CashRegisterRepository extends JpaRepository<CashRegister, Long> {
    Optional<CashRegister> findFirstByClosedAtIsNullOrderByOpenedAtDesc();

    org.springframework.data.domain.Page<CashRegister> findByOpenedAtBetween(java.time.LocalDateTime from, java.time.LocalDateTime to, org.springframework.data.domain.Pageable pageable);
    
    java.util.List<CashRegister> findByOpenedAtBetween(java.time.LocalDateTime from, java.time.LocalDateTime to);
}
