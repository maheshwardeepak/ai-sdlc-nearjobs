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
