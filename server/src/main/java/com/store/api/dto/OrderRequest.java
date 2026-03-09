package com.store.api.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class OrderRequest {
    private Long supplierId; // for purchases
    private Long customerId; // for sales
    private Long statusId;
    private Long paymentMethodId;
    private Integer pointsUsed;
    private String notes;
    private String frontendUrl;
    private List<OrderLineRequest> lines;

    @Data
    public static class OrderLineRequest {
        private Long itemId;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal unitCost;
    }
}
