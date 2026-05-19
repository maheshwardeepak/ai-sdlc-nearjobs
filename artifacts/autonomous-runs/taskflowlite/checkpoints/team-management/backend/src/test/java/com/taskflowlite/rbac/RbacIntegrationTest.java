package com.taskflowlite.rbac;

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
class RbacIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String registerAndLogin(String email) throws Exception {
        String body = "{\"email\":\"" + email + "\",\"username\":\"" + email.split("@")[0] + "\",\"password\":\"Password123!\"}";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body));
        String login = "{\"email\":\"" + email + "\",\"password\":\"Password123!\"}";
        String resp = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(login))
            .andReturn().getResponse().getContentAsString();
        JsonNode node = om.readTree(resp);
        return node.get("token").asText();
    }

    @Test
    void memberCannotChangeOtherUserRole() throws Exception {
        String token = registerAndLogin("member1@example.com");
        mvc.perform(patch("/api/users/999/role")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"ADMIN\"}"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    void authenticatedUserCanGetOwnProfile() throws Exception {
        String token = registerAndLogin("profile@example.com");
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }
}
