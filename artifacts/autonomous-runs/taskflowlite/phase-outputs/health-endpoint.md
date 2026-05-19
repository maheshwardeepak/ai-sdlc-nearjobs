model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Backend Health Endpoint Phase Execution

## Files to Create/Update

- `backend/src/main/java/com/taskflowlite/health/HealthController.java` - Custom health endpoint
- `backend/src/main/resources/application.yml` - Actuator configuration
- `backend/src/test/java/com/taskflowlite/health/HealthControllerTest.java` - Health endpoint test

## Backend Work

Implements a simple `/api/health` REST endpoint returning `{ "status": "UP" }` plus Spring Boot Actuator configuration exposing `/actuator/health` for deeper diagnostics.

```file:backend/src/main/java/com/taskflowlite/health/HealthController.java
package com.taskflowlite.health;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Lightweight health endpoint for TaskFlowLite backend.
 *
 * Returns 200 OK with a JSON payload describing service status.
 * This endpoint is intentionally permitted without authentication so that
 * load balancers, container orchestrators, and uptime checks can probe it.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("service", "taskflow-backend");
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(body);
    }
}
```

```file:backend/src/main/resources/application.yml
spring:
  application:
    name: taskflow-backend
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/taskflow}
    username: ${SPRING_DATASOURCE_USERNAME:taskflow}
    password: ${SPRING_DATASOURCE_PASSWORD:***
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        jdbc:
          time_zone: UTC
        format_sql: false
  flyway:
    enabled: true
    baseline-on-migrate: true

server:
  port: ${SERVER_PORT:8080}
  error:
    include-message: always
    include-binding-errors: always

management:
  endpoints:
    web:
      base-path: /actuator
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when_authorized
      probes:
        enabled: true
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
  info:
    env:
      enabled: true

info:
  app:
    name: TaskFlowLite Backend
    description: Lightweight task workflow API
    version: 0.1.0

app:
  jwt:
    secret: ${JWT_SECRET:change…ars}
    expiration-ms: ${JWT_EXPIRATION_MS:86400000}
    issuer: ${JWT_ISSUER:taskflowlite}

logging:
  level:
    root: INFO
    com.taskflowlite: INFO
    org.springframework.web: INFO
```

## Frontend Work

No frontend changes required for this phase. The health endpoint is consumable by the existing axios client when needed (e.g., for boot-time connectivity checks).

## Database Work

No schema changes. The endpoint is independent of persistence and remains responsive even during DB unavailability (the dedicated `/actuator/health/db` indicator covers DB liveness separately).

## Tests Required

```file:backend/src/test/java/com/taskflowlite/health/HealthControllerTest.java
package com.taskflowlite.health;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser
    void healthEndpointReturnsUp() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("taskflow-backend"))
                .andExpect(jsonPath("$.timestamp").exists());
    }
}
```

## Validation Gates

- **Build**: `mvn -q -DskipTests package` compiles cleanly.
- **Test**: `HealthControllerTest` passes verifying 200 + `status=UP` JSON payload.
- **Runtime**: `GET /api/health` → 200 with `{"status":"UP", ...}`; `GET /actuator/health` → 200 with status `UP`.
- **Security**: Endpoint is public (no auth) per security filter chain in earlier phase; actuator restricted to health/info only.
- **Contract**: Matches `apiContracts` entry `GET /api/health` purpose "Backend health check".

## Phase Completion Summary

The `/api/health` endpoint is implemented as a lightweight `@RestController` returning a JSON body with `status`, `service`, and `timestamp`. Spring Boot Actuator is configured via `application.yml` to expose `health` and `info` endpoints with liveness/readiness probes enabled, supporting both Kubernetes-style probing and basic uptime checks. The endpoint requires no authentication and degrades gracefully even if downstream subsystems (DB) are unhealthy, satisfying the acceptance criterion: *"GET /api/health returns 200 with status UP."*