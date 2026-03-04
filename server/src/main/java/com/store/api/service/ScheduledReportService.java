package com.store.api.service;

import com.store.api.repository.SaleOrderRepository;
import com.store.api.repository.CashRegisterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledReportService {

    private final JavaMailSender emailSender;
    private final SaleOrderRepository saleRepo;
    private final CashRegisterRepository cashRepo;

    @Value("${app.report.email.to:admin@coffeebeans.com}")
    private String adminEmail;

    @Value("${spring.mail.username:noreply@coffeebeans.com}")
    private String fromEmail;

    // Run every day at 23:59
    @Scheduled(cron = "0 59 23 * * ?")
    public void sendDailyReport() {
        log.info("Generating daily sales report...");
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

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(adminEmail);
            message.setSubject("Reporte Diario de Gesti\u00f3n - Coffee Beans - " + LocalDate.now());
            message.setText("Hola,\n\nAqu\u00ed tienes el resumen del d\u00eda de hoy (" + LocalDate.now() + "):\n\n" +
                    "- \u00d3rdenes completadas: " + totalOrders + "\n" +
                    "- Ingresos Totales por Ventas: $" + totalSales + "\n" +
                    "- Monto Total de Cierres de Caja hoy: $" + cashClosingAmount + "\n\n" +
                    "Saludos,\nCoffee Beans ERP");

            emailSender.send(message);
            log.info("Daily report sent to {}", adminEmail);
        } catch (Exception e) {
            log.error("Error sending daily report: ", e);
        }
    }
}
