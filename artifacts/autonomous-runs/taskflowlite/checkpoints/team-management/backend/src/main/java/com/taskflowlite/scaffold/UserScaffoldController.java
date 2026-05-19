package com.taskflowlite.scaffold;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserScaffoldController {

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "GET /api/users/me"));
    }

    @PatchMapping("/me")
    public ResponseEntity<Map<String, Object>> updateMe(@RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "PATCH /api/users/me"));
    }

    @GetMapping
    public ResponseEntity<List<Object>> listUsers() {
        return ResponseEntity.status(501).body(List.of());
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<Map<String, Object>> changeRole(@PathVariable String id,
                                                          @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "PATCH /api/users/{id}/role"));
    }
}
