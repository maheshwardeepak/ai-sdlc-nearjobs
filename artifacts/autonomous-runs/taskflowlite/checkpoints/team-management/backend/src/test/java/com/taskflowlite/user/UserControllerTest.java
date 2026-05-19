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
