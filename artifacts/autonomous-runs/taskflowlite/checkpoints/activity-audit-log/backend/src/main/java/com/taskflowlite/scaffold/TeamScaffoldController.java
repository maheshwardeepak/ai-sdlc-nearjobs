package com.taskflowlite.scaffold;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teams")
public class TeamScaffoldController {

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "POST /api/teams"));
    }

    @GetMapping
    public ResponseEntity<List<Object>> list() {
        return ResponseEntity.status(501).body(List.of());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String id) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "GET /api/teams/{id}"));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<Map<String, Object>> addMember(@PathVariable String id,
                                                        @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "POST /api/teams/{id}/members"));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Map<String, Object>> removeMember(@PathVariable String id, @PathVariable String userId) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "DELETE /api/teams/{id}/members/{userId}"));
    }

    @GetMapping("/{id}/workload")
    public ResponseEntity<Map<String, Object>> workload(@PathVariable String id) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "GET /api/teams/{id}/workload"));
    }

    @GetMapping("/{id}/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard(@PathVariable String id) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "GET /api/teams/{id}/dashboard"));
    }
}