package com.store.api.repository;

import com.store.api.entity.Item;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long>, JpaSpecificationExecutor<Item> {
        Page<Item> findByVisibleTrue(Pageable pageable);

        List<Item> findByStockLessThanEqualAndVisibleTrue(int threshold);

        List<Item> findBySupplierId(Long supplierId);
}
