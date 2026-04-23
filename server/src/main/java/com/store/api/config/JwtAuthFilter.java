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

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final com.store.api.repository.UserRepository userRepository;
    private final com.store.api.repository.RoleRepository roleRepository;

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

                    // Block writing for CONSULTA role
                    if (request.getRequestURI().startsWith("/api/admin/") &&
                        ("POST".equalsIgnoreCase(request.getMethod()) || "PUT".equalsIgnoreCase(request.getMethod()) ||
                         "PATCH".equalsIgnoreCase(request.getMethod()) || "DELETE".equalsIgnoreCase(request.getMethod()))) {
                        if (role.equals("CONSULTA")) {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\": \"Forbidden\", \"message\": \"El rol CONSULTA no tiene permisos para modificar datos.\"}");
                            return;
                        }
                    }
                }
            }
        }
        chain.doFilter(request, response);
    }
}
