package com.taskflowlite.auth;

import com.taskflowlite.auth.dto.AuthResponse;
import com.taskflowlite.auth.dto.LoginRequest;
import com.taskflowlite.auth.dto.RegisterRequest;
import com.taskflowlite.security.JwtService;
import com.taskflowlite.user.Role;
import com.taskflowlite.user.User;
import com.taskflowlite.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        String username = req.username().trim();

        if (userRepository.existsByEmail(email)) {
            throw new AuthException("Email already registered");
        }
        if (userRepository.existsByUsername(username)) {
            throw new AuthException("Username already taken");
        }

        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRole(Role.MEMBER);
        user = userRepository.save(user);

        return buildResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthException("Invalid email or password"));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new AuthException("Invalid email or password");
        }
        return buildResponse(user);
    }

    private AuthResponse buildResponse(User user) {
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(
                token,
                "Bearer",
                jwtService.getExpirationMs(),
                new AuthResponse.UserSummary(user.getId(), user.getEmail(), user.getUsername(), user.getRole().name())
        );
    }
}