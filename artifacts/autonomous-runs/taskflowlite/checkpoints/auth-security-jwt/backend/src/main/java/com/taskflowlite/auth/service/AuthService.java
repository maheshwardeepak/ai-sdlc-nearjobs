package com.taskflowlite.auth.service;

import com.taskflowlite.auth.dto.AuthResponse;
import com.taskflowlite.auth.dto.LoginRequest;
import com.taskflowlite.auth.dto.RegisterRequest;
import com.taskflowlite.auth.security.JwtService;
import com.taskflowlite.domain.entity.User;
import com.taskflowlite.domain.model.Role;
import com.taskflowlite.domain.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalStateException("Email already registered");
        }
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new IllegalStateException("Username already taken");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.MEMBER);
        OffsetDateTime now = OffsetDateTime.now();
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        user = userRepository.save(user);

        String token = jwtService.generateToken(user.getId().toString(), user.getRole().name());
        long expiresIn = jwtService.getExpirationSeconds();
        return new AuthResponse(token, expiresIn, user.getEmail(), user.getUsername(), user.getRole().name());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = jwtService.generateToken(user.getId().toString(), user.getRole().name());
        long expiresIn = jwtService.getExpirationSeconds();
        return new AuthResponse(token, expiresIn, user.getEmail(), user.getUsername(), user.getRole().name());
    }
}
