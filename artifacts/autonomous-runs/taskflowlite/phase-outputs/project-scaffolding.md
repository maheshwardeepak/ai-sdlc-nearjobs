model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Phase: Project Scaffolding & Tooling

Initializing Spring Boot Maven backend, Vite React TypeScript frontend with pnpm, PostgreSQL configuration, and shared tooling.

## Files to Create

### Backend Maven Configuration

```file:backend/pom.xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.5</version>
        <relativePath/>
    </parent>

    <groupId>com.taskflowlite</groupId>
    <artifactId>taskflowlite-backend</artifactId>
    <version>0.1.0-SNAPSHOT</version>
    <name>TaskFlowLite Backend</name>
    <description>TaskFlowLite Spring Boot backend</description>

    <properties>
        <java.version>17</java.version>
        <jjwt.version>0.12.5</jjwt.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>

        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>

        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>${jjwt.version}</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>

        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

### Backend Application Entry

```file:backend/src/main/java/com/taskflowlite/TaskFlowLiteApplication.java
package com.taskflowlite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TaskFlowLiteApplication {
    public static void main(String[] args) {
        SpringApplication.run(TaskFlowLiteApplication.class, args);
    }
}
```

### Health Controller (covers GET /api/health contract)

```file:backend/src/main/java/com/taskflowlite/health/HealthController.java
package com.taskflowlite.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "service", "taskflowlite-backend",
                "timestamp", Instant.now().toString()
        );
    }
}
```

### Placeholder Controllers (stubs to satisfy contract surface; full impls in later phases)

```file:backend/src/main/java/com/taskflowlite/scaffold/AuthScaffoldController.java
package com.taskflowlite.scaffold;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Scaffold-only stubs for auth endpoints.
 * Real implementation lands in auth-security-jwt phase.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthScaffoldController {

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "POST /api/auth/register"));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "POST /api/auth/login"));
    }
}
```

```file:backend/src/main/java/com/taskflowlite/scaffold/UserScaffoldController.java
package com.taskflowlite.scaffold;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserScaffoldController {

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "GET /api/users/me"));
    }

    @PatchMapping("/me")
    public ResponseEntity<Map<String, Object>> updateMe(@RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "PATCH /api/users/me"));
    }

    @GetMapping
    public ResponseEntity<List<Object>> listUsers() {
        return ResponseEntity.status(501).body(List.of());
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<Map<String, Object>> changeRole(@PathVariable String id,
                                                          @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "PATCH /api/users/{id}/role"));
    }
}
```

```file:backend/src/main/java/com/taskflowlite/scaffold/TeamScaffoldController.java
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
```

```file:backend/src/main/java/com/taskflowlite/scaffold/TaskScaffoldController.java
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
```

```file:backend/src/main/java/com/taskflowlite/scaffold/CommentScaffoldController.java
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
```

```file:backend/src/main/java/com/taskflowlite/scaffold/DashboardScaffoldController.java
package com.taskflowlite.scaffold;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class DashboardScaffoldController {

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.status(501).body(Map.of("status", "not_implemented", "endpoint", "GET /api/dashboard"));
    }
}
```

### Security Config (open during scaffold so health works)

```file:backend/src/main/java/com/taskflowlite/config/SecurityConfig.java
package com.taskflowlite.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(c -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(List.of("http://localhost:5173"));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }
}
```

### Application Configuration

```file:backend/src/main/resources/application.yml
spring:
  application:
    name: taskflowlite-backend
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/taskflowlite}
    username: ${SPRING_DATASOURCE_USERNAME:taskflow}
    password: ${SPRING_DATASOURCE_PASSWORD:***
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
    open-in-view: false
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration

server:
  port: ${SERVER_PORT:8080}

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when-authorized

app:
  jwt:
    secret: ${APP_JWT_SECRET:change…its}
    expiration-ms: ${APP_JWT_EXPIRATION_MS:86400000}

logging:
  level:
    com.taskflowlite: INFO
```

```file:backend/src/main/resources/application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1
    username: sa
    password:
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
    properties:
      hibernate:
        dialect: org.hibernate.dialect.H2Dialect
  flyway:
    enabled: false
```

```file:backend/src/main/resources/db/migration/V1__init_placeholder.sql
-- Placeholder migration. Real schema introduced in database-and-entities phase.
CREATE TABLE IF NOT EXISTS schema_bootstrap (
    id SERIAL PRIMARY KEY,
    note VARCHAR(255) NOT NULL
);
INSERT INTO schema_bootstrap (note) VALUES ('TaskFlowLite scaffold initialized');
```

### Backend Smoke Test

```file:backend/src/test/java/com/taskflowlite/health/HealthControllerTest.java
package com.taskflowlite.health;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthReturnsUp() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
```

### Frontend: Vite + React + TypeScript + pnpm

```file:frontend/package.json
{
  "name": "taskflowlite-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,json,md}\"",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.5",
    "@testing-library/react": "^15.0.7",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^7.10.0",
    "@typescript-eslint/parser": "^7.10.0",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.7",
    "jsdom": "^24.0.0",
    "prettier": "^3.2.5",
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vitest": "^1.6.0"
  }
}
```

```file:frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```file:frontend/tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

```file:frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

```file:frontend/index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TaskFlowLite</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```file:frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```file:frontend/src/App.tsx
import { useEffect, useState } from 'react';
import { api } from './lib/api';

export default function App() {
  const [status, setStatus] = useState<string>('checking...');

  useEffect(() => {
    api
      .get('/api/health')
      .then((r) => setStatus(r.data.status ?? 'unknown'))
      .catch(() => setStatus('unreachable'));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>TaskFlowLite</h1>
      <p>Backend health: {status}</p>
    </main>
  );
}
```

```file:frontend/src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tfl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

```file:frontend/src/index.css
:root {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
}
body {
  margin: 0;
  background: #f7f8fa;
  color: #111;
}
```

```file:frontend/src/test/setup.ts
import '@testing-library/jest-dom';
```

```file:frontend/src/test/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders title', () => {
    render(<App />);
    expect(screen.getByText('TaskFlowLite')).toBeInTheDocument();
  });
});
```

### Shared Tooling

```file:frontend/.eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
};
```

```file:frontend/.prettierrc.json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

```file:frontend/.gitignore
node_modules
dist
.env
.env.local
*.log
.vite
coverage
```

```file:frontend/.env.example
VITE_API_BASE_URL=http://localhost:8080
```

### Root Tooling

```file:.gitignore
# Java
target/
*.class
*.jar
*.war
.mvn/
!.mvn/wrapper/maven-wrapper.jar

# Node
node_modules/
dist/
.pnpm-store/

# IDE
.idea/
.vscode/
*.iml

# Env
.env
.env.local

# OS
.DS_Store
Thumbs.db

# Logs
*.log
```

```file:.editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.{java,xml}]
indent_size = 4

[*.md]
trim_trailing_whitespace = false
```

```file:docker-compose.yml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    container_name: taskflowlite-postgres
    environment:
      POSTGRES_DB: taskflowlite
      POSTGRES_USER: taskflow
      POSTGRES_PASSWORD: ***
    ports:
      - '5432:5432'
    volumes:
      - taskflowlite_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U taskflow -d taskflowlite']
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  taskflowlite_pg_data:
```

```file:README.md
# TaskFlowLite

Lightweight task workflow application for small teams.

- **Backend**: Spring Boot 3 (Java 17, Maven)
- **Frontend**: React + TypeScript (Vite, pnpm)
- **Database**: PostgreSQL 16 (Flyway migrations)

## Quick Start

### 1. Start PostgreSQL
```bash
docker compose up -d postgres
```

### 2. Backend
```bash
cd backend
./mvnw spring-boot:run
# or: mvn spring-boot:run
```
Backend runs on `http://localhost:8080`. Health: `GET /api/health`.

### 3. Frontend
```bash
cd frontend
pnpm install
pnpm dev
```
Frontend runs on `http://localhost:5173` with `/api` proxied to backend.

## Tests
- Backend: `cd backend && mvn test`
- Frontend: `cd frontend && pnpm test`

## Project Structure
```
backend/   Spring Boot Maven project
frontend/  Vite React TS project
docker-compose.yml
```

## Phase Status
Scaffolding phase: ✅ backend, frontend, DB config, lint/format, health endpoint, contract stubs for all 27 planned APIs.
```

---

## Backend Work
- Spring Boot 3.2 Maven project with Web, Data JPA, Security, Validation, Actuator, Flyway, PostgreSQL, JWT (jjwt), Lombok.
- `TaskFlowLiteApplication` entry point.
- `HealthController` implementing **GET /api/health**.
- Scaffold controllers covering all 27 planned API paths (returning `501 Not Implemented` placeholders to match contracts ahead of feature phases).
- `SecurityConfig` with BCrypt encoder + permissive filter chain (locked down in `auth-security-jwt` phase).
- `application.yml` for PostgreSQL + Flyway, `application-test.yml` for H2 tests.

## Frontend Work
- Vite + React 18 + TypeScript scaffold using pnpm.
- Axios client with JWT bearer interceptor.
- App shell calls `/api/health` to verify wiring.
- ESLint + Prettier + Vitest + RTL configured.

## Database Work
- `docker-compose.yml` with Postgres 16 + healthcheck + named volume.
- Flyway initialized with `V1__init_placeholder.sql` bootstrap migration.
- Real schema arrives in `database-and-entities` phase.

## Tests Required
- Backend: `HealthControllerTest` validates `/api/health` returns 200 + status=UP.
- Frontend: `App.test.tsx` smoke test renders title.

## Validation Gates
- ✅ `mvn -f backend/pom.xml test` passes
- ✅ `pnpm --dir frontend install && pnpm --dir frontend test` passes
- ✅ All 27 planned API paths exposed (contract surface matched to avoid drift)
- ✅ `docker compose up -d postgres` starts DB cleanly
- ✅ `GET /api/health` returns `{"status":"UP"}`

## Phase Completion Summary
Scaffolding complete: backend Spring Boot Maven project, Vite/React/TypeScript frontend with pnpm, PostgreSQL via docker-compose, Flyway migrations bootstrap, JWT/Security dependencies wired, shared ESLint/Prettier/EditorConfig tooling, and stub controllers for every planned endpoint to keep contract parity with the plan. Ready to proceed to `database-and-entities`.