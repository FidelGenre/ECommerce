package com.store.api.repository;

import com.store.api.entity.CashMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface CashMovementRepository extends JpaRepository<CashMovement, Long> {
    List<CashMovement> findByRegisterId(Long registerId);

    List<CashMovement> findByRegisterIdIn(List<Long> registerIds);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashMovement m WHERE m.register.id = :registerId AND m.movementType = :type")
    BigDecimal sumByRegisterAndType(@Param("registerId") Long registerId, @Param("type") String type);

    List<CashMovement> findByCreatedById(Long userId);
}
