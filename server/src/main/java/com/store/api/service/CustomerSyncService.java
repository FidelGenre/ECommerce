package com.store.api.service;

import com.store.api.entity.Customer;
import com.store.api.entity.User;
import com.store.api.repository.CustomerRepository;
import com.store.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerSyncService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void syncCustomersOnStartup() {
        log.info("Starting customer synchronization check...");

        List<User> clienteUsers = userRepository.findAll().stream()
                .filter(u -> "CLIENTE".equals(u.getRole()) || "CUSTOMER".equals(u.getRole()))
                .toList();

        int createdCount = 0;
        for (User user : clienteUsers) {
            if (user.getCustomer() == null) {
                // Check if a customer with this email already exists but isn't linked
                Customer existing = customerRepository.findByEmail(user.getEmail()).orElse(null);

                if (existing == null) {
                    log.info("Creating missing customer profile for user: {}", user.getUsername());
                    Customer nc = new Customer();
                    nc.setUser(user);
                    nc.setEmail(user.getEmail());

                    String[] parts = user.getUsername().split(" ", 2);
                    nc.setFirstName(parts[0]);
                    nc.setLastName(parts.length > 1 ? parts[1] : "");

                    customerRepository.save(nc);
                    createdCount++;
                } else if (existing.getUser() == null) {
                    log.info("Linking existing customer profile to user: {}", user.getUsername());
                    existing.setUser(user);
                    customerRepository.save(existing);
                    createdCount++;
                }
            }
        }

        if (createdCount > 0) {
            log.info("Customer synchronization complete. {} profiles created or linked.", createdCount);
        } else {
            log.info("Customer synchronization complete. Everything is up to date.");
        }
    }
}
