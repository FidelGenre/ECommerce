package com.store.api.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ItemComponentRequest {
    private Long componentItemId;
    private BigDecimal quantity;
}
