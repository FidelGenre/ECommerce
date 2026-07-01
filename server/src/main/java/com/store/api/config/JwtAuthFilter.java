package com.store.api.config;

import com.store.api.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final com.store.api.repository.UserRepository userRepository;
    private final com.store.api.repository.RoleRepository roleRepository;

    // Maps an admin route prefix to the per-area write permission required to modify it.
    // Order matters: the first matching prefix wins, so more specific prefixes are irrelevant
    // here because none overlap. Routes not listed (e.g. dashboard) are read-only for everyone.
    private static final Map<String, String> WRITE_PERMISSION_BY_PREFIX = new java.util.LinkedHashMap<>() {{
        put("/api/admin/sales", "WRITE_SALES");
        put("/api/admin/purchases", "WRITE_PURCHASES");
        put("/api/admin/items", "WRITE_INVENTORY");
        put("/api/admin/stock", "WRITE_INVENTORY");
        put("/api/admin/categories", "WRITE_INVENTORY");
        put("/api/admin/cash", "WRITE_CASH");
        put("/api/admin/customers", "WRITE_CUSTOMERS");
        put("/api/admin/suppliers", "WRITE_SUPPLIERS");
        put("/api/admin/settings", "WRITE_SETTINGS");
        put("/api/admin/roles", "WRITE_SETTINGS");
        put("/api/admin/users", "WRITE_SETTINGS");
        put("/api/admin/costs", "WRITE_SETTINGS");
    }};

    /** Returns the write permission required for a write to this URI, or null if none maps. */
    private static String requiredWritePermission(String uri) {
        for (Map.Entry<String, String> e : WRITE_PERMISSION_BY_PREFIX.entrySet()) {
            if (uri.startsWith(e.getKey())) return e.getValue();
        }
        return null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                String username = jwtUtil.extractUsername(token);
                String role = jwtUtil.extractRole(token);

                // Verify user is still active in database
                var userOpt = userRepository.findByUsername(username);
                if (userOpt.isPresent() && userOpt.get().getActive()) {
                    java.util.List<SimpleGrantedAuthority> authorities = new java.util.ArrayList<>();
                    authorities.add(new SimpleGrantedAuthority(role));

                    roleRepository.findById(role).ifPresent(r -> {
                        r.getPermissions().forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));
                    });

                    var auth = new UsernamePasswordAuthenticationToken(
                            username, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(auth);

                    // Enforce per-area write permissions on admin mutations. A role may write to
                    // an area only if it holds that area's WRITE_* permission, or the global
                    // MANAGE_WRITE (which ADMIN keeps as a catch-all for every area).
                    String uri = request.getRequestURI();
                    String method = request.getMethod();
                    boolean isMutation = "POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method)
                            || "PATCH".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method);
                    if (uri.startsWith("/api/admin/") && isMutation) {
                        String required = requiredWritePermission(uri);
                        boolean allowed = authorities.stream().anyMatch(a ->
                                a.getAuthority().equals("MANAGE_WRITE")
                                || (required != null && a.getAuthority().equals(required)));
                        if (!allowed) {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\": \"Forbidden\", \"message\": \"Tu rol no tiene permiso para modificar esta sección (solo lectura).\"}");
                            return;
                        }
                    }
                }
            }
        }
        chain.doFilter(request, response);
    }
}
