package com.store.api.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class StockAdjustmentRequest {
    private Long itemId;
    private BigDecimal quantity; // positive = add, negative = remove
    private String reason;
}
