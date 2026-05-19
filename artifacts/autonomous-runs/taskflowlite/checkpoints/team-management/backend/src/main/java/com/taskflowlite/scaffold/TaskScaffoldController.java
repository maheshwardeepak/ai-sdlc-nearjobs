package com.taskflowlite.scaffold;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskScaffoldController {

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "POST /api/tasks"));
    }

    @GetMapping
    public ResponseEntity<List<Object>> list() {
        return ResponseEntity.status(501).body(List.of());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String id) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "GET /api/tasks/{id}"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id,
                                                     @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "PUT /api/tasks/{id}"));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> changeStatus(@PathVariable String id,
                                                           @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "PATCH /api/tasks/{id}/status"));
    }

    @PatchMapping("/{id}/assignee")
    public ResponseEntity<Map<String, Object>> changeAssignee(@PathVariable String id,
                                                             @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "PATCH /api/tasks/{id}/assignee"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "DELETE /api/tasks/{id}"));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<Object>> listComments(@PathVariable String id) {
        return ResponseEntity.status(501).body(List.of());
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Map<String, Object>> addComment(@PathVariable String id,
                                                         @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "POST /api/tasks/{id}/comments"));
    }

    @GetMapping("/{id}/activity")
    public ResponseEntity<List<Object>> activity(@PathVariable String id) {
        return ResponseEntity.status(501).body(List.of());
    }
}
