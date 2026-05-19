package com.taskflowlite.task;

import com.fasterxml.jackson.databind.JsonNode;
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
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import jakarta.annotation.PostConstruct;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
public class TaskAssignmentTest {

    @Autowired private WebApplicationContext ctx;
    @Autowired private ObjectMapper mapper;
    private MockMvc mvc;

    @PostConstruct
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(ctx)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    private String register(String email, String username) throws Exception {
        String body = mapper.createObjectNode()
                .put("email", email)
                .put("username", username)
                .put("password", "Password123!")
                .toString();
        MvcResult res = mvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is2xxSuccessful()).andReturn();
        JsonNode json = mapper.readTree(res.getResponse().getContentAsString());
        return json.has("token") ? json.get("token").asText()
                : json.get("accessToken").asText();
    }

    private long createTeam(String token, String name) throws Exception {
        String body = mapper.createObjectNode().put("name", name).toString();
        MvcResult res = mvc.perform(post("/api/teams")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is2xxSuccessful()).andReturn();
        return mapper.readTree(res.getResponse().getContentAsString()).get("id").asLong();
    }

    private long userIdFromMe(String token) throws Exception {
        MvcResult res = mvc.perform(get("/api/users/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        return mapper.readTree(res.getResponse().getContentAsString()).get("id").asLong();
    }

    private void addMember(String token, long teamId, long userId) throws Exception {
        String body = mapper.createObjectNode().put("userId", userId).toString();
        mvc.perform(post("/api/teams/" + teamId + "/members")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is2xxSuccessful());
    }

    private long createTask(String token, long teamId, String title) throws Exception {
        String body = mapper.createObjectNode()
                .put("title", title)
                .put("teamId", teamId)
                .toString();
        MvcResult res = mvc.perform(post("/api/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is2xxSuccessful()).andReturn();
        return mapper.readTree(res.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    void assignReassignUnassignAndWorkload() throws Exception {
        String ownerTok = register("owner_a@test.io", "owner_a");
        String memberTok = register("member_a@test.io", "member_a");
        long memberId = userIdFromMe(memberTok);

        long teamId = createTeam(ownerTok, "Alpha");
        addMember(ownerTok, teamId, memberId);

        long taskId = createTask(ownerTok, teamId, "Implement feature X");

        // assign
        String assignBody = mapper.createObjectNode().put("assigneeId", memberId).toString();
        MvcResult assigned = mvc.perform(patch("/api/tasks/" + taskId + "/assignee")
                .header("Authorization", "Bearer " + ownerTok)
                .contentType(MediaType.APPLICATION_JSON).content(assignBody))
                .andExpect(status().isOk()).andReturn();
        assertThat(mapper.readTree(assigned.getResponse().getContentAsString())
                .get("assigneeId").asLong()).isEqualTo(memberId);

        // filter by assignee
        mvc.perform(get("/api/tasks").param("assigneeId", String.valueOf(memberId))
                .header("Authorization", "Bearer " + ownerTok))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].assigneeId").value((int) memberId));

        // unassign
        String unassignBody = "{}";
        mvc.perform(patch("/api/tasks/" + taskId + "/assignee")
                .header("Authorization", "Bearer " + ownerTok)
                .contentType(MediaType.APPLICATION_JSON).content(unassignBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assigneeId").doesNotExist());

        // unassigned filter
        mvc.perform(get("/api/tasks").param("unassigned", "true")
                .header("Authorization", "Bearer " + ownerTok))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value((int) taskId));

        // assigning non-member should fail
        String outsiderTok = register("outsider_a@test.io", "outsider_a");
        long outsiderId = userIdFromMe(outsiderTok);
        String badBody = mapper.createObjectNode().put("assigneeId", outsiderId).toString();
        mvc.perform(patch("/api/tasks/" + taskId + "/assignee")
                .header("Authorization", "Bearer " + ownerTok)
                .contentType(MediaType.APPLICATION_JSON).content(badBody))
                .andExpect(status().is4xxClientError());

        // reassign back to member, test workload
        mvc.perform(patch("/api/tasks/" + taskId + "/assignee")
                .header("Authorization", "Bearer " + ownerTok)
                .contentType(MediaType.APPLICATION_JSON).content(assignBody))
                .andExpect(status().isOk());

        MvcResult wl = mvc.perform(get("/api/teams/" + teamId + "/workload")
                .header("Authorization", "Bearer " + ownerTok))
                .andExpect(status().isOk()).andReturn();
        JsonNode wlJson = mapper.readTree(wl.getResponse().getContentAsString());
        assertThat(wlJson.get("teamId").asLong()).isEqualTo(teamId);
        assertThat(wlJson.get("members").isArray()).isTrue();

        // outsider cannot view workload
        mvc.perform(get("/api/teams/" + teamId + "/workload")
                .header("Authorization", "Bearer " + outsiderTok))
                .andExpect(status().is4xxClientError());
    }
}