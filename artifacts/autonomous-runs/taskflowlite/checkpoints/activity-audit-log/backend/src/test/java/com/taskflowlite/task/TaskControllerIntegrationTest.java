package com.taskflowlite.task;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflowlite.team.domain.Team;
import com.taskflowlite.team.domain.TeamMember;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.task.domain.TaskPriority;
import com.taskflowlite.task.domain.TaskStatus;
import com.taskflowlite.task.dto.CreateTaskRequest;
import com.taskflowlite.task.dto.UpdateTaskRequest;
import com.taskflowlite.task.dto.UpdateTaskStatusRequest;
import com.taskflowlite.user.domain.User;
import com.taskflowlite.user.domain.UserRole;
import com.taskflowlite.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TaskControllerIntegrationTest {

    @Autowired private WebApplicationContext wac;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private TeamRepository teamRepository;
    @Autowired private TeamMemberRepository teamMemberRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;
    private User member;
    private Team team;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();

        member = new User();
        member.setEmail("member@test.com");
        member.setUsername("member");
        member.setPasswordHash(passwordEncoder.encode("password"));
        member.setRole(UserRole.MEMBER);
        member = userRepository.save(member);

        team = new Team();
        team.setName("Engineering");
        team.setDescription("Eng team");
        team.setOwner(member);
        team = teamRepository.save(team);

        TeamMember tm = new TeamMember();
        tm.setTeam(team);
        tm.setUser(member);
        tm.setRoleInTeam("OWNER");
        teamMemberRepository.save(tm);
    }

    @Test
    @WithMockUser(username = "member@test.com")
    void createTask_returns201() throws Exception {
        CreateTaskRequest req = new CreateTaskRequest();
        req.setTitle("Write docs");
        req.setDescription("Document task API");
        req.setPriority(TaskPriority.HIGH);
        req.setDueDate(LocalDate.now().plusDays(3));
        req.setTeamId(team.getId());

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.title").value("Write docs"));
    }

    @Test
    @WithMockUser(username = "member@test.com")
    void updateStatus_changesStatus() throws Exception {
        CreateTaskRequest req = new CreateTaskRequest();
        req.setTitle("Build feature");
        req.setPriority(TaskPriority.MEDIUM);
        req.setTeamId(team.getId());

        String body = mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(body).get("id").asLong();

        UpdateTaskStatusRequest s = new UpdateTaskStatusRequest();
        s.setStatus(TaskStatus.IN_PROGRESS);
        mockMvc.perform(patch("/api/tasks/" + id + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    @WithMockUser(username = "member@test.com")
    void updateTask_updatesFields() throws Exception {
        CreateTaskRequest req = new CreateTaskRequest();
        req.setTitle("Old title");
        req.setPriority(TaskPriority.LOW);
        req.setTeamId(team.getId());

        String body = mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(body).get("id").asLong();

        UpdateTaskRequest update = new UpdateTaskRequest();
        update.setTitle("New title");
        update.setPriority(TaskPriority.URGENT);

        mockMvc.perform(put("/api/tasks/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New title"))
                .andExpect(jsonPath("$.priority").value("URGENT"));
    }

    @Test
    @WithMockUser(username = "member@test.com")
    void deleteTask_returns204() throws Exception {
        CreateTaskRequest req = new CreateTaskRequest();
        req.setTitle("Temp");
        req.setPriority(TaskPriority.LOW);
        req.setTeamId(team.getId());

        String body = mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(body).get("id").asLong();

        mockMvc.perform(delete("/api/tasks/" + id))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/tasks/" + id))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticatedRequest_returns401() throws Exception {
        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isUnauthorized());
    }
}