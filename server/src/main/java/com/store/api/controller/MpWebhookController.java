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
    private final ItemRepository itemRepo;
    private final OperationStatusRepository statusRepo;
    private final StockMovementRepository stockMovementRepo;
    private final NotificationRepository notificationRepo;

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
            statusRepo.findByType("SALE").stream()
                    .filter(s -> {
                        String n = s.getName().toLowerCase();
                        return n.contains("complet") || n.contains("pagad") ||
                                n.contains("paid") || n.contains("aprobad") || n.contains("approved");
                    })
                    .findFirst()
                    .ifPresent(order::setStatus);

            // Decrement stock and record movements
            for (SaleLine line : order.getLines()) {
                Item item = line.getItem();
                item.setStock(item.getStock().subtract(line.getQuantity()));
                itemRepo.save(item);

                StockMovement movement = new StockMovement();
                movement.setItem(item);
                movement.setMovementType("OUT");
                movement.setQuantity(line.getQuantity());
                movement.setReason("Online sale - MP payment " + paymentId);
                movement.setReferenceId(order.getId());
                movement.setReferenceType("SALE");
                stockMovementRepo.save(movement);

                if (item.getStock().compareTo(item.getMinStock()) <= 0) {
                    Notification notification = new Notification();
                    notification.setMessage("Low stock: " + item.getName()
                            + " (" + item.getStock() + " left, min: " + item.getMinStock() + ")");
                    notification.setType("WARNING");
                    notificationRepo.save(notification);
                }
            }

            saleOrderRepo.save(order);
            System.out.println("MP webhook: order " + order.getId() + " confirmed, stock decremented.");
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok().build(); // Always return 200 to MP to avoid retries
        }
    }
}
