package com.store.api.repository;

import com.store.api.entity.InternalCost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InternalCostRepository
                extends JpaRepository<InternalCost, Long>, JpaSpecificationExecutor<InternalCost> {
}
