package com.taskflowlite.auth;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret",
            "ZHVtbXktdGVzdC1zZWNyZXQta2V5LWZvci1qdW5pdC10ZXN0cy1vbmx5LW5vdC1mb3ItcHJvZHVjdGlvbi11c2UtMzItYnl0ZXMtbWluaW11bS1sZW5ndGgtcmVxdWlyZWQtZm9yLWhzMjU2LWFsZ29yaXRobS1zaWduaW5n");
        ReflectionTestUtils.setField(jwtService, "expirationMs", 3600000L);
        try {
            jwtService.getClass().getMethod("init").invoke(jwtService);
        } catch (Exception ignored) {}
    }

    @Test
    void generateAndValidateToken() {
        String token = jwtService.generateToken("user@example.com", 1L, "MEMBER");
        assertNotNull(token);
        assertTrue(jwtService.isTokenValid(token));
        assertEquals("user@example.com", jwtService.extractUsername(token));
    }

    @Test
    void invalidTokenFailsValidation() {
        assertFalse(jwtService.isTokenValid("not-a-jwt"));
    }
}
