package com.store.api.controller;

import com.store.api.entity.*;
import com.store.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardController {

        private final SaleOrderRepository saleRepo;
        private final PurchaseOrderRepository purchaseRepo;
        private final ItemRepository itemRepo;
        private final NotificationRepository notificationRepo;
        private final CustomerRepository customerRepo;

        @GetMapping("/kpi")
        public ResponseEntity<Map<String, Object>> kpi(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime now = LocalDateTime.now();
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay()
                                : LocalDate.now().withDayOfMonth(1).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : now;

                List<SaleOrder> rangeSales = saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(rangeFrom)
                                                && !s.getCreatedAt().isAfter(rangeTo))
                                .collect(Collectors.toList());

                BigDecimal totalSales = rangeSales.stream()
                                .map(SaleOrder::getTotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                List<PurchaseOrder> rangePurchases = purchaseRepo.findAll().stream()
                                .filter(p -> !p.getCreatedAt().isBefore(rangeFrom)
                                                && !p.getCreatedAt().isAfter(rangeTo))
                                .collect(Collectors.toList());

                BigDecimal totalPurchases = rangePurchases.stream()
                                .map(PurchaseOrder::getTotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal salesMercadoPago = rangeSales.stream()
                                .filter(s -> s.getPaymentMethod() != null
                                                && "MercadoPago".equalsIgnoreCase(s.getPaymentMethod().getName()))
                                .map(com.store.api.entity.SaleOrder::getTotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal salesOther = rangeSales.stream()
                                .filter(s -> s.getPaymentMethod() == null
                                                || !"MercadoPago".equalsIgnoreCase(s.getPaymentMethod().getName()))
                                .map(com.store.api.entity.SaleOrder::getTotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal purchasesMercadoPago = rangePurchases.stream()
                                .filter(p -> p.getPaymentMethod() != null
                                                && "MercadoPago".equalsIgnoreCase(p.getPaymentMethod().getName()))
                                .map(com.store.api.entity.PurchaseOrder::getTotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal purchasesOther = rangePurchases.stream()
                                .filter(p -> p.getPaymentMethod() == null
                                                || !"MercadoPago".equalsIgnoreCase(p.getPaymentMethod().getName()))
                                .map(com.store.api.entity.PurchaseOrder::getTotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal grossMargin = totalSales.subtract(totalPurchases);

                // Always compute today/week for quick reference
                LocalDateTime todayStart = LocalDate.now().atStartOfDay();
                LocalDateTime weekStart = LocalDate.now().minusWeeks(1).atStartOfDay();
                BigDecimal salesToday = saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(todayStart) && !s.getCreatedAt().isAfter(now))
                                .map(SaleOrder::getTotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal salesWeek = saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(weekStart) && !s.getCreatedAt().isAfter(now))
                                .map(SaleOrder::getTotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                long criticalStock = itemRepo.findByStockLessThanEqualAndVisibleTrue(5).size();
                long unreadAlerts = notificationRepo.countByIsReadFalse();

                long ordersCount = rangeSales.size();
                BigDecimal avgTicket = ordersCount > 0
                                ? totalSales.divide(BigDecimal.valueOf(ordersCount), 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                long activeProducts = itemRepo.findAll().stream().filter(Item::getVisible).count();

                Map<String, Object> result = new LinkedHashMap<>();
                result.put("salesToday", salesToday);
                result.put("salesWeek", salesWeek);
                result.put("salesPeriod", totalSales);
                result.put("salesMercadoPago", salesMercadoPago);
                result.put("salesOther", salesOther);
                result.put("purchasesPeriod", totalPurchases);
                result.put("purchasesMercadoPago", purchasesMercadoPago);
                result.put("purchasesOther", purchasesOther);
                result.put("grossMargin", grossMargin);
                result.put("criticalStock", criticalStock);
                result.put("unreadAlerts", unreadAlerts);
                result.put("orderCount", ordersCount);
                result.put("avgTicket", avgTicket);
                result.put("activeProducts", activeProducts);

                return ResponseEntity.ok(result);
        }

        @GetMapping("/sales-by-payment")
        public ResponseEntity<List<Map<String, Object>>> salesByPayment(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay()
                                : LocalDate.now().minusDays(30).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now();
                List<Map<String, Object>> data = new ArrayList<>();
                saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(rangeFrom)
                                                && !s.getCreatedAt().isAfter(rangeTo))
                                .filter(s -> s.getPaymentMethod() != null)
                                .collect(Collectors.groupingBy(
                                                s -> s.getPaymentMethod().getName(),
                                                Collectors.reducing(BigDecimal.ZERO, SaleOrder::getTotal,
                                                                BigDecimal::add)))
                                .forEach((name, total) -> data.add(Map.of("name", name, "value", total)));
                return ResponseEntity.ok(data);
        }

        @GetMapping("/purchases-by-payment")
        public ResponseEntity<List<Map<String, Object>>> purchasesByPayment(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay()
                                : LocalDate.now().minusDays(30).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now();
                List<Map<String, Object>> data = new ArrayList<>();
                purchaseRepo.findAll().stream()
                                .filter(p -> !p.getCreatedAt().isBefore(rangeFrom)
                                                && !p.getCreatedAt().isAfter(rangeTo))
                                .filter(p -> p.getPaymentMethod() != null)
                                .collect(Collectors.groupingBy(
                                                p -> p.getPaymentMethod().getName(),
                                                Collectors.reducing(BigDecimal.ZERO, PurchaseOrder::getTotal,
                                                                BigDecimal::add)))
                                .forEach((name, total) -> data.add(Map.of("name", name, "value", total)));
                return ResponseEntity.ok(data);
        }

        @GetMapping("/sales-by-period")
        public ResponseEntity<List<Map<String, Object>>> salesByPeriod(
                        @RequestParam(defaultValue = "30") int days,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay()
                                : LocalDate.now().minusDays(days).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now();

                List<Map<String, Object>> data = new ArrayList<>();
                saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(rangeFrom)
                                                && !s.getCreatedAt().isAfter(rangeTo))
                                .collect(Collectors.groupingBy(
                                                s -> s.getCreatedAt().toLocalDate().toString(),
                                                TreeMap::new,
                                                Collectors.reducing(BigDecimal.ZERO, SaleOrder::getTotal,
                                                                BigDecimal::add)))
                                .forEach((date, total) -> data.add(Map.of("date", date, "total", total)));

                return ResponseEntity.ok(data);
        }

        @GetMapping("/purchases-by-supplier")
        public ResponseEntity<List<Map<String, Object>>> purchasesBySupplier(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay()
                                : LocalDate.now().minusDays(30).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now();
                List<Map<String, Object>> data = new ArrayList<>();
                purchaseRepo.findAll().stream()
                                .filter(p -> !p.getCreatedAt().isBefore(rangeFrom)
                                                && !p.getCreatedAt().isAfter(rangeTo))
                                .filter(p -> p.getSupplier() != null)
                                .collect(Collectors.groupingBy(
                                                p -> p.getSupplier().getName(),
                                                Collectors.reducing(BigDecimal.ZERO, PurchaseOrder::getTotal,
                                                                BigDecimal::add)))
                                .forEach((name, total) -> data.add(Map.of("supplier", name, "total", total)));
                return ResponseEntity.ok(data);
        }

        @GetMapping("/low-stock")
        public ResponseEntity<?> lowStockItems() {
                return ResponseEntity.ok(itemRepo.findByStockLessThanEqualAndVisibleTrue(5));
        }

        // Sales by category
        @GetMapping("/sales-by-category")
        public ResponseEntity<List<Map<String, Object>>> salesByCategory(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay()
                                : LocalDate.now().minusDays(30).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now();
                List<Map<String, Object>> data = new ArrayList<>();

                saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(rangeFrom)
                                                && !s.getCreatedAt().isAfter(rangeTo))
                                .flatMap(o -> o.getLines().stream())
                                .filter(l -> l.getItem() != null && l.getItem().getCategory() != null)
                                .collect(Collectors.groupingBy(
                                                l -> l.getItem().getCategory().getName(),
                                                Collectors.reducing(BigDecimal.ZERO,
                                                                l -> l.getUnitPrice().multiply(l.getQuantity()),
                                                                BigDecimal::add)))
                                .forEach((cat, total) -> data.add(Map.of("category", cat, "total", total)));
                data.sort((a, b) -> ((BigDecimal) b.get("total")).compareTo((BigDecimal) a.get("total")));
                return ResponseEntity.ok(data);
        }

        // Purchases by category
        @GetMapping("/purchases-by-category")
        public ResponseEntity<List<Map<String, Object>>> purchasesByCategory(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay()
                                : LocalDate.now().minusDays(30).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now();
                List<Map<String, Object>> data = new ArrayList<>();

                purchaseRepo.findAll().stream()
                                .filter(p -> !p.getCreatedAt().isBefore(rangeFrom)
                                                && !p.getCreatedAt().isAfter(rangeTo))
                                .flatMap(o -> o.getLines().stream())
                                .filter(l -> l.getItem() != null && l.getItem().getCategory() != null)
                                .collect(Collectors.groupingBy(
                                                l -> l.getItem().getCategory().getName(),
                                                Collectors.reducing(BigDecimal.ZERO,
                                                                l -> l.getUnitCost().multiply(l.getQuantity()),
                                                                BigDecimal::add)))
                                .forEach((cat, total) -> data.add(Map.of("category", cat, "total", total)));
                data.sort((a, b) -> ((BigDecimal) b.get("total")).compareTo((BigDecimal) a.get("total")));
                return ResponseEntity.ok(data);
        }

        // Sales by hour of day
        @GetMapping("/sales-by-hour")
        public ResponseEntity<List<Map<String, Object>>> salesByHour(
                        @RequestParam(defaultValue = "30") int days,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay() : LocalDate.now().minusDays(days).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusDays(1);
                List<Map<String, Object>> data = new ArrayList<>();
                saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(rangeFrom) && !s.getCreatedAt().isAfter(rangeTo))
                                .collect(Collectors.groupingBy(
                                                s -> s.getCreatedAt().getHour(),
                                                TreeMap::new,
                                                Collectors.reducing(BigDecimal.ZERO, SaleOrder::getTotal,
                                                                BigDecimal::add)))
                                .forEach((hour, total) -> {
                                        data.add(Map.of("hour", String.format("%02d:00", hour), "total", total));
                                });
                return ResponseEntity.ok(data);
        }

        @GetMapping("/margin-evolution")
        public ResponseEntity<List<Map<String, Object>>> marginEvolution(
                        @RequestParam(defaultValue = "12") int months,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                List<Map<String, Object>> data = new ArrayList<>();
                LocalDate rangeFromDate = from != null ? from : LocalDate.now().minusMonths(months).withDayOfMonth(1);
                LocalDate rangeToDate = to != null ? to : LocalDate.now();

                LocalDate currentMonthDate = rangeFromDate.withDayOfMonth(1);
                LocalDate endMonthDate = rangeToDate.withDayOfMonth(1).plusMonths(1);

                List<SaleOrder> allSales = saleRepo.findAll();
                List<PurchaseOrder> allPurchases = purchaseRepo.findAll();

                while (currentMonthDate.isBefore(endMonthDate)) {
                        LocalDateTime startOfMonth = currentMonthDate.atStartOfDay();
                        LocalDateTime endOfMonth = currentMonthDate.plusMonths(1).atStartOfDay();

                        BigDecimal sales = allSales.stream()
                                        .filter(s -> !s.getCreatedAt().isBefore(startOfMonth) && s.getCreatedAt().isBefore(endOfMonth))
                                        .map(SaleOrder::getTotal)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                        BigDecimal purchases = allPurchases.stream()
                                        .filter(p -> !p.getCreatedAt().isBefore(startOfMonth) && p.getCreatedAt().isBefore(endOfMonth))
                                        .map(PurchaseOrder::getTotal)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                        BigDecimal margin = sales.subtract(purchases);

                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("month", currentMonthDate.toString().substring(0, 7));
                        row.put("sales", sales);
                        row.put("purchases", purchases);
                        row.put("margin", margin);
                        data.add(row);

                        currentMonthDate = currentMonthDate.plusMonths(1);
                }
                return ResponseEntity.ok(data);
        }

        // Top customers
        @GetMapping("/top-customers")
        public ResponseEntity<List<Map<String, Object>>> topCustomers(
                        @RequestParam(defaultValue = "10") int limit,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay() : LocalDate.of(2000, 1, 1).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusDays(1);
                List<Map<String, Object>> data = new ArrayList<>();
                saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(rangeFrom) && !s.getCreatedAt().isAfter(rangeTo))
                                .filter(s -> s.getCustomer() != null)
                                .collect(Collectors.groupingBy(
                                                s -> s.getCustomer().getId(),
                                                Collectors.reducing(BigDecimal.ZERO, SaleOrder::getTotal,
                                                                BigDecimal::add)))
                                .entrySet().stream()
                                .sorted(Map.Entry.<Long, BigDecimal>comparingByValue().reversed())
                                .limit(limit)
                                .forEach(e -> {
                                        Customer c = customerRepo.findById(e.getKey()).orElse(null);
                                        if (c == null)
                                                return;
                                        Map<String, Object> row = new LinkedHashMap<>();
                                        row.put("id", c.getId());
                                        row.put("name", (c.getFirstName() != null ? c.getFirstName() : "") + " " +
                                                        (c.getLastName() != null ? c.getLastName() : ""));
                                        row.put("email", c.getEmail());
                                        row.put("totalPurchases", e.getValue());
                                        row.put("orderCount", saleRepo.findByCustomerId(c.getId()).size());
                                        data.add(row);
                                });
                return ResponseEntity.ok(data);
        }

        @GetMapping("/top-customers-clients")
        public ResponseEntity<List<Map<String, Object>>> topCustomersClients(
                        @RequestParam(defaultValue = "10") int limit,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay() : LocalDate.of(2000, 1, 1).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusDays(1);
                List<Map<String, Object>> data = new ArrayList<>();
                saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(rangeFrom) && !s.getCreatedAt().isAfter(rangeTo))
                                .filter(s -> s.getCustomer() != null && s.getCustomer().getUser() != null
                                                && "CLIENTE".equals(s.getCustomer().getUser().getRole()))
                                .collect(Collectors.groupingBy(
                                                s -> s.getCustomer().getId(),
                                                Collectors.reducing(BigDecimal.ZERO, SaleOrder::getTotal,
                                                                BigDecimal::add)))
                                .entrySet().stream()
                                .sorted(Map.Entry.<Long, BigDecimal>comparingByValue().reversed())
                                .limit(limit)
                                .forEach(e -> {
                                        Customer c = customerRepo.findById(e.getKey()).orElse(null);
                                        if (c == null)
                                                return;
                                        Map<String, Object> row = new LinkedHashMap<>();
                                        row.put("id", c.getId());
                                        row.put("name", (c.getFirstName() != null ? c.getFirstName() : "") + " " +
                                                        (c.getLastName() != null ? c.getLastName() : ""));
                                        row.put("email", c.getEmail());
                                        row.put("totalPurchases", e.getValue());
                                        row.put("orderCount", saleRepo.findByCustomerId(c.getId()).size());
                                        data.add(row);
                                });
                return ResponseEntity.ok(data);
        }

        // Sales by client (for reports)
        @GetMapping("/sales-by-client")
        public ResponseEntity<List<Map<String, Object>>> salesByClient(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay() : LocalDate.of(2000, 1, 1).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusDays(1);
                List<Map<String, Object>> data = new ArrayList<>();
                saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(rangeFrom) && !s.getCreatedAt().isAfter(rangeTo))
                                .collect(Collectors.groupingBy(
                                                s -> {
                                                        if (s.getCustomer() != null) {
                                                                String fn = s.getCustomer().getFirstName() != null
                                                                                ? s.getCustomer().getFirstName()
                                                                                : "";
                                                                String ln = s.getCustomer().getLastName() != null
                                                                                ? s.getCustomer().getLastName()
                                                                                : "";
                                                                String full = (fn + " " + ln).trim();
                                                                if (!full.isEmpty())
                                                                        return full;
                                                                if (s.getCustomer().getEmail() != null)
                                                                        return s.getCustomer().getEmail();
                                                        }
                                                        return "Walk-in";
                                                },
                                                Collectors.toList()))
                                .forEach((name, orders) -> {
                                        BigDecimal total = orders.stream()
                                                        .map(SaleOrder::getTotal)
                                                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                                        Map<String, Object> row = new LinkedHashMap<>();
                                        row.put("client", name.trim());
                                        row.put("orders", orders.size());
                                        row.put("total", total);
                                        row.put("avgTicket", orders.isEmpty() ? BigDecimal.ZERO
                                                        : total.divide(BigDecimal.valueOf(orders.size()), 2,
                                                                        RoundingMode.HALF_UP));
                                        data.add(row);
                                });
                data.sort((a, b) -> ((BigDecimal) b.get("total")).compareTo((BigDecimal) a.get("total")));
                return ResponseEntity.ok(data);
        }

        @GetMapping("/sales-by-client-only")
        public ResponseEntity<List<Map<String, Object>>> salesByClientOnly(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay() : LocalDate.of(2000, 1, 1).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusDays(1);
                List<Map<String, Object>> data = new ArrayList<>();
                saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(rangeFrom) && !s.getCreatedAt().isAfter(rangeTo))
                                .filter(s -> s.getCustomer() != null
                                                && s.getCustomer().getUser() != null
                                                && "CLIENTE".equals(s.getCustomer().getUser().getRole()))
                                .collect(Collectors.groupingBy(
                                                s -> {
                                                        String fn = s.getCustomer().getFirstName() != null
                                                                        ? s.getCustomer().getFirstName()
                                                                        : "";
                                                        String ln = s.getCustomer().getLastName() != null
                                                                        ? s.getCustomer().getLastName()
                                                                        : "";
                                                        String full = (fn + " " + ln).trim();
                                                        if (!full.isEmpty())
                                                                return full;
                                                        return s.getCustomer().getEmail() != null
                                                                        ? s.getCustomer().getEmail()
                                                                        : "Unknown";
                                                },
                                                Collectors.toList()))
                                .forEach((name, orders) -> {
                                        BigDecimal total = orders.stream()
                                                        .map(SaleOrder::getTotal)
                                                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                                        Map<String, Object> row = new LinkedHashMap<>();
                                        row.put("client", name.trim());
                                        row.put("orders", orders.size());
                                        row.put("total", total);
                                        row.put("avgTicket", orders.isEmpty() ? BigDecimal.ZERO
                                                        : total.divide(BigDecimal.valueOf(orders.size()), 2,
                                                                        RoundingMode.HALF_UP));
                                        data.add(row);
                                });
                data.sort((a, b) -> ((Integer) b.get("orders")).compareTo((Integer) a.get("orders")));
                return ResponseEntity.ok(data);
        }

        @GetMapping("/non-rotating")
        public ResponseEntity<List<Map<String, Object>>> nonRotatingProducts(
                        @RequestParam(defaultValue = "30") int days,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay() : LocalDate.now().minusDays(days).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusDays(1);

                Set<Long> soldItemIds = saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(rangeFrom) && !s.getCreatedAt().isAfter(rangeTo))
                                .flatMap(o -> o.getLines().stream())
                                .filter(l -> l.getItem() != null)
                                .map(l -> l.getItem().getId())
                                .collect(Collectors.toSet());

                List<Map<String, Object>> data = new ArrayList<>();
                itemRepo.findAll().stream()
                                .filter(Item::getVisible)
                                .filter(i -> !i.getCreatedAt().isAfter(rangeTo))
                                .filter(i -> !soldItemIds.contains(i.getId()))
                                .forEach(i -> {
                                        Map<String, Object> row = new LinkedHashMap<>();
                                        row.put("id", i.getId());
                                        row.put("name", i.getName());
                                        row.put("stock", i.getStock());
                                        row.put("price", i.getPrice());
                                        row.put("category", i.getCategory() != null ? i.getCategory().getName() : "—");
                                        row.put("daysSinceCreated",
                                                        java.time.temporal.ChronoUnit.DAYS.between(
                                                                        i.getCreatedAt().toLocalDate(),
                                                                        LocalDate.now()));
                                        data.add(row);
                                });
                return ResponseEntity.ok(data);
        }

        // Profitability
        @GetMapping("/profitability")
        public ResponseEntity<List<Map<String, Object>>> profitability(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
                LocalDateTime rangeFrom = from != null ? from.atStartOfDay() : LocalDate.of(2000, 1, 1).atStartOfDay();
                LocalDateTime rangeTo = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusDays(1);
                List<Map<String, Object>> data = new ArrayList<>();
                List<SaleOrder> allSales = saleRepo.findAll().stream()
                                .filter(s -> !s.getCreatedAt().isBefore(rangeFrom) && !s.getCreatedAt().isAfter(rangeTo))
                                .collect(Collectors.toList());

                itemRepo.findAll().forEach(item -> {
                        BigDecimal revenue = allSales.stream()
                                        .flatMap(o -> o.getLines().stream())
                                        .filter(l -> l.getItem().getId().equals(item.getId()))
                                        .map(l -> l.getUnitPrice().multiply(l.getQuantity()))
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                        BigDecimal unitsSold = allSales.stream()
                                        .flatMap(o -> o.getLines().stream())
                                        .filter(l -> l.getItem().getId().equals(item.getId()))
                                        .map(SaleLine::getQuantity)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                        if (unitsSold.compareTo(BigDecimal.ZERO) == 0)
                                return;

                        BigDecimal cost = item.getCost().multiply(unitsSold);
                        BigDecimal margin = revenue.subtract(cost);
                        double marginPct = revenue.compareTo(BigDecimal.ZERO) == 0 ? 0
                                        : margin.divide(revenue, 4, RoundingMode.HALF_UP)
                                                        .multiply(BigDecimal.valueOf(100)).doubleValue();

                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("id", item.getId());
                        row.put("name", item.getName());
                        row.put("unitsSold", unitsSold);
                        row.put("revenue", revenue);
                        row.put("cost", cost);
                        row.put("margin", margin);
                        row.put("marginPct", Math.round(marginPct * 10.0) / 10.0);
                        data.add(row);
                });
                data.sort((a, b) -> ((BigDecimal) b.get("margin")).compareTo((BigDecimal) a.get("margin")));
                return ResponseEntity.ok(data);
        }

}
