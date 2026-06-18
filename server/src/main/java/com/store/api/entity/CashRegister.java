package com.store.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "cash_registers")
public class CashRegister {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "opening_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal openingAmount = BigDecimal.ZERO;

    @Column(name = "closing_amount", precision = 14, scale = 2)
    private BigDecimal closingAmount;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt = LocalDateTime.now();

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opened_by")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "hibernateLazyInitializer", "handler", "passwordHash", "email", "documentType", "documentNumber", "active", "createdAt", "customer" })
    private User openedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "hibernateLazyInitializer", "handler", "passwordHash", "email", "documentType", "documentNumber", "active", "createdAt", "customer" })
    private User closedBy;

    @Column(length = 255)
    private String notes;

    @Column(name = "discrepancy_reason", length = 500)
    private String discrepancyReason;

    @Column(name = "opening_discrepancy_reason", length = 500)
    private String openingDiscrepancyReason;

    @Transient
    private java.util.Map<String, BigDecimal> paymentTotals;
}
