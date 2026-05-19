package com.taskflowlite.scaffold;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Scaffold-only stubs for auth endpoints.
 * Real implementation lands in auth-security-jwt phase.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthScaffoldController {

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "POST /api/auth/register"));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "POST /api/auth/login"));
    }
}
