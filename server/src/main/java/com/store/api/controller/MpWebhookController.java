package com.store.api.controller;

import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.resources.payment.Payment;
import com.store.api.entity.*;
import com.store.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/public/mp")
@RequiredArgsConstructor
public class MpWebhookController {

    private final SaleOrderRepository saleOrderRepo;
    private final OperationStatusRepository statusRepo;

    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(@RequestBody Map<String, Object> payload) {
        try {
            String type = (String) payload.get("type");
            if (!"payment".equals(type))
                return ResponseEntity.ok().build();

            Object dataObj = payload.get("data");
            if (!(dataObj instanceof Map))
                return ResponseEntity.ok().build();
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) dataObj;
            String paymentId = String.valueOf(data.get("id"));

            // Fetch payment from MP API to confirm status
            PaymentClient paymentClient = new PaymentClient();
            Payment payment = paymentClient.get(Long.parseLong(paymentId));

            if (!"approved".equals(payment.getStatus()))
                return ResponseEntity.ok().build();

            String externalRef = payment.getExternalReference();
            if (externalRef == null)
                return ResponseEntity.ok().build();

            SaleOrder order = saleOrderRepo.findById(Long.parseLong(externalRef)).orElse(null);
            if (order == null || order.getMpPaymentId() != null)
                return ResponseEntity.ok().build(); // not found or already processed

            // Mark as paid/completed
            order.setMpPaymentId(paymentId);
            order.setReservedUntil(null); // Payment confirmed, no longer pending
            statusRepo.findByType("SALE").stream()
                    .filter(s -> {
                        String n = s.getName().toLowerCase();
                        return n.equals("completed") || n.equals("completado");
                    })
                    .findFirst()
                    .or(() -> statusRepo.findByType("SALE").stream()
                            .filter(s -> s.getName().toLowerCase().contains("complet"))
                            .findFirst())
                    .ifPresent(order::setStatus);

            // NOTE: Stock was already deducted at checkout (Pendiente state).
            // Do NOT call deductStockForSale again here — it would double-deduct.
            // StockService guard (stockDeducted flag) prevents double deduction, but
            // we avoid the call entirely for clarity.

            saleOrderRepo.save(order);
            System.out.println("MP webhook: order " + order.getId() + " confirmed payment " + paymentId + ", status set to Completado.");
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok().build(); // Always return 200 to MP to avoid retries
        }
    }
}
