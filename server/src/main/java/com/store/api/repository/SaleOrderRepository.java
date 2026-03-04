package com.store.api.repository;

import com.store.api.entity.SaleOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface SaleOrderRepository extends JpaRepository<SaleOrder, Long>, JpaSpecificationExecutor<SaleOrder> {

        @Query("SELECT COALESCE(SUM(s.total), 0) FROM SaleOrder s WHERE s.createdAt BETWEEN :from AND :to")
        BigDecimal sumTotalBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

        List<SaleOrder> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

        List<SaleOrder> findByCustomerId(Long customerId);

        List<SaleOrder> findByCreatedById(Long userId);

        java.util.Optional<SaleOrder> findByMpPreferenceId(String mpPreferenceId);
}
