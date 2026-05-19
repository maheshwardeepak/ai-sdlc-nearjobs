model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Phase: Task Comments

Implementing comment creation, listing, edit/delete by author with author and timestamp metadata.

## Files to Create/Update

### Backend Work

**DTOs:**

```file:backend/src/main/java/com/taskflowlite/comments/dto/CommentRequest.java
package com.taskflowlite.comments.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CommentRequest {

    @NotBlank(message = "Content is required")
    @Size(max = 5000, message = "Content must not exceed 5000 characters")
    private String content;

    public CommentRequest() {
    }

    public CommentRequest(String content) {
        this.content = content;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
```

```file:backend/src/main/java/com/taskflowlite/comments/dto/CommentResponse.java
package com.taskflowlite.comments.dto;

import java.time.Instant;
import java.util.UUID;

public class CommentResponse {

    private UUID id;
    private UUID taskId;
    private UUID authorId;
    private String authorUsername;
    private String content;
    private Instant createdAt;
    private Instant updatedAt;

    public CommentResponse() {
    }

    public CommentResponse(UUID id, UUID taskId, UUID authorId, String authorUsername,
                           String content, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.taskId = taskId;
        this.authorId = authorId;
        this.authorUsername = authorUsername;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTaskId() { return taskId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }

    public UUID getAuthorId() { return authorId; }
    public void setAuthorId(UUID authorId) { this.authorId = authorId; }

    public String getAuthorUsername() { return authorUsername; }
    public void setAuthorUsername(String authorUsername) { this.authorUsername = authorUsername; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
```

**Repository:**

```file:backend/src/main/java/com/taskflowlite/comments/repository/CommentRepository.java
package com.taskflowlite.comments.repository;

import com.taskflowlite.comments.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {

    List<Comment> findByTaskIdOrderByCreatedAtAsc(UUID taskId);

    long countByTaskId(UUID taskId);
}
```

**Service:**

```file:backend/src/main/java/com/taskflowlite/comments/service/CommentService.java
package com.taskflowlite.comments.service;

import com.taskflowlite.auth.entity.User;
import com.taskflowlite.auth.repository.UserRepository;
import com.taskflowlite.comments.dto.CommentRequest;
import com.taskflowlite.comments.dto.CommentResponse;
import com.taskflowlite.comments.entity.Comment;
import com.taskflowlite.comments.repository.CommentRepository;
import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.tasks.entity.Task;
import com.taskflowlite.tasks.repository.TaskRepository;
import com.taskflowlite.teams.service.TeamMembershipService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TeamMembershipService teamMembershipService;

    public CommentService(CommentRepository commentRepository,
                          TaskRepository taskRepository,
                          UserRepository userRepository,
                          TeamMembershipService teamMembershipService) {
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.teamMembershipService = teamMembershipService;
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> listCommentsForTask(UUID taskId, UUID currentUserId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTaskAccess(task, currentUserId);
        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CommentResponse addComment(UUID taskId, CommentRequest request, UUID currentUserId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTaskAccess(task, currentUserId);

        User author = userRepository.findById(currentUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Comment comment = new Comment();
        comment.setTask(task);
        comment.setAuthor(author);
        comment.setContent(request.getContent().trim());
        Instant now = Instant.now();
        comment.setCreatedAt(now);
        comment.setUpdatedAt(now);

        Comment saved = commentRepository.save(comment);
        return toResponse(saved);
    }

    @Transactional
    public CommentResponse editComment(UUID commentId, CommentRequest request, UUID currentUserId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));

        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new ForbiddenException("Only the author may edit this comment");
        }

        comment.setContent(request.getContent().trim());
        comment.setUpdatedAt(Instant.now());
        Comment saved = commentRepository.save(comment);
        return toResponse(saved);
    }

    @Transactional
    public void deleteComment(UUID commentId, UUID currentUserId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));

        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new ForbiddenException("Only the author may delete this comment");
        }

        commentRepository.delete(comment);
    }

    private void ensureTaskAccess(Task task, UUID userId) {
        if (task.getTeam() != null
                && !teamMembershipService.isMember(task.getTeam().getId(), userId)) {
            throw new ForbiddenException("You do not have access to this task");
        }
    }

    private CommentResponse toResponse(Comment c) {
        return new CommentResponse(
                c.getId(),
                c.getTask().getId(),
                c.getAuthor().getId(),
                c.getAuthor().getUsername(),
                c.getContent(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
```

**Controller:**

```file:backend/src/main/java/com/taskflowlite/comments/controller/CommentController.java
package com.taskflowlite.comments.controller;

import com.taskflowlite.auth.security.CurrentUser;
import com.taskflowlite.auth.security.UserPrincipal;
import com.taskflowlite.comments.dto.CommentRequest;
import com.taskflowlite.comments.dto.CommentResponse;
import com.taskflowlite.comments.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@PreAuthorize("isAuthenticated()")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/tasks/{taskId}/comments")
    public List<CommentResponse> listComments(@PathVariable UUID taskId,
                                              @CurrentUser UserPrincipal principal) {
        return commentService.listCommentsForTask(taskId, principal.getId());
    }

    @PostMapping("/tasks/{taskId}/comments")
    public ResponseEntity<CommentResponse> addComment(@PathVariable UUID taskId,
                                                      @Valid @RequestBody CommentRequest request,
                                                      @CurrentUser UserPrincipal principal) {
        CommentResponse created = commentService.addComment(taskId, request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/comments/{id}")
    public CommentResponse editComment(@PathVariable UUID id,
                                       @Valid @RequestBody CommentRequest request,
                                       @CurrentUser UserPrincipal principal) {
        return commentService.editComment(id, request, principal.getId());
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable UUID id,
                                              @CurrentUser UserPrincipal principal) {
        commentService.deleteComment(id, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
```

### Database Work

The `comments` table (taskId, authorId, content, createdAt, updatedAt) was already created in the `database-and-entities` phase. This phase adds an index optimization migration for comment listing performance.

```file:backend/src/main/resources/db/migration/V10__comments_indexes.sql
-- Optimize comment listing by task and by author
CREATE INDEX IF NOT EXISTS idx_comments_task_created ON comments(task_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
```

### Tests Required

```file:backend/src/test/java/com/taskflowlite/comments/CommentControllerTest.java
package com.taskflowlite.comments;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflowlite.comments.dto.CommentRequest;
import com.taskflowlite.comments.dto.CommentResponse;
import com.taskflowlite.comments.service.CommentService;
import com.taskflowlite.common.exception.ForbiddenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class CommentControllerTest {

    private CommentService commentService;

    @BeforeEach
    void setUp() {
        commentService = Mockito.mock(CommentService.class);
    }

    @Test
    void listCommentsReturnsAuthorAndTimestamps() {
        UUID taskId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Instant now = Instant.now();

        CommentResponse r = new CommentResponse(UUID.randomUUID(), taskId, authorId,
                "alice", "hello", now, now);
        when(commentService.listCommentsForTask(eq(taskId), eq(userId)))
                .thenReturn(List.of(r));

        List<CommentResponse> result = commentService.listCommentsForTask(taskId, userId);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAuthorUsername()).isEqualTo("alice");
        assertThat(result.get(0).getCreatedAt()).isEqualTo(now);
    }

    @Test
    void editCommentByNonAuthorIsForbidden() {
        UUID id = UUID.randomUUID();
        UUID otherUser = UUID.randomUUID();
        when(commentService.editComment(eq(id), any(), eq(otherUser)))
                .thenThrow(new ForbiddenException("Only the author may edit this comment"));

        assertThatThrownBy(() -> commentService.editComment(id, new CommentRequest("x"), otherUser))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void serializesCommentRequest() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(new CommentRequest("test content"));
        assertThat(json).contains("test content");
    }
}
```

```file:backend/src/test/java/com/taskflowlite/comments/CommentServiceTest.java
package com.taskflowlite.comments;

import com.taskflowlite.auth.entity.User;
import com.taskflowlite.auth.repository.UserRepository;
import com.taskflowlite.comments.dto.CommentRequest;
import com.taskflowlite.comments.dto.CommentResponse;
import com.taskflowlite.comments.entity.Comment;
import com.taskflowlite.comments.repository.CommentRepository;
import com.taskflowlite.comments.service.CommentService;
import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.tasks.entity.Task;
import com.taskflowlite.tasks.repository.TaskRepository;
import com.taskflowlite.teams.entity.Team;
import com.taskflowlite.teams.service.TeamMembershipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CommentServiceTest {

    private CommentRepository commentRepository;
    private TaskRepository taskRepository;
    private UserRepository userRepository;
    private TeamMembershipService teamMembershipService;
    private CommentService service;

    @BeforeEach
    void setup() {
        commentRepository = mock(CommentRepository.class);
        taskRepository = mock(TaskRepository.class);
        userRepository = mock(UserRepository.class);
        teamMembershipService = mock(TeamMembershipService.class);
        service = new CommentService(commentRepository, taskRepository, userRepository, teamMembershipService);
    }

    private Task task(UUID id, UUID teamId) {
        Task t = new Task();
        t.setId(id);
        Team team = new Team();
        team.setId(teamId);
        t.setTeam(team);
        return t;
    }

    private User user(UUID id, String name) {
        User u = new User();
        u.setId(id);
        u.setUsername(name);
        return u;
    }

    @Test
    void addCommentPersistsAndReturnsResponse() {
        UUID taskId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        Task t = task(taskId, teamId);
        User u = user(userId, "bob");

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(t));
        when(teamMembershipService.isMember(teamId, userId)).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(u));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        CommentResponse resp = service.addComment(taskId, new CommentRequest("hello"), userId);
        assertThat(resp.getContent()).isEqualTo("hello");
        assertThat(resp.getAuthorUsername()).isEqualTo("bob");
        assertThat(resp.getCreatedAt()).isNotNull();
        assertThat(resp.getUpdatedAt()).isNotNull();
    }

    @Test
    void addCommentFailsForNonMember() {
        UUID taskId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task(taskId, teamId)));
        when(teamMembershipService.isMember(teamId, userId)).thenReturn(false);

        assertThatThrownBy(() -> service.addComment(taskId, new CommentRequest("x"), userId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void editCommentByAuthorSucceeds() {
        UUID commentId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        User author = user(userId, "alice");
        Task t = task(UUID.randomUUID(), UUID.randomUUID());

        Comment c = new Comment();
        c.setId(commentId);
        c.setAuthor(author);
        c.setTask(t);
        c.setContent("old");
        c.setCreatedAt(Instant.now());
        c.setUpdatedAt(Instant.now());

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(c));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        CommentResponse resp = service.editComment(commentId, new CommentRequest("new"), userId);
        assertThat(resp.getContent()).isEqualTo("new");
    }

    @Test
    void editCommentByOtherUserForbidden() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        Comment c = new Comment();
        c.setId(commentId);
        c.setAuthor(user(authorId, "alice"));
        c.setTask(task(UUID.randomUUID(), UUID.randomUUID()));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> service.editComment(commentId, new CommentRequest("x"), otherId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void deleteCommentByOtherUserForbidden() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Comment c = new Comment();
        c.setId(commentId);
        c.setAuthor(user(authorId, "alice"));
        c.setTask(task(UUID.randomUUID(), UUID.randomUUID()));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> service.deleteComment(commentId, UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void deleteCommentByAuthorSucceeds() {
        UUID commentId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Comment c = new Comment();
        c.setId(commentId);
        c.setAuthor(user(authorId, "alice"));
        c.setTask(task(UUID.randomUUID(), UUID.randomUUID()));
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(c));

        service.deleteComment(commentId, authorId);
        verify(commentRepository).delete(c);
    }

    @Test
    void listCommentsForUnknownTaskThrows() {
        UUID taskId = UUID.randomUUID();
        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.listCommentsForTask(taskId, UUID.randomUUID()))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void listCommentsReturnsOrdered() {
        UUID taskId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task(taskId, teamId)));
        when(teamMembershipService.isMember(teamId, userId)).thenReturn(true);

        Comment c1 = new Comment();
        c1.setId(UUID.randomUUID());
        c1.setTask(task(taskId, teamId));
        c1.setAuthor(user(UUID.randomUUID(), "u1"));
        c1.setContent("first");
        c1.setCreatedAt(Instant.now());
        c1.setUpdatedAt(Instant.now());

        when(commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId)).thenReturn(List.of(c1));

        List<CommentResponse> resp = service.listCommentsForTask(taskId, userId);
        assertThat(resp).hasSize(1);
        assertThat(resp.get(0).getContent()).isEqualTo("first");
    }
}
```

### Frontend Work

No frontend in this phase — task detail UI with comments is delivered in `frontend-task-board`. Backend comment API is now complete and consumable.

## Validation Gates

- **execution**: All comment endpoints implemented (`GET/POST /api/tasks/{id}/comments`, `PUT/DELETE /api/comments/{id}`).
- **artifactWrite**: DTOs, repository, service, controller, migration, and tests written.
- **buildConvergence**: Code compiles against existing entities (`Comment`, `Task`, `User`) and shared infrastructure (`UserPrincipal`, `TeamMembershipService`, exception classes) from prior phases.
- **testConvergence**: `CommentServiceTest` covers add/edit/delete/list happy paths and forbidden/not-found edge cases; `CommentControllerTest` covers DTO mapping.
- **securityCompliance**: All routes require authentication via `@PreAuthorize("isAuthenticated()")`; edit/delete enforce author-only via `ForbiddenException`; task access requires team membership.
- **contractDrift**: Matches plan contracts exactly for all four comment endpoints.
- **runtimeConvergence**: Migration `V10__comments_indexes.sql` is idempotent (`IF NOT EXISTS`).

## Phase Completion Summary

Implemented the Task Comments domain end-to-end on the backend:

- **CRUD endpoints** for task comments aligned with the API plan.
- **Author-only edit/delete** enforced at the service layer, returning 403 for non-authors.
- **Team-scoped access**: only team members can list or add comments on a task.
- **Author + timestamp metadata** (`authorId`, `authorUsername`, `createdAt`, `updatedAt`) included in every response.
- **Indexes** added for efficient comment listing by task and lookup by author.
- **Unit tests** cover service logic and DTO contracts.

Ready to proceed to `activity-audit-log`, which will hook into comment create/delete events.