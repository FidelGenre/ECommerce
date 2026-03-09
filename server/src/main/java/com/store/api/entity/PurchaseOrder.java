package com.store.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "purchase_orders")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class PurchaseOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "status_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private OperationStatus status;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "payment_method_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private PaymentMethod paymentMethod;

    private String notes;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "cash_registered", columnDefinition = "boolean default false")
    private Boolean cashRegistered = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler", "password" })
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonIgnoreProperties({ "purchaseOrder" })
    private List<PurchaseLine> lines = new ArrayList<>();
}
