package com.store.api.config;

import com.store.api.entity.SaleOrder;
import com.store.api.repository.OperationStatusRepository;
import com.store.api.repository.SaleOrderRepository;
import com.store.api.service.StockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReservationExpiryScheduler {

    private final SaleOrderRepository saleRepo;
    private final OperationStatusRepository statusRepo;
    private final StockService stockService;

    @Scheduled(fixedDelay = 300_000) // cada 5 minutos
    @Transactional
    public void releaseExpiredReservations() {
        List<SaleOrder> expired = saleRepo.findExpiredReservations(LocalDateTime.now());
        if (expired.isEmpty()) return;

        log.info("Liberando {} reservas expiradas", expired.size());

        for (SaleOrder order : expired) {
            try {
                stockService.returnStockForSale(order, "Reserva expirada (checkout abandonado)", null);
                // Marcar como cancelado
                statusRepo.findAll().stream()
                        .filter(s -> "Cancelado".equalsIgnoreCase(s.getName()) && "SALE".equals(s.getType()))
                        .findFirst()
                        .ifPresent(order::setStatus);
                order.setReservedUntil(null);
                saleRepo.save(order);
            } catch (Exception e) {
                log.error("Error al liberar reserva de orden #{}: {}", order.getId(), e.getMessage());
            }
        }
    }
}
