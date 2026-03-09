package com.store.api.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ItemRequest {
    private String name;
    private String description;
    private BigDecimal price;
    private BigDecimal cost;
    private String imageUrl;
    private BigDecimal stock;
    private BigDecimal minStock;
    private Long categoryId;
    private Long supplierId;
    private Boolean visible;
    private String barcode;
    private String unit;
    private BigDecimal unitSize;
    private String purchaseUnit;
    private BigDecimal purchaseConversion;
    private java.util.List<ItemComponentRequest> components;
}
