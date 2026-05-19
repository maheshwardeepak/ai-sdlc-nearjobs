package com.taskflowlite.health;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Lightweight health endpoint for TaskFlowLite backend.
 *
 * Returns 200 OK with a JSON payload describing service status.
 * This endpoint is intentionally permitted without authentication so that
 * load balancers, container orchestrators, and uptime checks can probe it.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("service", "taskflow-backend");
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(body);
    }
}
