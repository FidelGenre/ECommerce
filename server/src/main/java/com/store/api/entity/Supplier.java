package com.store.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "suppliers")
public class Supplier {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String name;

    @Column(name = "legal_name", length = 50)
    private String legalName;

    @Column(name = "tax_id", length = 30)
    private String taxId;

    @Column(length = 40)
    private String alias;

    @Column(length = 30)
    private String phone;

    @Column(length = 50)
    private String email;

    @Column(length = 50)
    private String address;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "account_balance", nullable = false, precision = 14, scale = 2)
    private BigDecimal accountBalance = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
