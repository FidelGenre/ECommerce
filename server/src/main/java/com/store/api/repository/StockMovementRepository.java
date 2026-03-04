package com.store.api.repository;

import com.store.api.entity.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StockMovementRepository
                extends JpaRepository<StockMovement, Long>, JpaSpecificationExecutor<StockMovement> {
        Page<StockMovement> findByItemId(Long itemId, Pageable pageable);
}
