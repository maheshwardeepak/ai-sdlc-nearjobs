package com.taskflowlite.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.security.web.FilterChainProxy;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired FilterChainProxy springSecurityFilterChain;
    @Autowired ObjectMapper objectMapper;

    MockMvc mvc() {
        return MockMvcBuilders.webAppContextSetup(context)
                .addFilters(springSecurityFilterChain)
                .build();
    }

    @Test
    void registerThenLoginThenAccessProtectedRoute() throws Exception {
        MockMvc mvc = mvc();

        String registerBody = objectMapper.writeValueAsString(Map.of(
                "email", "alice@example.com",
                "username", "alice",
                "password", "Password123!"));

        MvcResult reg = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("alice@example.com"))
                .andExpect(jsonPath("$.user.role").value("MEMBER"))
                .andReturn();

        String token = objectMapper.readTree(reg.getResponse().getContentAsString()).get("token").asText();

        // Login
        String loginBody = objectMapper.writeValueAsString(Map.of(
                "email", "alice@example.com",
                "password", "Password123!"));
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        // Health is public
        mvc.perform(get("/api/health")).andExpect(status().isOk());

        // Unknown protected path returns 401 without token
        mvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());

        // With token, returns 404 (route not yet implemented) or 200 if implemented — must NOT be 401/403
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status == 401 || status == 403) {
                        throw new AssertionError("Authenticated request should not be 401/403, was " + status);
                    }
                });
    }

    @Test
    void duplicateRegistrationFails() throws Exception {
        MockMvc mvc = mvc();
        String body = objectMapper.writeValueAsString(Map.of(
                "email", "dup@example.com",
                "username", "dupuser",
                "password", "Password123!"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithWrongPasswordFails() throws Exception {
        MockMvc mvc = mvc();
        String reg = objectMapper.writeValueAsString(Map.of(
                "email", "bob@example.com",
                "username", "bob",
                "password", "CorrectPass1!"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(reg))
                .andExpect(status().isOk());

        String login = objectMapper.writeValueAsString(Map.of(
                "email", "bob@example.com",
                "password", "WrongPass!"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(login))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registrationValidationFails() throws Exception {
        MockMvc mvc = mvc();
        String body = objectMapper.writeValueAsString(Map.of(
                "email", "not-an-email",
                "username", "x",
                "password", "short"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invalidJwtIsRejected() throws Exception {
        MockMvc mvc = mvc();
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer not.a.real.token"))
                .andExpect(status().isUnauthorized());
    }
}