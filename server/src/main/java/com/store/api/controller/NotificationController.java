package com.store.api.controller;

import com.store.api.entity.Notification;
import com.store.api.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepo;

    @GetMapping
    public ResponseEntity<List<Notification>> list() {
        return ResponseEntity.ok(notificationRepo.findByIsReadFalseOrderByCreatedAtDesc());
    }

    @GetMapping("/all")
    public ResponseEntity<List<Notification>> listAll() {
        return ResponseEntity.ok(notificationRepo.findAll(
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC,
                        "createdAt")));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markRead(@PathVariable Long id) {
        return notificationRepo.findById(id).map(n -> {
            n.setIsRead(true);
            return ResponseEntity.ok(notificationRepo.save(n));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead() {
        notificationRepo.findByIsReadFalseOrderByCreatedAtDesc()
                .forEach(n -> {
                    n.setIsRead(true);
                    notificationRepo.save(n);
                });
        return ResponseEntity.noContent().build();
    }
}
