package com.store.api.controller;

import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.resources.payment.Payment;
import com.store.api.entity.*;
import com.store.api.repository.*;
import com.store.api.service.CashService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/public/mp")
@RequiredArgsConstructor
public class MpWebhookController {

    private final SaleOrderRepository saleOrderRepo;
    private final OperationStatusRepository statusRepo;
    private final CustomerRepository customerRepo;
    private final CashService cashService;

    @PostMapping("/webhook")
    @Transactional
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

            // ── 1. Mark as paid / completed ──────────────────────────────────
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
            // Do NOT call deductStockForSale again — stockDeducted flag is already true.

            // ── 2. Loyalty points — 1 point per $1.000 spent ─────────────────
            if (order.getCustomer() != null && order.getTotal().compareTo(BigDecimal.ZERO) > 0) {
                Customer customer = order.getCustomer();
                // Re-fetch to avoid stale data
                customer = customerRepo.findById(customer.getId()).orElse(customer);

                int earned = order.getTotal().intValue() / 1000;
                if (earned > 0) {
                    int current = customer.getLoyaltyPoints() != null ? customer.getLoyaltyPoints() : 0;
                    customer.setLoyaltyPoints(current + earned);
                    customerRepo.save(customer);
                    System.out.println("MP webhook: awarded " + earned + " loyalty points to customer "
                            + customer.getId() + " for order " + order.getId());
                }
            }

            // ── 3. Cash movement ─────────────────────────────────────────────
            if (!Boolean.TRUE.equals(order.getCashRegistered())
                    && order.getPaymentMethod() != null
                    && order.getTotal().compareTo(BigDecimal.ZERO) > 0) {
                String method = order.getPaymentMethod().getName();
                cashService.record("INCOME", order.getTotal(),
                        "[" + method + "] Venta online MP #" + order.getId());
                order.setCashRegistered(true);
            }

            saleOrderRepo.save(order);
            System.out.println("MP webhook: order " + order.getId()
                    + " confirmed payment " + paymentId + ", status → Completado.");
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok().build(); // Always return 200 to MP to avoid retries
        }
    }
}
