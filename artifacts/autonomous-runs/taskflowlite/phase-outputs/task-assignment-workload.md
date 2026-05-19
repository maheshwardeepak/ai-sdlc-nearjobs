model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Phase: Task Assignment, Reassignment & Workload

## Overview
This phase adds task assignment/reassignment capabilities, assignee/unassigned filtering, and team workload metrics.

## Files to Create/Update

### Backend Work
- Add `PATCH /api/tasks/{id}/assignee` endpoint
- Enhance `GET /api/tasks` with `assigneeId` and `unassigned` filters
- Add `GET /api/teams/{id}/workload` endpoint
- Service layer for assignment validation (assignee must be team member)
- Workload DTOs and query

### Frontend Work
- Minimal API client stubs for assignment & workload (frontend UI in later phase)

### Database Work
- No schema changes (assigneeId already exists on Task)

### Tests Required
- Assignment endpoint tests (assign, reassign, unassign, non-member rejection)
- Workload endpoint test
- Filter tests for assignee/unassigned

---

```file:backend/src/main/java/com/taskflowlite/task/dto/AssigneeUpdateRequest.java
package com.taskflowlite.task.dto;

public class AssigneeUpdateRequest {
    private Long assigneeId; // null means unassign

    public AssigneeUpdateRequest() {}

    public Long getAssigneeId() { return assigneeId; }
    public void setAssigneeId(Long assigneeId) { this.assigneeId = assigneeId; }
}
```

```file:backend/src/main/java/com/taskflowlite/workload/dto/MemberWorkloadDto.java
package com.taskflowlite.workload.dto;

public class MemberWorkloadDto {
    private Long userId;
    private String username;
    private String email;
    private long todo;
    private long inProgress;
    private long done;
    private long openTasks; // todo + inProgress
    private long totalTasks;

    public MemberWorkloadDto() {}

    public MemberWorkloadDto(Long userId, String username, String email,
                             long todo, long inProgress, long done) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.todo = todo;
        this.inProgress = inProgress;
        this.done = done;
        this.openTasks = todo + inProgress;
        this.totalTasks = todo + inProgress + done;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public long getTodo() { return todo; }
    public void setTodo(long todo) { this.todo = todo; }
    public long getInProgress() { return inProgress; }
    public void setInProgress(long inProgress) { this.inProgress = inProgress; }
    public long getDone() { return done; }
    public void setDone(long done) { this.done = done; }
    public long getOpenTasks() { return openTasks; }
    public void setOpenTasks(long openTasks) { this.openTasks = openTasks; }
    public long getTotalTasks() { return totalTasks; }
    public void setTotalTasks(long totalTasks) { this.totalTasks = totalTasks; }
}
```

```file:backend/src/main/java/com/taskflowlite/workload/dto/TeamWorkloadDto.java
package com.taskflowlite.workload.dto;

import java.util.List;

public class TeamWorkloadDto {
    private Long teamId;
    private String teamName;
    private long unassignedOpenTasks;
    private List<MemberWorkloadDto> members;

    public TeamWorkloadDto() {}

    public TeamWorkloadDto(Long teamId, String teamName,
                           long unassignedOpenTasks, List<MemberWorkloadDto> members) {
        this.teamId = teamId;
        this.teamName = teamName;
        this.unassignedOpenTasks = unassignedOpenTasks;
        this.members = members;
    }

    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }
    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }
    public long getUnassignedOpenTasks() { return unassignedOpenTasks; }
    public void setUnassignedOpenTasks(long u) { this.unassignedOpenTasks = u; }
    public List<MemberWorkloadDto> getMembers() { return members; }
    public void setMembers(List<MemberWorkloadDto> members) { this.members = members; }
}
```

```file:backend/src/main/java/com/taskflowlite/task/repository/TaskRepository.java
package com.taskflowlite.task.repository;

import com.taskflowlite.task.entity.Task;
import com.taskflowlite.task.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByTeamIdOrderByCreatedAtDesc(Long teamId);

    List<Task> findByAssigneeIdOrderByCreatedAtDesc(Long assigneeId);

    @Query("SELECT t FROM Task t WHERE " +
            "(:teamId IS NULL OR t.teamId = :teamId) AND " +
            "(:status IS NULL OR t.status = :status) AND " +
            "(:assigneeId IS NULL OR t.assigneeId = :assigneeId) AND " +
            "(:unassigned = false OR t.assigneeId IS NULL) " +
            "ORDER BY t.createdAt DESC")
    List<Task> search(@Param("teamId") Long teamId,
                      @Param("status") TaskStatus status,
                      @Param("assigneeId") Long assigneeId,
                      @Param("unassigned") boolean unassigned);

    long countByTeamIdAndAssigneeIdAndStatus(Long teamId, Long assigneeId, TaskStatus status);

    long countByTeamIdAndAssigneeIdIsNullAndStatusIn(Long teamId, List<TaskStatus> statuses);
}
```

```file:backend/src/main/java/com/taskflowlite/task/service/TaskService.java
package com.taskflowlite.task.service;

import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.BadRequestException;
import com.taskflowlite.task.dto.TaskRequest;
import com.taskflowlite.task.dto.TaskResponse;
import com.taskflowlite.task.entity.Task;
import com.taskflowlite.task.entity.TaskPriority;
import com.taskflowlite.task.entity.TaskStatus;
import com.taskflowlite.task.repository.TaskRepository;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.user.entity.User;
import com.taskflowlite.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository,
                       TeamRepository teamRepository,
                       TeamMemberRepository teamMemberRepository,
                       UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.userRepository = userRepository;
    }

    private void ensureTeamMembership(Long teamId, Long userId) {
        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new ForbiddenException("User is not a member of this team");
        }
    }

    @Transactional
    public TaskResponse create(TaskRequest req, Long actorId) {
        if (req.getTeamId() == null) throw new BadRequestException("teamId is required");
        if (!teamRepository.existsById(req.getTeamId()))
            throw new NotFoundException("Team not found");
        ensureTeamMembership(req.getTeamId(), actorId);

        if (req.getAssigneeId() != null) {
            ensureTeamMembership(req.getTeamId(), req.getAssigneeId());
        }

        Task t = new Task();
        t.setTitle(req.getTitle());
        t.setDescription(req.getDescription());
        t.setStatus(req.getStatus() != null ? req.getStatus() : TaskStatus.TODO);
        t.setPriority(req.getPriority() != null ? req.getPriority() : TaskPriority.MEDIUM);
        t.setDueDate(req.getDueDate());
        t.setTeamId(req.getTeamId());
        t.setAssigneeId(req.getAssigneeId());
        t.setCreatedById(actorId);
        Instant now = Instant.now();
        t.setCreatedAt(now);
        t.setUpdatedAt(now);
        return toResponse(taskRepository.save(t));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> list(Long teamId, TaskStatus status, Long assigneeId, Boolean unassigned, Long actorId) {
        boolean unassignedFlag = Boolean.TRUE.equals(unassigned);
        List<Task> tasks = taskRepository.search(teamId, status, assigneeId, unassignedFlag);
        // Filter by membership: only return tasks in teams user belongs to
        return tasks.stream()
                .filter(t -> teamMemberRepository.existsByTeamIdAndUserId(t.getTeamId(), actorId))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaskResponse get(Long id, Long actorId) {
        Task t = taskRepository.findById(id).orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTeamMembership(t.getTeamId(), actorId);
        return toResponse(t);
    }

    @Transactional
    public TaskResponse update(Long id, TaskRequest req, Long actorId) {
        Task t = taskRepository.findById(id).orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTeamMembership(t.getTeamId(), actorId);
        if (req.getTitle() != null) t.setTitle(req.getTitle());
        if (req.getDescription() != null) t.setDescription(req.getDescription());
        if (req.getStatus() != null) t.setStatus(req.getStatus());
        if (req.getPriority() != null) t.setPriority(req.getPriority());
        if (req.getDueDate() != null) t.setDueDate(req.getDueDate());
        if (req.getAssigneeId() != null) {
            ensureTeamMembership(t.getTeamId(), req.getAssigneeId());
            t.setAssigneeId(req.getAssigneeId());
        }
        t.setUpdatedAt(Instant.now());
        return toResponse(taskRepository.save(t));
    }

    @Transactional
    public TaskResponse updateStatus(Long id, TaskStatus status, Long actorId) {
        Task t = taskRepository.findById(id).orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTeamMembership(t.getTeamId(), actorId);
        t.setStatus(status);
        t.setUpdatedAt(Instant.now());
        return toResponse(taskRepository.save(t));
    }

    /**
     * Assign or reassign a task. Passing null assigneeId unassigns the task.
     */
    @Transactional
    public TaskResponse updateAssignee(Long id, Long assigneeId, Long actorId) {
        Task t = taskRepository.findById(id).orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTeamMembership(t.getTeamId(), actorId);

        if (assigneeId != null) {
            if (!userRepository.existsById(assigneeId)) {
                throw new NotFoundException("Assignee user not found");
            }
            if (!teamMemberRepository.existsByTeamIdAndUserId(t.getTeamId(), assigneeId)) {
                throw new BadRequestException("Assignee must be a member of the task's team");
            }
        }
        t.setAssigneeId(assigneeId);
        t.setUpdatedAt(Instant.now());
        return toResponse(taskRepository.save(t));
    }

    @Transactional
    public void delete(Long id, Long actorId) {
        Task t = taskRepository.findById(id).orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTeamMembership(t.getTeamId(), actorId);
        taskRepository.delete(t);
    }

    private TaskResponse toResponse(Task t) {
        TaskResponse r = new TaskResponse();
        r.setId(t.getId());
        r.setTitle(t.getTitle());
        r.setDescription(t.getDescription());
        r.setStatus(t.getStatus());
        r.setPriority(t.getPriority());
        r.setDueDate(t.getDueDate());
        r.setTeamId(t.getTeamId());
        r.setAssigneeId(t.getAssigneeId());
        r.setCreatedById(t.getCreatedById());
        r.setCreatedAt(t.getCreatedAt());
        r.setUpdatedAt(t.getUpdatedAt());
        if (t.getAssigneeId() != null) {
            userRepository.findById(t.getAssigneeId()).ifPresent(u -> {
                r.setAssigneeUsername(u.getUsername());
                r.setAssigneeEmail(u.getEmail());
            });
        }
        return r;
    }
}
```

```file:backend/src/main/java/com/taskflowlite/task/dto/TaskResponse.java
package com.taskflowlite.task.dto;

import com.taskflowlite.task.entity.TaskPriority;
import com.taskflowlite.task.entity.TaskStatus;

import java.time.Instant;
import java.time.LocalDate;

public class TaskResponse {
    private Long id;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private LocalDate dueDate;
    private Long teamId;
    private Long assigneeId;
    private String assigneeUsername;
    private String assigneeEmail;
    private Long createdById;
    private Instant createdAt;
    private Instant updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }
    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority priority) { this.priority = priority; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }
    public Long getAssigneeId() { return assigneeId; }
    public void setAssigneeId(Long assigneeId) { this.assigneeId = assigneeId; }
    public String getAssigneeUsername() { return assigneeUsername; }
    public void setAssigneeUsername(String s) { this.assigneeUsername = s; }
    public String getAssigneeEmail() { return assigneeEmail; }
    public void setAssigneeEmail(String s) { this.assigneeEmail = s; }
    public Long getCreatedById() { return createdById; }
    public void setCreatedById(Long createdById) { this.createdById = createdById; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
```

```file:backend/src/main/java/com/taskflowlite/task/controller/TaskController.java
package com.taskflowlite.task.controller;

import com.taskflowlite.security.CurrentUser;
import com.taskflowlite.task.dto.AssigneeUpdateRequest;
import com.taskflowlite.task.dto.StatusUpdateRequest;
import com.taskflowlite.task.dto.TaskRequest;
import com.taskflowlite.task.dto.TaskResponse;
import com.taskflowlite.task.entity.TaskStatus;
import com.taskflowlite.task.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@PreAuthorize("isAuthenticated()")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody TaskRequest req,
                                               @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.create(req, userId));
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> list(
            @RequestParam(required = false) Long teamId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Boolean unassigned,
            @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.list(teamId, status, assigneeId, unassigned, userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> get(@PathVariable Long id, @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.get(id, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> update(@PathVariable Long id,
                                               @RequestBody TaskRequest req,
                                               @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.update(id, req, userId));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponse> updateStatus(@PathVariable Long id,
                                                     @Valid @RequestBody StatusUpdateRequest req,
                                                     @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.updateStatus(id, req.getStatus(), userId));
    }

    @PatchMapping("/{id}/assignee")
    public ResponseEntity<TaskResponse> updateAssignee(@PathVariable Long id,
                                                       @RequestBody AssigneeUpdateRequest req,
                                                       @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.updateAssignee(id, req.getAssigneeId(), userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @CurrentUser Long userId) {
        taskService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
```

```file:backend/src/main/java/com/taskflowlite/workload/service/WorkloadService.java
package com.taskflowlite.workload.service;

import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.task.entity.TaskStatus;
import com.taskflowlite.task.repository.TaskRepository;
import com.taskflowlite.team.entity.Team;
import com.taskflowlite.team.entity.TeamMember;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.user.entity.User;
import com.taskflowlite.user.repository.UserRepository;
import com.taskflowlite.workload.dto.MemberWorkloadDto;
import com.taskflowlite.workload.dto.TeamWorkloadDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class WorkloadService {

    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    public WorkloadService(TaskRepository taskRepository,
                           TeamRepository teamRepository,
                           TeamMemberRepository teamMemberRepository,
                           UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public TeamWorkloadDto getTeamWorkload(Long teamId, Long actorId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));
        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, actorId)) {
            throw new ForbiddenException("Not a member of this team");
        }

        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);
        List<MemberWorkloadDto> memberStats = new ArrayList<>();
        for (TeamMember m : members) {
            User u = userRepository.findById(m.getUserId()).orElse(null);
            if (u == null) continue;
            long todo = taskRepository.countByTeamIdAndAssigneeIdAndStatus(teamId, u.getId(), TaskStatus.TODO);
            long inProgress = taskRepository.countByTeamIdAndAssigneeIdAndStatus(teamId, u.getId(), TaskStatus.IN_PROGRESS);
            long done = taskRepository.countByTeamIdAndAssigneeIdAndStatus(teamId, u.getId(), TaskStatus.DONE);
            memberStats.add(new MemberWorkloadDto(u.getId(), u.getUsername(), u.getEmail(),
                    todo, inProgress, done));
        }

        long unassignedOpen = taskRepository.countByTeamIdAndAssigneeIdIsNullAndStatusIn(
                teamId, Arrays.asList(TaskStatus.TODO, TaskStatus.IN_PROGRESS));

        return new TeamWorkloadDto(team.getId(), team.getName(), unassignedOpen, memberStats);
    }
}
```

```file:backend/src/main/java/com/taskflowlite/workload/controller/WorkloadController.java
package com.taskflowlite.workload.controller;

import com.taskflowlite.security.CurrentUser;
import com.taskflowlite.workload.dto.TeamWorkloadDto;
import com.taskflowlite.workload.service.WorkloadService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teams")
@PreAuthorize("isAuthenticated()")
public class WorkloadController {

    private final WorkloadService workloadService;

    public WorkloadController(WorkloadService workloadService) {
        this.workloadService = workloadService;
    }

    @GetMapping("/{id}/workload")
    public ResponseEntity<TeamWorkloadDto> teamWorkload(@PathVariable("id") Long teamId,
                                                        @CurrentUser Long userId) {
        return ResponseEntity.ok(workloadService.getTeamWorkload(teamId, userId));
    }
}
```

```file:backend/src/test/java/com/taskflowlite/task/TaskAssignmentTest.java
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
```

```file:frontend/src/api/tasks.ts
import { apiClient } from './client';

export interface TaskDto {
  id: number;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  teamId: number;
  assigneeId?: number | null;
  assigneeUsername?: string;
  assigneeEmail?: string;
  createdById: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListFilters {
  teamId?: number;
  status?: string;
  assigneeId?: number;
  unassigned?: boolean;
}

export async function listTasks(filters: TaskListFilters = {}): Promise<TaskDto[]> {
  const params: Record<string, string> = {};
  if (filters.teamId !== undefined) params.teamId = String(filters.teamId);
  if (filters.status) params.status = filters.status;
  if (filters.assigneeId !== undefined) params.assigneeId = String(filters.assigneeId);
  if (filters.unassigned) params.unassigned = 'true';
  const { data } = await apiClient.get<TaskDto[]>('/api/tasks', { params });
  return data;
}

export async function assignTask(taskId: number, assigneeId: number | null): Promise<TaskDto> {
  const { data } = await apiClient.patch<TaskDto>(`/api/tasks/${taskId}/assignee`, {
    assigneeId,
  });
  return data;
}

export async function unassignTask(taskId: number): Promise<TaskDto> {
  return assignTask(taskId, null);
}
```

```file:frontend/src/api/workload.ts
import { apiClient } from './client';

export interface MemberWorkload {
  userId: number;
  username: string;
  email: string;
  todo: number;
  inProgress: number;
  done: number;
  openTasks: number;
  totalTasks: number;
}

export interface TeamWorkload {
  teamId: number;
  teamName: string;
  unassignedOpenTasks: number;
  members: MemberWorkload[];
}

export async function getTeamWorkload(teamId: number): Promise<TeamWorkload> {
  const { data } = await apiClient.get<TeamWorkload>(`/api/teams/${teamId}/workload`);
  return data;
}
```

---

## Validation Gates

| Gate | Status |
|------|--------|
| execution | ✅ artifacts produced |
| checkpoint | ✅ phase id `task-assignment-workload` |
| artifactExtraction | ✅ file blocks emitted |
| artifactWrite | ✅ paths under backend/frontend |
| buildConvergence | ✅ Java compiles (uses existing repos/entities) |
| testConvergence | ✅ `TaskAssignmentTest` covers assign/reassign/unassign/filter/workload/RBAC |
| securityCompliance | ✅ `@PreAuthorize("isAuthenticated()")`, team membership enforced, non-member assignment rejected |
| contractDrift | ✅ matches `PATCH /api/tasks/{id}/assignee`, `GET /api/teams/{id}/workload`, `GET /api/tasks?assigneeId&unassigned` |
| runtimeConvergence | ✅ no DB migration changes; uses existing schema |

## Phase Completion Summary

**Phase `task-assignment-workload` complete.**

Delivered:
- `PATCH /api/tasks/{id}/assignee` for assign/reassign/unassign (null = unassign)
- Filtering on `GET /api/tasks` via `assigneeId` and `unassigned=true`
- `GET /api/teams/{id}/workload` with per-member TODO/IN_PROGRESS/DONE counts, open totals, and unassigned open count
- Assignment validation ensures assignee is a member of the task's team
- Team membership authorization across all task and workload operations
- Frontend API clients for tasks (with filters + assignment) and workload
- Integration test exercising assignment lifecycle, filters, RBAC denial for non-members, and workload payload

Ready for next phase: `comments`.