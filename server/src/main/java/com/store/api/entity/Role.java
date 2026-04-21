package com.store.api.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Table(name = "roles")
public class Role {

    @Id
    @Column(length = 50)
    private String code; // e.g. "ADMIN", "CLIENTE", "VENDEDOR"

    @Column(nullable = false, length = 100)
    private String name;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_permissions", joinColumns = @JoinColumn(name = "role_code"))
    @Column(name = "permission")
    private Set<String> permissions = new HashSet<>();
}
