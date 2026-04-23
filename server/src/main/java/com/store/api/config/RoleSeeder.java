package com.store.api.config;

import com.store.api.entity.Role;
import com.store.api.repository.RoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Set;

@Component
public class RoleSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(RoleSeeder.class);
    private final RoleRepository roleRepository;

    public RoleSeeder(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (roleRepository.count() == 0) {
            logger.info("Initializing default system roles (ADMIN, CLIENTE) via Seeder...");
            
            Role admin = new Role();
            admin.setCode("ADMIN");
            admin.setName("Administrador");
            admin.setPermissions(Set.of(
                "VIEW_DASHBOARD", "MANAGE_SALES", "MANAGE_PURCHASES", 
                "MANAGE_INVENTORY", "MANAGE_CASH", "VIEW_REPORTS", 
                "MANAGE_CUSTOMERS", "MANAGE_SUPPLIERS", "MANAGE_SETTINGS"
            ));
            roleRepository.save(admin);

            Role cliente = new Role();
            cliente.setCode("CLIENTE");
            cliente.setName("Cliente");
            cliente.setPermissions(Set.of());
            roleRepository.save(cliente);
            
            logger.info("System roles properly initialized.");
        }

        if (roleRepository.findById("CONSULTA").isEmpty()) {
            Role consulta = new Role();
            consulta.setCode("CONSULTA");
            consulta.setName("Consulta");
            consulta.setPermissions(Set.of(
                "VIEW_DASHBOARD", "MANAGE_SALES", "MANAGE_PURCHASES", 
                "MANAGE_INVENTORY", "MANAGE_CASH", "VIEW_REPORTS", 
                "MANAGE_CUSTOMERS", "MANAGE_SUPPLIERS", "MANAGE_SETTINGS"
            ));
            roleRepository.save(consulta);
            logger.info("CONSULTA role initialized.");
        }
    }
}
