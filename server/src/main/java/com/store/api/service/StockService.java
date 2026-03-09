package com.store.api.service;

import com.store.api.entity.Item;
import com.store.api.entity.SaleLine;
import com.store.api.entity.SaleOrder;
import com.store.api.entity.StockMovement;
import com.store.api.entity.Notification;
import com.store.api.repository.ItemRepository;
import com.store.api.repository.StockMovementRepository;
import com.store.api.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StockService {

    private final ItemRepository itemRepo;
    private final StockMovementRepository stockMovementRepo;
    private final NotificationRepository notificationRepo;

    @Transactional
    public void deductStockForSale(SaleOrder order, String reasonStr) {
        if (Boolean.TRUE.equals(order.getStockDeducted())) {
            return; // Ya descontado
        }

        for (SaleLine line : order.getLines()) {
            Item item = line.getItem();

            java.math.BigDecimal actualQuantity = line.getQuantity();
            if (item.getUnitSize() != null && item.getUnitSize().compareTo(java.math.BigDecimal.ZERO) > 0) {
                actualQuantity = actualQuantity.multiply(item.getUnitSize());
            }
            item.setStock(item.getStock().subtract(actualQuantity));
            itemRepo.save(item);

            StockMovement movement = new StockMovement();
            movement.setItem(item);
            movement.setMovementType("OUT");
            movement.setQuantity(actualQuantity);
            movement.setReason(reasonStr);
            movement.setReferenceId(order.getId());
            movement.setReferenceType("SALE");
            stockMovementRepo.save(movement);

            // Recipe / Insumos
            if (item.getComponents() != null && !item.getComponents().isEmpty()) {
                for (com.store.api.entity.ItemComponent component : item.getComponents()) {
                    Item subItem = component.getComponentItem();
                    java.math.BigDecimal totalDeduction = component.getQuantity().multiply(line.getQuantity());

                    subItem.setStock(subItem.getStock().subtract(totalDeduction));
                    itemRepo.save(subItem);

                    StockMovement subMovement = new StockMovement();
                    subMovement.setItem(subItem);
                    subMovement.setMovementType("OUT");
                    subMovement.setQuantity(totalDeduction);
                    subMovement.setReason("Recipe component for " + item.getName() + " (Sale #" + order.getId() + ")");
                    stockMovementRepo.save(subMovement);
                }
            }

            if (item.getStock().compareTo(item.getMinStock()) <= 0) {
                Notification notification = new Notification();
                notification.setMessage("Low stock: " + item.getName() + " (" + item.getStock() + " left, min: "
                        + item.getMinStock() + ")");
                notification.setType("WARNING");
                notificationRepo.save(notification);
            }
        }

        order.setStockDeducted(true);
    }

    @Transactional
    public void returnStockForSale(SaleOrder order, String reasonStr) {
        if (!Boolean.TRUE.equals(order.getStockDeducted())) {
            return; // No hay stock que devolver
        }

        for (SaleLine line : order.getLines()) {
            Item item = line.getItem();

            java.math.BigDecimal actualQuantity = line.getQuantity();
            if (item.getUnitSize() != null && item.getUnitSize().compareTo(java.math.BigDecimal.ZERO) > 0) {
                actualQuantity = actualQuantity.multiply(item.getUnitSize());
            }
            item.setStock(item.getStock().add(actualQuantity));
            itemRepo.save(item);

            StockMovement movement = new StockMovement();
            movement.setItem(item);
            movement.setMovementType("IN");
            movement.setQuantity(actualQuantity);
            movement.setReason(reasonStr);
            movement.setReferenceId(order.getId());
            movement.setReferenceType("SALE_CANCEL");
            stockMovementRepo.save(movement);

            // Recipe / Insumos
            if (item.getComponents() != null && !item.getComponents().isEmpty()) {
                for (com.store.api.entity.ItemComponent component : item.getComponents()) {
                    Item subItem = component.getComponentItem();
                    java.math.BigDecimal totalReturn = component.getQuantity().multiply(line.getQuantity());

                    subItem.setStock(subItem.getStock().add(totalReturn));
                    itemRepo.save(subItem);

                    StockMovement subMovement = new StockMovement();
                    subMovement.setItem(subItem);
                    subMovement.setMovementType("IN");
                    subMovement.setQuantity(totalReturn);
                    subMovement.setReason(
                            "Returned parameter component for " + item.getName() + " (Sale #" + order.getId() + ")");
                    stockMovementRepo.save(subMovement);
                }
            }
        }

        order.setStockDeducted(false);
    }
}
