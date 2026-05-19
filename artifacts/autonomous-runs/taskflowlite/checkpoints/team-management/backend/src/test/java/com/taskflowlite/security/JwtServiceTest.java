package com.taskflowlite.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService service(String secret) {
        JwtProperties p = new JwtProperties();
        p.setSecret(secret);
        p.setExpirationMs(60_000);
        p.setIssuer("taskflowlite-test");
        return new JwtService(p);
    }

    @Test
    void generatesAndParsesToken() {
        JwtService svc = service("test-secret-test-secret-test-secret-test-secret-123");
        String token = svc.generateToken(42L, "u@x.com", "MEMBER");
        Claims c = svc.parse(token);
        assertThat(c.getSubject()).isEqualTo("42");
        assertThat(c.get("email", String.class)).isEqualTo("u@x.com");
        assertThat(c.get("role", String.class)).isEqualTo("MEMBER");
    }

    @Test
    void rejectsShortSecret() {
        assertThatThrownBy(() -> service("too-short"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsTokenSignedByDifferentKey() {
        JwtService a = service("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        JwtService b = service("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
        String token = a.generateToken(1L, "a@a", "MEMBER");
        assertThatThrownBy(() -> b.parse(token)).isInstanceOf(io.jsonwebtoken.JwtException.class);
    }
}
