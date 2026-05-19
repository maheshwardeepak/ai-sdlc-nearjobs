package com.taskflowlite.scaffold;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/comments")
public class CommentScaffoldController {

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id,
                                                     @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "PUT /api/comments/{id}"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "DELETE /api/comments/{id}"));
    }
}
