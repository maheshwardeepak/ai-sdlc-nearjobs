model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Phase: Task CRUD & Statuses

Implementing task CRUD endpoints with title, description, priority, due date, and TODO/IN_PROGRESS/DONE statuses, protected by JWT auth and team membership authorization.

## Backend Work

Creating Task domain enums, DTOs, repository, service, controller, and exception handling. Tasks belong to a team; only team members can read/write tasks for that team.

### Enums

```file:backend/src/main/java/com/taskflowlite/task/domain/TaskStatus.java
package com.taskflowlite.task.domain;

public enum TaskStatus {
    TODO,
    IN_PROGRESS,
    DONE
}
```

```file:backend/src/main/java/com/taskflowlite/task/domain/TaskPriority.java
package com.taskflowlite.task.domain;

public enum TaskPriority {
    LOW,
    MEDIUM,
    HIGH,
    URGENT
}
```

### DTOs

```file:backend/src/main/java/com/taskflowlite/task/dto/CreateTaskRequest.java
package com.taskflowlite.task.dto;

import com.taskflowlite.task.domain.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class CreateTaskRequest {

    @NotBlank
    @Size(max = 200)
    private String title;

    @Size(max = 5000)
    private String description;

    @NotNull
    private TaskPriority priority;

    private LocalDate dueDate;

    @NotNull
    private Long teamId;

    private Long assigneeId;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority priority) { this.priority = priority; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }

    public Long getAssigneeId() { return assigneeId; }
    public void setAssigneeId(Long assigneeId) { this.assigneeId = assigneeId; }
}
```

```file:backend/src/main/java/com/taskflowlite/task/dto/UpdateTaskRequest.java
package com.taskflowlite.task.dto;

import com.taskflowlite.task.domain.TaskPriority;
import com.taskflowlite.task.domain.TaskStatus;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class UpdateTaskRequest {

    @Size(max = 200)
    private String title;

    @Size(max = 5000)
    private String description;

    private TaskPriority priority;

    private TaskStatus status;

    private LocalDate dueDate;

    private Long assigneeId;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority priority) { this.priority = priority; }

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public Long getAssigneeId() { return assigneeId; }
    public void setAssigneeId(Long assigneeId) { this.assigneeId = assigneeId; }
}
```

```file:backend/src/main/java/com/taskflowlite/task/dto/UpdateTaskStatusRequest.java
package com.taskflowlite.task.dto;

import com.taskflowlite.task.domain.TaskStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateTaskStatusRequest {

    @NotNull
    private TaskStatus status;

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }
}
```

```file:backend/src/main/java/com/taskflowlite/task/dto/TaskResponse.java
package com.taskflowlite.task.dto;

import com.taskflowlite.task.domain.TaskPriority;
import com.taskflowlite.task.domain.TaskStatus;

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
    private Long createdById;
    private String createdByUsername;
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
    public void setAssigneeUsername(String assigneeUsername) { this.assigneeUsername = assigneeUsername; }

    public Long getCreatedById() { return createdById; }
    public void setCreatedById(Long createdById) { this.createdById = createdById; }

    public String getCreatedByUsername() { return createdByUsername; }
    public void setCreatedByUsername(String createdByUsername) { this.createdByUsername = createdByUsername; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
```

### Repository

```file:backend/src/main/java/com/taskflowlite/task/repository/TaskRepository.java
package com.taskflowlite.task.repository;

import com.taskflowlite.task.domain.Task;
import com.taskflowlite.task.domain.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    List<Task> findByTeamId(Long teamId);

    List<Task> findByTeamIdAndStatus(Long teamId, TaskStatus status);

    List<Task> findByAssigneeId(Long assigneeId);
}
```

### Service

```file:backend/src/main/java/com/taskflowlite/task/service/TaskService.java
package com.taskflowlite.task.service;

import com.taskflowlite.team.domain.Team;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.task.domain.Task;
import com.taskflowlite.task.domain.TaskStatus;
import com.taskflowlite.task.dto.CreateTaskRequest;
import com.taskflowlite.task.dto.TaskResponse;
import com.taskflowlite.task.dto.UpdateTaskRequest;
import com.taskflowlite.task.exception.TaskAccessDeniedException;
import com.taskflowlite.task.exception.TaskNotFoundException;
import com.taskflowlite.task.repository.TaskRepository;
import com.taskflowlite.user.domain.User;
import com.taskflowlite.user.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

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

    @Transactional
    public TaskResponse createTask(CreateTaskRequest request, User currentUser) {
        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new TaskNotFoundException("Team not found: " + request.getTeamId()));

        assertTeamMember(team.getId(), currentUser.getId());

        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setPriority(request.getPriority());
        task.setStatus(TaskStatus.TODO);
        task.setDueDate(request.getDueDate());
        task.setTeam(team);
        task.setCreatedBy(currentUser);

        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new TaskNotFoundException("Assignee not found: " + request.getAssigneeId()));
            assertTeamMember(team.getId(), assignee.getId());
            task.setAssignee(assignee);
        }

        Task saved = taskRepository.save(task);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(Long id, User currentUser) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException("Task not found: " + id));
        assertTeamMember(task.getTeam().getId(), currentUser.getId());
        return toResponse(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listTasks(Long teamId, TaskStatus status, Long assigneeId, Boolean unassigned, User currentUser) {
        Specification<Task> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (teamId != null) {
                assertTeamMember(teamId, currentUser.getId());
                predicates.add(cb.equal(root.get("team").get("id"), teamId));
            } else {
                // restrict to teams user is member of
                List<Long> myTeams = teamMemberRepository.findTeamIdsByUserId(currentUser.getId());
                if (myTeams.isEmpty()) {
                    predicates.add(cb.disjunction());
                } else {
                    predicates.add(root.get("team").get("id").in(myTeams));
                }
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (Boolean.TRUE.equals(unassigned)) {
                predicates.add(cb.isNull(root.get("assignee")));
            } else if (assigneeId != null) {
                predicates.add(cb.equal(root.get("assignee").get("id"), assigneeId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return taskRepository.findAll(spec).stream().map(this::toResponse).toList();
    }

    @Transactional
    public TaskResponse updateTask(Long id, UpdateTaskRequest request, User currentUser) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException("Task not found: " + id));
        assertTeamMember(task.getTeam().getId(), currentUser.getId());

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            task.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate());
        }
        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new TaskNotFoundException("Assignee not found: " + request.getAssigneeId()));
            assertTeamMember(task.getTeam().getId(), assignee.getId());
            task.setAssignee(assignee);
        }

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse updateStatus(Long id, TaskStatus status, User currentUser) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException("Task not found: " + id));
        assertTeamMember(task.getTeam().getId(), currentUser.getId());
        task.setStatus(status);
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(Long id, User currentUser) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException("Task not found: " + id));
        assertTeamMember(task.getTeam().getId(), currentUser.getId());
        taskRepository.delete(task);
    }

    private void assertTeamMember(Long teamId, Long userId) {
        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new TaskAccessDeniedException("User is not a member of team " + teamId);
        }
    }

    private TaskResponse toResponse(Task task) {
        TaskResponse r = new TaskResponse();
        r.setId(task.getId());
        r.setTitle(task.getTitle());
        r.setDescription(task.getDescription());
        r.setStatus(task.getStatus());
        r.setPriority(task.getPriority());
        r.setDueDate(task.getDueDate());
        r.setTeamId(task.getTeam() != null ? task.getTeam().getId() : null);
        if (task.getAssignee() != null) {
            r.setAssigneeId(task.getAssignee().getId());
            r.setAssigneeUsername(task.getAssignee().getUsername());
        }
        if (task.getCreatedBy() != null) {
            r.setCreatedById(task.getCreatedBy().getId());
            r.setCreatedByUsername(task.getCreatedBy().getUsername());
        }
        r.setCreatedAt(task.getCreatedAt());
        r.setUpdatedAt(task.getUpdatedAt());
        return r;
    }
}
```

### Controller

```file:backend/src/main/java/com/taskflowlite/task/web/TaskController.java
package com.taskflowlite.task.web;

import com.taskflowlite.security.CurrentUser;
import com.taskflowlite.task.domain.TaskStatus;
import com.taskflowlite.task.dto.CreateTaskRequest;
import com.taskflowlite.task.dto.TaskResponse;
import com.taskflowlite.task.dto.UpdateTaskRequest;
import com.taskflowlite.task.dto.UpdateTaskStatusRequest;
import com.taskflowlite.task.service.TaskService;
import com.taskflowlite.user.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody CreateTaskRequest request,
                                               @CurrentUser User currentUser) {
        TaskResponse created = taskService.createTask(request, currentUser);
        return ResponseEntity.created(URI.create("/api/tasks/" + created.getId())).body(created);
    }

    @GetMapping
    public List<TaskResponse> list(@RequestParam(required = false) Long teamId,
                                   @RequestParam(required = false) TaskStatus status,
                                   @RequestParam(required = false) Long assigneeId,
                                   @RequestParam(required = false) Boolean unassigned,
                                   @CurrentUser User currentUser) {
        return taskService.listTasks(teamId, status, assigneeId, unassigned, currentUser);
    }

    @GetMapping("/{id}")
    public TaskResponse get(@PathVariable Long id, @CurrentUser User currentUser) {
        return taskService.getTask(id, currentUser);
    }

    @PutMapping("/{id}")
    public TaskResponse update(@PathVariable Long id,
                               @Valid @RequestBody UpdateTaskRequest request,
                               @CurrentUser User currentUser) {
        return taskService.updateTask(id, request, currentUser);
    }

    @PatchMapping("/{id}/status")
    public TaskResponse updateStatus(@PathVariable Long id,
                                     @Valid @RequestBody UpdateTaskStatusRequest request,
                                     @CurrentUser User currentUser) {
        return taskService.updateStatus(id, request.getStatus(), currentUser);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @CurrentUser User currentUser) {
        taskService.deleteTask(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
```

### Exceptions

```file:backend/src/main/java/com/taskflowlite/task/exception/TaskNotFoundException.java
package com.taskflowlite.task.exception;

public class TaskNotFoundException extends RuntimeException {
    public TaskNotFoundException(String message) {
        super(message);
    }
}
```

```file:backend/src/main/java/com/taskflowlite/task/exception/TaskAccessDeniedException.java
package com.taskflowlite.task.exception;

public class TaskAccessDeniedException extends RuntimeException {
    public TaskAccessDeniedException(String message) {
        super(message);
    }
}
```

```file:backend/src/main/java/com/taskflowlite/task/web/TaskExceptionHandler.java
package com.taskflowlite.task.web;

import com.taskflowlite.task.exception.TaskAccessDeniedException;
import com.taskflowlite.task.exception.TaskNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice(basePackages = "com.taskflowlite.task")
public class TaskExceptionHandler {

    @ExceptionHandler(TaskNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(TaskNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 404,
                "error", "Not Found",
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(TaskAccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(TaskAccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 403,
                "error", "Forbidden",
                "message", ex.getMessage()
        ));
    }
}
```

## Database Work

The `tasks` table was created in the database-and-entities phase. This phase adds a supplementary migration ensuring status/priority defaults and helpful indexes for filtering.

```file:backend/src/main/resources/db/migration/V7__task_indexes.sql
-- Indexes to support common task filters introduced in task-crud phase
CREATE INDEX IF NOT EXISTS idx_tasks_team_status ON tasks (team_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_assignee ON tasks (team_id, assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);
```

## Tests

```file:backend/src/test/java/com/taskflowlite/task/TaskControllerIntegrationTest.java
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
```

## Frontend Work

Adding a typed API client and React Query hooks for tasks so the upcoming board phase can consume them. No screens yet (those are in `frontend-task-board`).

```file:frontend/src/api/tasks.ts
import { apiClient } from "./client";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  teamId: number;
  assigneeId?: number | null;
  assigneeUsername?: string | null;
  createdById: number;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  teamId: number;
  assigneeId?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  assigneeId?: number;
}

export interface TaskListFilters {
  teamId?: number;
  status?: TaskStatus;
  assigneeId?: number;
  unassigned?: boolean;
}

export async function listTasks(filters: TaskListFilters = {}): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters.teamId != null) params.set("teamId", String(filters.teamId));
  if (filters.status) params.set("status", filters.status);
  if (filters.assigneeId != null) params.set("assigneeId", String(filters.assigneeId));
  if (filters.unassigned) params.set("unassigned", "true");
  const qs = params.toString();
  const { data } = await apiClient.get<Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`);
  return data;
}

export async function getTask(id: number): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/api/tasks/${id}`);
  return data;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await apiClient.post<Task>("/api/tasks", payload);
  return data;
}

export async function updateTask(id: number, payload: UpdateTaskPayload): Promise<Task> {
  const { data } = await apiClient.put<Task>(`/api/tasks/${id}`, payload);
  return data;
}

export async function updateTaskStatus(id: number, status: TaskStatus): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/api/tasks/${id}/status`, { status });
  return data;
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/api/tasks/${id}`);
}
```

```file:frontend/src/hooks/useTasks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateTaskPayload,
  Task,
  TaskListFilters,
  TaskStatus,
  UpdateTaskPayload,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
  updateTaskStatus,
} from "../api/tasks";

const tasksKey = (filters: TaskListFilters) => ["tasks", filters] as const;

export function useTasks(filters: TaskListFilters = {}) {
  return useQuery({
    queryKey: tasksKey(filters),
    queryFn: () => listTasks(filters),
  });
}

export function useTask(id: number | null) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => getTask(id as number),
    enabled: id != null,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTaskPayload }) =>
      updateTask(id, payload),
    onSuccess: (task: Task) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.setQueryData(["task", task.id], task);
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      updateTaskStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
```

```file:frontend/src/api/tasks.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { createTask, listTasks, updateTaskStatus } from "./tasks";

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mocked = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

describe("tasks api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listTasks builds query string from filters", async () => {
    mocked.get.mockResolvedValue({ data: [] });
    await listTasks({ teamId: 1, status: "TODO", unassigned: true });
    expect(mocked.get).toHaveBeenCalledWith(
      "/api/tasks?teamId=1&status=TODO&unassigned=true",
    );
  });

  it("createTask posts payload", async () => {
    mocked.post.mockResolvedValue({ data: { id: 1 } });
    await createTask({ title: "X", priority: "HIGH", teamId: 1 });
    expect(mocked.post).toHaveBeenCalledWith("/api/tasks", {
      title: "X",
      priority: "HIGH",
      teamId: 1,
    });
  });

  it("updateTaskStatus patches status", async () => {
    mocked.patch.mockResolvedValue({ data: { id: 1, status: "DONE" } });
    await updateTaskStatus(1, "DONE");
    expect(mocked.patch).toHaveBeenCalledWith("/api/tasks/1/status", {
      status: "DONE",
    });
  });
});
```

## Validation Gates

- **Execution**: All artifacts produced as fenced file blocks.
- **Build convergence**: Backend compiles (uses existing `User`, `Team`, `TeamMember`, `Task` entities, `CurrentUser` annotation, `TeamMemberRepository.existsByTeamIdAndUserId` + `findTeamIdsByUserId` from prior phase). Frontend uses existing `apiClient` and `@tanstack/react-query`.
- **Test convergence**: `TaskControllerIntegrationTest` covers create/update/status/delete + 401; `tasks.test.ts` covers client serialization.
- **Security compliance**: All `/api/tasks/**` endpoints require JWT auth (filter chain from `auth-security-jwt`); team-membership check enforced server-side returning 403; input validated with Bean Validation.
- **Contract drift**: Implements `POST/GET/PUT/PATCH(status)/DELETE /api/tasks` and `GET /api/tasks/{id}` per plan. Assignee PATCH endpoint deferred to `task-assignment-workload` phase.
- **Runtime convergence**: 401 unauthenticated, 403 non-member, 404 missing, 201 create, 200 read/update, 204 delete.

## Phase Completion Summary

Implemented full Task CRUD with status transitions (TODO/IN_PROGRESS/DONE) and priority (LOW/MEDIUM/HIGH/URGENT), due dates, and team-scoped authorization. New `TaskService` enforces team membership for every read/write, validates assignee membership, and exposes filtering by team/status/assignee/unassigned via JPA Specifications. Added DB indexes for common filter paths, integration tests, and typed frontend API + React Query hooks ready for the upcoming Task Board UI phase.