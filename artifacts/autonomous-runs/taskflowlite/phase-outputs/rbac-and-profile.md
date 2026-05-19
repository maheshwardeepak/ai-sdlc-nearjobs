model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Phase: RBAC & User Profile

Implementing role-based access control with ADMIN/MANAGER/MEMBER roles, method-level security, and user profile endpoints.

## Backend Work

### User DTOs

```file:backend/src/main/java/com/taskflowlite/user/dto/UserResponse.java
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
```

```file:backend/src/main/java/com/taskflowlite/user/dto/UpdateProfileRequest.java
package com.taskflowlite.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(min = 3, max = 50) String username,
        @Email String email
) {}
```

```file:backend/src/main/java/com/taskflowlite/user/dto/UpdateRoleRequest.java
package com.taskflowlite.user.dto;

import com.taskflowlite.user.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(@NotNull Role role) {}
```

### User Service

```file:backend/src/main/java/com/taskflowlite/user/UserService.java
package com.taskflowlite.user;

import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.common.exception.ConflictException;
import com.taskflowlite.user.dto.UpdateProfileRequest;
import com.taskflowlite.user.dto.UpdateRoleRequest;
import com.taskflowlite.user.dto.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found: " + email));
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> list(Pageable pageable) {
        return userRepository.findAll(pageable).map(UserResponse::from);
    }

    public UserResponse updateProfile(String currentEmail, UpdateProfileRequest req) {
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new NotFoundException("User not found: " + currentEmail));

        if (req.username() != null && !req.username().equals(user.getUsername())) {
            if (userRepository.existsByUsername(req.username())) {
                throw new ConflictException("Username already taken");
            }
            user.setUsername(req.username());
        }
        if (req.email() != null && !req.email().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(req.email())) {
                throw new ConflictException("Email already in use");
            }
            user.setEmail(req.email());
        }
        return UserResponse.from(user);
    }

    public UserResponse updateRole(Long userId, UpdateRoleRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
        user.setRole(req.role());
        return UserResponse.from(user);
    }
}
```

### Exceptions (ensure presence)

```file:backend/src/main/java/com/taskflowlite/common/exception/NotFoundException.java
package com.taskflowlite.common.exception;

public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
```

```file:backend/src/main/java/com/taskflowlite/common/exception/ConflictException.java
package com.taskflowlite.common.exception;

public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
```

```file:backend/src/main/java/com/taskflowlite/common/exception/GlobalExceptionHandler.java
package com.taskflowlite.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(ConflictException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCreds(BadCredentialsException ex) {
        return error(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> body = base(HttpStatus.BAD_REQUEST, "Validation failed");
        Map<String, String> fields = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fields.put(fe.getField(), fe.getDefaultMessage());
        }
        body.put("fieldErrors", fields);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegal(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String msg) {
        return ResponseEntity.status(status).body(base(status, msg));
    }

    private Map<String, Object> base(HttpStatus status, String msg) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", msg);
        return body;
    }
}
```

### Users Controller

```file:backend/src/main/java/com/taskflowlite/user/UserController.java
package com.taskflowlite.user;

import com.taskflowlite.user.dto.UpdateProfileRequest;
import com.taskflowlite.user.dto.UpdateRoleRequest;
import com.taskflowlite.user.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal UserDetails principal) {
        return userService.getByEmail(principal.getUsername());
    }

    @PatchMapping("/me")
    public UserResponse updateMe(@AuthenticationPrincipal UserDetails principal,
                                 @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(principal.getUsername(), request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public Page<UserResponse> list(Pageable pageable) {
        return userService.list(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public UserResponse getById(@PathVariable Long id) {
        return userService.getById(id);
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse updateRole(@PathVariable Long id, @Valid @RequestBody UpdateRoleRequest request) {
        return userService.updateRole(id, request);
    }
}
```

### Security Configuration – Enable method security

```file:backend/src/main/java/com/taskflowlite/security/SecurityConfig.java
package com.taskflowlite.security;

import com.taskflowlite.security.jwt.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService userDetailsService;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          UserDetailsService userDetailsService) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (req, res, ex) -> {
            res.setStatus(HttpStatus.FORBIDDEN.value());
            res.setContentType("application/json");
            res.getWriter().write("{\"status\":403,\"error\":\"Forbidden\",\"message\":\"Access denied\"}");
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOriginPatterns(List.of("*"));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(c -> c.disable())
                .cors(c -> c.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/api/health", "/actuator/health").permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                        .accessDeniedHandler(accessDeniedHandler())
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

### Ensure UserDetailsService maps Role -> ROLE_* authority

```file:backend/src/main/java/com/taskflowlite/security/AppUserDetailsService.java
package com.taskflowlite.security;

import com.taskflowlite.user.User;
import com.taskflowlite.user.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public AppUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPasswordHash(),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
```

## Database Work

No schema changes required — `role` column already exists from `database-and-entities` phase. Ensure default role is `MEMBER` on registration (handled in auth phase).

## Tests Required

```file:backend/src/test/java/com/taskflowlite/user/UserControllerTest.java
package com.taskflowlite.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflowlite.user.dto.UpdateProfileRequest;
import com.taskflowlite.user.dto.UpdateRoleRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.beans.factory.annotation.Qualifier;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class UserControllerTest {

    @Autowired WebApplicationContext context;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        seed("admin@x.com", "admin", Role.ADMIN);
        seed("member@x.com", "member", Role.MEMBER);
    }

    private User seed(String email, String username, Role role) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User();
            u.setEmail(email);
            u.setUsername(username);
            u.setPasswordHash(passwordEncoder.encode("Password1!"));
            u.setRole(role);
            return userRepository.save(u);
        });
    }

    @Test
    void meRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "member@x.com", roles = "MEMBER")
    void meReturnsProfile() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("member@x.com"))
                .andExpect(jsonPath("$.role").value("MEMBER"));
    }

    @Test
    @WithMockUser(username = "member@x.com", roles = "MEMBER")
    void memberCannotListUsers() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@x.com", roles = "ADMIN")
    void adminCanListUsers() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "member@x.com", roles = "MEMBER")
    void memberCannotChangeRole() throws Exception {
        Long id = userRepository.findByEmail("member@x.com").orElseThrow().getId();
        mockMvc.perform(patch("/api/users/" + id + "/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateRoleRequest(Role.ADMIN))))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@x.com", roles = "ADMIN")
    void adminCanChangeRole() throws Exception {
        Long id = userRepository.findByEmail("member@x.com").orElseThrow().getId();
        mockMvc.perform(patch("/api/users/" + id + "/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateRoleRequest(Role.MANAGER))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("MANAGER"));
    }

    @Test
    @WithMockUser(username = "member@x.com", roles = "MEMBER")
    void memberCanUpdateOwnProfile() throws Exception {
        mockMvc.perform(patch("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateProfileRequest("newname", null))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("newname"));
    }
}
```

## Frontend Work

This phase is backend-focused; the frontend profile screen will be implemented in `frontend-teams-dashboard`. No frontend changes here.

## Validation Gates

| Gate | Check |
|---|---|
| execution | All artifacts written |
| buildConvergence | `mvn -q -DskipTests package` compiles cleanly |
| testConvergence | `mvn test` passes including new RBAC tests |
| securityCompliance | Method-level `@PreAuthorize` enforced, 401 on missing token, 403 on insufficient role |
| contractDrift | `/api/users/me`, `PATCH /api/users/me`, `GET /api/users`, `PATCH /api/users/{id}/role` match plan |
| runtimeConvergence | `/api/users/me` returns profile when authenticated |

## Phase Completion Summary

- **Roles enforced:** `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_MEMBER` mapped from `User.role` via `AppUserDetailsService`.
- **Method security enabled** via `@EnableMethodSecurity` and `@PreAuthorize` annotations on `UserController`.
- **Endpoints delivered:**
  - `GET /api/users/me` — authenticated profile retrieval
  - `PATCH /api/users/me` — self-service profile update with uniqueness checks
  - `GET /api/users` — ADMIN/MANAGER list
  - `GET /api/users/{id}` — ADMIN/MANAGER detail
  - `PATCH /api/users/{id}/role` — ADMIN-only role change
- **Error handling:** `GlobalExceptionHandler` returns 401/403/404/409/400 with structured JSON.
- **Tests:** Six controller tests cover auth required, RBAC denial, RBAC allow, profile update.
- Ready to proceed to `team-management`.