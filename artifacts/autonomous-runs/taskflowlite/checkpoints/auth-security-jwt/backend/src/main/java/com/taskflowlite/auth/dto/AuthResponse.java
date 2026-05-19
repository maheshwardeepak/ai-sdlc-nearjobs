package com.taskflowlite.auth.dto;

public class AuthResponse {
    private String token;
    private long expiresIn;
    private String email;
    private String username;
    private String role;

    public AuthResponse() {
    }

    public AuthResponse(String token, long expiresIn, String email, String username, String role) {
        this.token = token;
        this.expiresIn = expiresIn;
        this.email = email;
        this.username = username;
        this.role = role;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public long getExpiresIn() { return expiresIn; }
    public void setExpiresIn(long expiresIn) { this.expiresIn = expiresIn; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
