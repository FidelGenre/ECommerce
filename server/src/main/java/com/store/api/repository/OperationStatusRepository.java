package com.store.api.repository;

import com.store.api.entity.OperationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OperationStatusRepository extends JpaRepository<OperationStatus, Long> {
    List<OperationStatus> findByType(String type);
}
