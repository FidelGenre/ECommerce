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
@Table(name = "sales_orders")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class SaleOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Customer customer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "status_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private OperationStatus status;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "payment_method_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private PaymentMethod paymentMethod;

    private String notes;

    @Column(name = "mp_preference_id", length = 120)
    private String mpPreferenceId;

    @Column(name = "mp_payment_id", length = 120)
    private String mpPaymentId;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "points_used", columnDefinition = "integer default 0")
    private Integer pointsUsed = 0;

    @Column(name = "cash_registered", columnDefinition = "boolean default false")
    private Boolean cashRegistered = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler", "passwordHash" })
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "saleOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonIgnoreProperties({ "saleOrder" })
    private List<SaleLine> lines = new ArrayList<>();
}
