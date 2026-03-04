package com.store.api.repository;

import com.store.api.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByEntityAndCreatedAtBetween(String entity, LocalDateTime from, LocalDateTime to,
            Pageable pageable);
}
