package com.taskflowlite.auth.dto;

public record AuthResponse(
        String token,
        String tokenType,
        long expiresInMs,
        UserSummary user
) {
    public record UserSummary(Long id, String email, String username, String role) {}
}
