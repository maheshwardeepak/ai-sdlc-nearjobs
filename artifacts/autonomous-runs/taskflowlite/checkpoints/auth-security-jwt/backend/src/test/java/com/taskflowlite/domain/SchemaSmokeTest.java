package com.taskflowlite.domain;

import com.taskflowlite.domain.entity.User;
import com.taskflowlite.domain.model.Role;
import com.taskflowlite.domain.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class SchemaSmokeTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void userCrudWorks() {
        User u = new User();
        u.setEmail("smoke+" + System.nanoTime() + "@example.com");
        u.setUsername("smoke_" + System.nanoTime());
        u.setPasswordHash("$2a$10$abcdefghijklmnopqrstuv");
        u.setRole(Role.MEMBER);
        User saved = userRepository.save(u);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(userRepository.findById(saved.getId())).isPresent();
    }
}
