package com.taskflowlite.team;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TeamControllerIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void unauthenticatedAccessIsRejected() throws Exception {
        mockMvc.perform(get("/api/teams"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void fullTeamLifecycle() throws Exception {
        String token = registerAndLogin("teamowner_" + System.nanoTime(),
                "teamowner_" + System.nanoTime() + "@example.com");

        // Create team
        String createBody = objectMapper.writeValueAsString(
                Map.of("name", "QA Team", "description", "Quality"));
        MvcResult createRes = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("QA Team"))
                .andExpect(jsonPath("$.memberCount").value(1))
                .andReturn();

        String teamId = objectMapper.readTree(createRes.getResponse().getContentAsString())
                .get("id").asText();

        // List teams
        mockMvc.perform(get("/api/teams")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // Get team detail
        mockMvc.perform(get("/api/teams/" + teamId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(teamId));

        // List members
        mockMvc.perform(get("/api/teams/" + teamId + "/members")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    private String registerAndLogin(String username, String email) throws Exception {
        String regBody = objectMapper.writeValueAsString(Map.of(
                "username", username,
                "email", email,
                "password", "Password123!"
        ));
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regBody))
                .andExpect(status().is2xxSuccessful());

        String loginBody = objectMapper.writeValueAsString(Map.of(
                "email", email,
                "password", "Password123!"
        ));
        MvcResult loginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode node = objectMapper.readTree(loginRes.getResponse().getContentAsString());
        return node.has("token") ? node.get("token").asText() : node.get("accessToken").asText();
    }
}
