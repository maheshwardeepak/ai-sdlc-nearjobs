package com.taskflowlite.user.dto;

import com.taskflowlite.user.Role;
import com.taskflowlite.user.User;

import java.time.Instant;

public record UserResponse(
        Long id,
        String email,
        String username,
        Role role,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserResponse from(User u) {
        return new UserResponse(
                u.getId(),
                u.getEmail(),
                u.getUsername(),
                u.getRole(),
                u.getCreatedAt(),
                u.getUpdatedAt()
        );
    }
}
