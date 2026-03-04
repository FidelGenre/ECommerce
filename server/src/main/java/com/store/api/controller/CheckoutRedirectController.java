package com.store.api.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * Receives MercadoPago's back-URL redirects (which hit the ngrok/backend URL)
 * and bounces the browser to the local Next.js frontend.
 */
@RestController
@RequestMapping("/checkout")
public class CheckoutRedirectController {

    private static final String FRONTEND = "http://localhost:3000";

    @GetMapping("/success")
    public ResponseEntity<Void> success(HttpServletRequest req) {
        return redirect("/checkout/success", req.getQueryString());
    }

    @GetMapping("/pending")
    public ResponseEntity<Void> pending(HttpServletRequest req) {
        return redirect("/checkout/pending", req.getQueryString());
    }

    @GetMapping("/failure")
    public ResponseEntity<Void> failure(HttpServletRequest req) {
        return redirect("/checkout/failure", req.getQueryString());
    }

    private ResponseEntity<Void> redirect(String path, String query) {
        String target = FRONTEND + path + (query != null ? "?" + query : "");
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(target))
                .build();
    }
}
