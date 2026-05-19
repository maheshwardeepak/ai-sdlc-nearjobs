package com.taskflowlite.tasks;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TaskCommentsAuditIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String token() throws Exception {
        String body = "{\"email\":\"tasker@example.com\",\"username\":\"tasker\",\"password\":\"Password123!\"}";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body));
        String login = "{\"email\":\"tasker@example.com\",\"password\":\"Password123!\"}";
        String resp = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(login))
            .andReturn().getResponse().getContentAsString();
        return om.readTree(resp).get("token").asText();
    }

    @Test
    void createTaskRequiresAuth() throws Exception {
        mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"x\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedCanListTasks() throws Exception {
        String t = token();
        mvc.perform(get("/api/tasks").header("Authorization", "Bearer " + t))
            .andExpect(status().isOk());
    }

    @Test
    void dashboardEndpointAccessibleAuthenticated() throws Exception {
        String t = token();
        mvc.perform(get("/api/dashboard").header("Authorization", "Bearer " + t))
            .andExpect(status().is2xxSuccessful());
    }
}