package com.store.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false, length = 40)
    private String firstName;

    @Column(name = "last_name", length = 40)
    private String lastName;

    @Column(length = 50)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(length = 50)
    private String address;

    @Column(name = "document_type", length = 15)
    private String documentType;

    @Column(name = "tax_id", length = 20) // Used as documentNumber
    private String taxId;

    @Column(length = 40)
    private String notes;

    @Column(name = "account_balance", nullable = false, precision = 14, scale = 2)
    private BigDecimal accountBalance = BigDecimal.ZERO;

    @Column(name = "loyalty_points", columnDefinition = "integer default 0")
    private Integer loyaltyPoints = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private User user;
}
