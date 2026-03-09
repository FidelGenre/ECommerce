package com.store.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "item_components")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class ItemComponent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_item_id", nullable = false)
    @JsonIgnoreProperties({ "components", "category", "supplier", "hibernateLazyInitializer", "handler" })
    private Item parentItem;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "component_item_id", nullable = false)
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Item componentItem;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantity = BigDecimal.ONE;
}
