package com.store.api.controller;

import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferencePayerRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.preference.Preference;
import com.store.api.dto.OrderRequest;
import com.store.api.entity.*;
import com.store.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/checkout")
@RequiredArgsConstructor
public class CheckoutController {

    private final ItemRepository itemRepo;
    private final SaleOrderRepository saleOrderRepo;
    private final OperationStatusRepository statusRepo;
    private final PaymentMethodRepository paymentMethodRepo;
    private final UserRepository userRepo;
    private final CustomerRepository customerRepo;

    @Value("${app.mercadopago.access-token}")
    private String mpAccessToken;

    @Value("${app.mercadopago.test-buyer-email}")
    private String mpTestBuyerEmail;

    @Value("${app.mercadopago.public-base-url}")
    private String mpPublicBaseUrl;

    @PostConstruct
    public void init() {
        MercadoPagoConfig.setAccessToken(mpAccessToken);
    }

    /**
     * Reads the current public ngrok tunnel URL from the local ngrok agent API.
     * Falls back to the configured mpPublicBaseUrl if ngrok is not running.
     */
    @SuppressWarnings("unchecked")
    private String resolvePublicBaseUrl() {
        try {
            RestTemplate rt = new RestTemplate();
            Map<String, Object> resp = rt.getForObject("http://localhost:4040/api/tunnels", Map.class);
            if (resp != null && resp.get("tunnels") instanceof List<?> tunnels) {
                for (Object t : tunnels) {
                    if (t instanceof Map<?, ?> tunnel) {
                        String proto = (String) tunnel.get("proto");
                        String pubUrl = (String) tunnel.get("public_url");
                        if ("https".equals(proto) && pubUrl != null) {
                            System.out.println("ngrok tunnel detected: " + pubUrl);
                            return pubUrl;
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Could not reach ngrok agent, using configured base URL: " + e.getMessage());
        }
        return mpPublicBaseUrl;
    }

    @PostMapping("/preference")
    public ResponseEntity<?> createPreference(@RequestBody OrderRequest req, Authentication auth) {
        try {
            List<PreferenceItemRequest> mpItems = new ArrayList<>();
            List<Item> resolvedItems = new ArrayList<>();

            for (OrderRequest.OrderLineRequest line : req.getLines()) {
                Item item = itemRepo.findById(line.getItemId())
                        .orElseThrow(() -> new RuntimeException("Item not found: " + line.getItemId()));
                resolvedItems.add(item);

                PreferenceItemRequest mpItem = PreferenceItemRequest.builder()
                        .id(item.getId().toString())
                        .title(item.getName() + " (x" + line.getQuantity() + ")")
                        .quantity(1)
                        .unitPrice(item.getPrice().multiply(line.getQuantity()))
                        .currencyId("ARS")
                        .build();
                mpItems.add(mpItem);
            }

            String publicBaseUrl = resolvePublicBaseUrl();

            String frontendBase = (req.getFrontendUrl() != null && !req.getFrontendUrl().isBlank())
                    ? req.getFrontendUrl()
                    : publicBaseUrl;

            PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                    .success(frontendBase + "/checkout/success")
                    .pending(frontendBase + "/checkout/pending")
                    .failure(frontendBase + "/checkout/failure")
                    .build();

            // Build and save pending SaleOrder first to get its ID
            SaleOrder order = new SaleOrder();

            statusRepo.findByType("SALE").stream()
                    .filter(s -> s.getName().equalsIgnoreCase("PENDIENTE") || s.getName().equalsIgnoreCase("PENDING"))
                    .findFirst()
                    .ifPresent(order::setStatus);

            paymentMethodRepo.findAll().stream()
                    .filter(p -> p.getName().toLowerCase().contains("mercado"))
                    .findFirst()
                    .ifPresent(order::setPaymentMethod);

            if (auth != null) {
                userRepo.findByUsername(auth.getName()).ifPresent(user -> {
                    order.setCreatedBy(user);
                    // Link or auto-create customer record matched by email
                    if (user.getEmail() != null) {
                        Customer customer = customerRepo.findByEmail(user.getEmail()).orElseGet(() -> {
                            // No customer yet for this user — create one
                            Customer c = new Customer();
                            c.setEmail(user.getEmail());
                            // Try to split username into first/last name
                            String[] parts = user.getUsername().split(" ", 2);
                            c.setFirstName(parts[0]);
                            c.setLastName(parts.length > 1 ? parts[1] : "");
                            return customerRepo.save(c);
                        });
                        order.setCustomer(customer);
                    }
                });
            }

            for (int i = 0; i < req.getLines().size(); i++) {
                OrderRequest.OrderLineRequest lineReq = req.getLines().get(i);
                Item item = resolvedItems.get(i);

                SaleLine saleLine = new SaleLine();
                saleLine.setSaleOrder(order);
                saleLine.setItem(item);
                saleLine.setQuantity(lineReq.getQuantity());
                saleLine.setUnitPrice(item.getPrice());
                order.getLines().add(saleLine);
                order.setTotal(order.getTotal()
                        .add(item.getPrice().multiply(lineReq.getQuantity())));
            }

            saleOrderRepo.save(order); // save to get the generated ID

            // Create MP preference with order ID as external_reference
            PreferenceRequest preferenceRequest = PreferenceRequest.builder()
                    .items(mpItems)
                    .backUrls(backUrls)
                    .externalReference(order.getId().toString())
                    .notificationUrl(publicBaseUrl + "/api/public/mp/webhook")
                    .payer(PreferencePayerRequest.builder().email(mpTestBuyerEmail).build())
                    .build();

            PreferenceClient client = new PreferenceClient();
            Preference preference = client.create(preferenceRequest);

            // Link MP preference ID back to the order
            order.setMpPreferenceId(preference.getId());
            order.setMpInitPoint(preference.getInitPoint());
            saleOrderRepo.save(order);

            return ResponseEntity.ok(Map.of("id", preference.getId(), "init_point", preference.getInitPoint()));

        } catch (MPApiException e) {
            String body = e.getApiResponse() != null ? e.getApiResponse().getContent() : "no response body";
            System.err.println("MercadoPago API Error [" + e.getStatusCode() + "]: " + body);
            return ResponseEntity.internalServerError().body("MercadoPago API Error: " + body);
        } catch (MPException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("MercadoPago Error: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error creating preference: " + e.getMessage());
        }
    }
}
