package com.store.api.repository;

import com.store.api.entity.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface PurchaseOrderRepository
                extends JpaRepository<PurchaseOrder, Long>, JpaSpecificationExecutor<PurchaseOrder> {

        @Query("SELECT COALESCE(SUM(p.total), 0) FROM PurchaseOrder p WHERE p.supplier.id = :supplierId")
        java.math.BigDecimal sumTotalBySupplier(@Param("supplierId") Long supplierId);

        @Query("SELECT COALESCE(SUM(p.total), 0) FROM PurchaseOrder p WHERE p.createdAt BETWEEN :from AND :to")
        java.math.BigDecimal sumTotalBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

        List<PurchaseOrder> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to);
}
