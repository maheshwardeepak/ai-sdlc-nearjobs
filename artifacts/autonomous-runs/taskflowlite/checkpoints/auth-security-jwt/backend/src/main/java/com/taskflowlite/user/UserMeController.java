package com.taskflowlite.user;

import com.taskflowlite.domain.entity.User;
import com.taskflowlite.domain.repository.UserRepository;
import com.taskflowlite.security.AuthenticatedUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserMeController {

    private final UserRepository userRepository;

    public UserMeController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal AuthenticatedUser principal) {
        Map<String, Object> body = new LinkedHashMap<>();
        if (principal == null) {
            return ResponseEntity.status(401).body(body);
        }
        body.put("id", principal.getId());
        body.put("email", principal.getEmail());
        body.put("role", principal.getRole());
        if (principal.getId() != null) {
            userRepository.findById(principal.getId()).ifPresent(u -> {
                body.put("username", u.getUsername());
                body.put("email", u.getEmail());
                body.put("role", u.getRole() == null ? null : u.getRole().name());
            });
        }
        return ResponseEntity.ok(body);
    }
}
