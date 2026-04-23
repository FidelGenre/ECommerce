package com.store.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 40)
    private String action; // CREATE, UPDATE, DELETE

    @Column(nullable = false, length = 50)
    private String entity;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(length = 50, name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(length = 50, name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
