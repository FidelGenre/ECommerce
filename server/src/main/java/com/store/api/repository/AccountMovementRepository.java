package com.store.api.repository;

import com.store.api.entity.AccountMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AccountMovementRepository extends JpaRepository<AccountMovement, Long> {
    List<AccountMovement> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<AccountMovement> findBySupplierIdOrderByCreatedAtDesc(Long supplierId);
}
