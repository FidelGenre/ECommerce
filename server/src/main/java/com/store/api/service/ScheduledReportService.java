package com.store.api.service;

import com.store.api.repository.SaleOrderRepository;
import com.store.api.repository.CashRegisterRepository;
import com.store.api.repository.ItemRepository;
import com.store.api.entity.Item;
import com.store.api.entity.SaleOrder;
import com.store.api.entity.OperationStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledReportService {

        private final JavaMailSender emailSender;
        private final SaleOrderRepository saleRepo;
        private final CashRegisterRepository cashRepo;
        private final ItemRepository itemRepo;
        private final com.store.api.service.StockService stockService;
        private final com.store.api.repository.OperationStatusRepository statusRepo;

        @Value("${app.report.email.to:admin@coffeebeans.com}")
        private String adminEmail;

        @Value("${spring.mail.username:noreply@coffeebeans.com}")
        private String fromEmail;

        // Cancelar reservas vencidas (más de 24 horas en estado Reservado)
        @Scheduled(fixedRate = 3600000) // cada hora
        public void expireReservations() {
                log.info("Checking for expired reservations...");
                LocalDateTime twentyFourHoursAgo = LocalDateTime.now().minusHours(24);

                var targetStatuses = statusRepo.findByType("SALE").stream()
                                .filter(s -> "Reservado".equalsIgnoreCase(s.getName())
                                                || "Reserved".equalsIgnoreCase(s.getName())
                                                || "Pendiente".equalsIgnoreCase(s.getName())
                                                || "Pending".equalsIgnoreCase(s.getName()))
                                .map(com.store.api.entity.OperationStatus::getId)
                                .collect(Collectors.toSet());

                if (!targetStatuses.isEmpty()) {
                        var pendingOrders = saleRepo.findAll().stream()
                                        .filter(o -> o.getStatus() != null
                                                        && targetStatuses.contains(o.getStatus().getId()))
                                        .filter(o -> o.getCreatedAt().isBefore(twentyFourHoursAgo))
                                        .collect(Collectors.toList());

                        if (!pendingOrders.isEmpty()) {
                                statusRepo.findByType("SALE").stream()
                                                .filter(s -> "Cancelado".equalsIgnoreCase(s.getName())
                                                                || "Cancelled".equalsIgnoreCase(
                                                                                s.getName()))
                                                .findFirst()
                                                .ifPresent(cancelledStatus -> {
                                                        for (var order : pendingOrders) {
                                                                log.info("Expiring reservation for order {}",
                                                                                order.getId());
                                                                order.setStatus(cancelledStatus);
                                                                stockService.returnStockForSale(order,
                                                                                "Automatic expiration of 24h reservation");
                                                                saleRepo.save(order);
                                                        }
                                                });
                        }
                }
        }

        // Run every day at 20:00 as requested
        @Scheduled(cron = "0 0 20 * * ?")
        public void sendDailyReport() {
                log.info("Generating daily sales and inventory report...");
                try {
                        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
                        LocalDateTime endOfDay = LocalDate.now().plusDays(1).atStartOfDay();

                        var sales = saleRepo.findByCreatedAtBetween(startOfDay, endOfDay);

                        BigDecimal totalSales = sales.stream()
                                        .map(s -> s.getTotal())
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                        int totalOrders = sales.size();

                        var cjas = cashRepo.findByOpenedAtBetween(startOfDay, endOfDay);
                        BigDecimal cashClosingAmount = cjas.stream()
                                        .filter(c -> c.getClosedAt() != null && c.getClosingAmount() != null)
                                        .map(c -> c.getClosingAmount())
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                        // Low stock alerts
                        List<Item> allItems = itemRepo.findAll();
                        List<Item> lowStockItems = allItems.stream()
                                        .filter(i -> i.getStock().compareTo(i.getMinStock()) <= 0)
                                        .collect(Collectors.toList());

                        MimeMessage message = emailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                        helper.setFrom(fromEmail);
                        helper.setTo(adminEmail);
                        helper.setSubject("Reporte Diario de Gesti\u00f3n - Coffee Beans - " + LocalDate.now());

                        StringBuilder html = new StringBuilder();
                        html.append("<div style='font-family: sans-serif; color: #333;'>");
                        html.append("<h2 style='color: #4A3B32;'>Resumen del día de hoy (").append(LocalDate.now())
                                        .append(")</h2>");
                        html.append(
                                        "<table style='width: 100%; max-width: 600px; border-collapse: collapse; margin-bottom: 20px;'>");
                        html.append(
                                        "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><b>Órdenes completadas:</b></td><td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: right;'>")
                                        .append(totalOrders).append("</td></tr>");
                        html.append(
                                        "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><b>Ingresos Totales por Ventas:</b></td><td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: right;'>$")
                                        .append(totalSales).append("</td></tr>");
                        html.append(
                                        "<tr><td style='padding: 8px; border-bottom: 1px solid #ddd;'><b>Monto Total de Cierres de Caja:</b></td><td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: right;'>$")
                                        .append(cashClosingAmount).append("</td></tr>");
                        html.append("</table>");

                        if (!lowStockItems.isEmpty()) {
                                html.append("<h3 style='color: #D97706; margin-top: 30px;'>⚠️ Alertas de Stock Bajo</h3>");
                                html.append("<table style='width: 100%; max-width: 600px; border-collapse: collapse;'>");
                                html.append(
                                                "<tr style='background-color: #FEF3C7; text-align: left;'><th style='padding: 8px;'>Producto</th><th style='padding: 8px; text-align: center;'>Stock Actual</th><th style='padding: 8px; text-align: center;'>Mínimo</th></tr>");
                                for (Item item : lowStockItems) {
                                        html.append("<tr>");
                                        html.append("<td style='padding: 8px; border-bottom: 1px solid #ddd;'>")
                                                        .append(item.getName())
                                                        .append("</td>");
                                        html.append(
                                                        "<td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: center; color: red; font-weight: bold;'>")
                                                        .append(item.getStock()).append("</td>");
                                        html.append("<td style='padding: 8px; border-bottom: 1px solid #ddd; text-align: center;'>")
                                                        .append(item.getMinStock()).append("</td>");
                                        html.append("</tr>");
                                }
                                html.append("</table>");
                        } else {
                                html.append("<p style='color: #10B981; font-weight: bold;'>✅ Ningún producto con stock bajo.</p>");
                        }

                        html.append(
                                        "<p style='margin-top: 40px; font-size: 12px; color: #777;'>Este es un reporte automático generado por Coffee Beans ERP.</p>");
                        html.append("</div>");

                        helper.setText(html.toString(), true);
                        emailSender.send(message);

                        log.info("Daily HTML report sent to {}", adminEmail);
                } catch (Exception e) {
                        log.error("Error sending daily report: ", e);
                }
        }
}
