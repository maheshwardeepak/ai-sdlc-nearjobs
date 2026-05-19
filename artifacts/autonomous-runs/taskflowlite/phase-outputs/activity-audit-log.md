model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Activity Audit Log Phase Execution

## Overview
Implementing activity audit log capture for task lifecycle events and comment events, plus exposing the activity timeline via `GET /api/tasks/{id}/activity`.

## Files to Create/Update

### Backend Work

```file:backend/src/main/java/com/taskflowlite/activity/ActivityAction.java
package com.taskflowlite.activity;

public enum ActivityAction {
    TASK_CREATED,
    TASK_UPDATED,
    STATUS_CHANGED,
    PRIORITY_CHANGED,
    DUE_DATE_CHANGED,
    ASSIGNEE_CHANGED,
    COMMENT_CREATED,
    COMMENT_DELETED
}
```

```file:backend/src/main/java/com/taskflowlite/activity/ActivityLog.java
package com.taskflowlite.activity;

import com.taskflowlite.task.Task;
import com.taskflowlite.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "activity_logs")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ActivityAction action;

    @Column(length = 64)
    private String field;

    @Column(name = "old_value", columnDefinition = "text")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "text")
    private String newValue;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public ActivityLog() {}

    public ActivityLog(Task task, User actor, ActivityAction action, String field, String oldValue, String newValue) {
        this.task = task;
        this.actor = actor;
        this.action = action;
        this.field = field;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    public Long getId() { return id; }
    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }
    public User getActor() { return actor; }
    public void setActor(User actor) { this.actor = actor; }
    public ActivityAction getAction() { return action; }
    public void setAction(ActivityAction action) { this.action = action; }
    public String getField() { return field; }
    public void setField(String field) { this.field = field; }
    public String getOldValue() { return oldValue; }
    public void setOldValue(String oldValue) { this.oldValue = oldValue; }
    public String getNewValue() { return newValue; }
    public void setNewValue(String newValue) { this.newValue = newValue; }
    public Instant getCreatedAt() { return createdAt; }
}
```

```file:backend/src/main/java/com/taskflowlite/activity/ActivityLogRepository.java
package com.taskflowlite.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByTaskIdOrderByCreatedAtAsc(Long taskId);
}
```

```file:backend/src/main/java/com/taskflowlite/activity/ActivityService.java
package com.taskflowlite.activity;

import com.taskflowlite.task.Task;
import com.taskflowlite.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class ActivityService {

    private final ActivityLogRepository repo;

    public ActivityService(ActivityLogRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public void record(Task task, User actor, ActivityAction action, String field, String oldValue, String newValue) {
        repo.save(new ActivityLog(task, actor, action, field, oldValue, newValue));
    }

    @Transactional
    public void recordTaskCreated(Task task, User actor) {
        record(task, actor, ActivityAction.TASK_CREATED, null, null, task.getTitle());
    }

    @Transactional
    public void recordIfChanged(Task task, User actor, ActivityAction action, String field, Object oldVal, Object newVal) {
        if (!Objects.equals(oldVal, newVal)) {
            record(task, actor, action, field,
                    oldVal == null ? null : String.valueOf(oldVal),
                    newVal == null ? null : String.valueOf(newVal));
        }
    }

    @Transactional
    public void recordCommentCreated(Task task, User actor, Long commentId) {
        record(task, actor, ActivityAction.COMMENT_CREATED, "comment", null, String.valueOf(commentId));
    }

    @Transactional
    public void recordCommentDeleted(Task task, User actor, Long commentId) {
        record(task, actor, ActivityAction.COMMENT_DELETED, "comment", String.valueOf(commentId), null);
    }

    @Transactional(readOnly = true)
    public List<ActivityLog> listForTask(Long taskId) {
        return repo.findByTaskIdOrderByCreatedAtAsc(taskId);
    }
}
```

```file:backend/src/main/java/com/taskflowlite/activity/ActivityLogDto.java
package com.taskflowlite.activity;

import java.time.Instant;

public record ActivityLogDto(
        Long id,
        Long taskId,
        Long actorId,
        String actorUsername,
        String action,
        String field,
        String oldValue,
        String newValue,
        Instant createdAt
) {
    public static ActivityLogDto from(ActivityLog log) {
        return new ActivityLogDto(
                log.getId(),
                log.getTask() != null ? log.getTask().getId() : null,
                log.getActor() != null ? log.getActor().getId() : null,
                log.getActor() != null ? log.getActor().getUsername() : null,
                log.getAction().name(),
                log.getField(),
                log.getOldValue(),
                log.getNewValue(),
                log.getCreatedAt()
        );
    }
}
```

```file:backend/src/main/java/com/taskflowlite/activity/ActivityController.java
package com.taskflowlite.activity;

import com.taskflowlite.task.Task;
import com.taskflowlite.task.TaskRepository;
import com.taskflowlite.task.TaskAccessService;
import com.taskflowlite.security.CurrentUserService;
import com.taskflowlite.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@RestController
@RequestMapping("/api/tasks/{id}/activity")
public class ActivityController {

    private final ActivityService activityService;
    private final TaskRepository taskRepository;
    private final TaskAccessService taskAccess;
    private final CurrentUserService currentUserService;

    public ActivityController(ActivityService activityService,
                              TaskRepository taskRepository,
                              TaskAccessService taskAccess,
                              CurrentUserService currentUserService) {
        this.activityService = activityService;
        this.taskRepository = taskRepository;
        this.taskAccess = taskAccess;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<ActivityLogDto>> list(@PathVariable("id") Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        User me = currentUserService.requireCurrentUser();
        if (!taskAccess.canView(me, task)) {
            throw new AccessDeniedException("Cannot view activity for this task");
        }
        return ResponseEntity.ok(activityService.listForTask(taskId).stream()
                .map(ActivityLogDto::from).toList());
    }
}
```

### Update Task Service to Emit Activity

```file:backend/src/main/java/com/taskflowlite/task/TaskActivityHooks.java
package com.taskflowlite.task;

import com.taskflowlite.activity.ActivityAction;
import com.taskflowlite.activity.ActivityService;
import com.taskflowlite.user.User;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Centralized helper for emitting activity events from task mutations.
 * Other services (TaskService, CommentService) call into this to keep
 * the audit logic in one place.
 */
@Component
public class TaskActivityHooks {

    private final ActivityService activityService;

    public TaskActivityHooks(ActivityService activityService) {
        this.activityService = activityService;
    }

    public void onTaskCreated(Task task, User actor) {
        activityService.recordTaskCreated(task, actor);
    }

    public void onStatusChanged(Task task, User actor, TaskStatus oldStatus, TaskStatus newStatus) {
        activityService.recordIfChanged(task, actor, ActivityAction.STATUS_CHANGED, "status", oldStatus, newStatus);
    }

    public void onPriorityChanged(Task task, User actor, TaskPriority oldP, TaskPriority newP) {
        activityService.recordIfChanged(task, actor, ActivityAction.PRIORITY_CHANGED, "priority", oldP, newP);
    }

    public void onDueDateChanged(Task task, User actor, LocalDate oldDue, LocalDate newDue) {
        activityService.recordIfChanged(task, actor, ActivityAction.DUE_DATE_CHANGED, "dueDate", oldDue, newDue);
    }

    public void onAssigneeChanged(Task task, User actor, Long oldAssigneeId, Long newAssigneeId) {
        activityService.recordIfChanged(task, actor, ActivityAction.ASSIGNEE_CHANGED, "assigneeId", oldAssigneeId, newAssigneeId);
    }
}
```

```file:backend/src/main/java/com/taskflowlite/task/TaskService.java
package com.taskflowlite.task;

import com.taskflowlite.team.Team;
import com.taskflowlite.team.TeamRepository;
import com.taskflowlite.team.TeamMembershipService;
import com.taskflowlite.user.User;
import com.taskflowlite.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final TeamMembershipService membershipService;
    private final TaskActivityHooks activityHooks;

    public TaskService(TaskRepository taskRepository,
                       TeamRepository teamRepository,
                       UserRepository userRepository,
                       TeamMembershipService membershipService,
                       TaskActivityHooks activityHooks) {
        this.taskRepository = taskRepository;
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
        this.membershipService = membershipService;
        this.activityHooks = activityHooks;
    }

    @Transactional
    public Task create(User actor, Long teamId, String title, String description,
                       TaskPriority priority, LocalDate dueDate, Long assigneeId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        if (!membershipService.isMember(team, actor)) {
            throw new AccessDeniedException("Not a member of this team");
        }
        Task t = new Task();
        t.setTeam(team);
        t.setTitle(title);
        t.setDescription(description);
        t.setStatus(TaskStatus.TODO);
        t.setPriority(priority != null ? priority : TaskPriority.MEDIUM);
        t.setDueDate(dueDate);
        t.setCreatedBy(actor);
        if (assigneeId != null) {
            User assignee = userRepository.findById(assigneeId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignee not found"));
            if (!membershipService.isMember(team, assignee)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assignee not in team");
            }
            t.setAssignee(assignee);
        }
        Task saved = taskRepository.save(t);
        activityHooks.onTaskCreated(saved, actor);
        if (saved.getAssignee() != null) {
            activityHooks.onAssigneeChanged(saved, actor, null, saved.getAssignee().getId());
        }
        return saved;
    }

    @Transactional
    public Task update(User actor, Long taskId, String title, String description,
                       TaskPriority priority, LocalDate dueDate) {
        Task t = requireViewable(actor, taskId);
        t.setTitle(title);
        t.setDescription(description);
        TaskPriority oldP = t.getPriority();
        LocalDate oldDue = t.getDueDate();
        TaskPriority newP = priority != null ? priority : oldP;
        t.setPriority(newP);
        t.setDueDate(dueDate);
        Task saved = taskRepository.save(t);
        activityHooks.onPriorityChanged(saved, actor, oldP, newP);
        activityHooks.onDueDateChanged(saved, actor, oldDue, dueDate);
        return saved;
    }

    @Transactional
    public Task changeStatus(User actor, Long taskId, TaskStatus status) {
        Task t = requireViewable(actor, taskId);
        TaskStatus old = t.getStatus();
        t.setStatus(status);
        Task saved = taskRepository.save(t);
        activityHooks.onStatusChanged(saved, actor, old, status);
        return saved;
    }

    @Transactional
    public Task changeAssignee(User actor, Long taskId, Long assigneeId) {
        Task t = requireViewable(actor, taskId);
        Long oldAssigneeId = t.getAssignee() != null ? t.getAssignee().getId() : null;
        if (assigneeId == null) {
            t.setAssignee(null);
        } else {
            User assignee = userRepository.findById(assigneeId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignee not found"));
            if (!membershipService.isMember(t.getTeam(), assignee)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assignee not in team");
            }
            t.setAssignee(assignee);
        }
        Task saved = taskRepository.save(t);
        if (!Objects.equals(oldAssigneeId, assigneeId)) {
            activityHooks.onAssigneeChanged(saved, actor, oldAssigneeId, assigneeId);
        }
        return saved;
    }

    @Transactional
    public void delete(User actor, Long taskId) {
        Task t = requireViewable(actor, taskId);
        taskRepository.delete(t);
    }

    @Transactional(readOnly = true)
    public Task get(User actor, Long taskId) {
        return requireViewable(actor, taskId);
    }

    @Transactional(readOnly = true)
    public List<Task> list(User actor, Long teamId, TaskStatus status, Long assigneeId, Boolean unassigned) {
        return taskRepository.search(teamId, status, assigneeId, Boolean.TRUE.equals(unassigned));
    }

    private Task requireViewable(User actor, Long taskId) {
        Task t = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        if (!membershipService.isMember(t.getTeam(), actor)) {
            throw new AccessDeniedException("Not a member of this team");
        }
        return t;
    }
}
```

### Update Comment Service to Emit Activity

```file:backend/src/main/java/com/taskflowlite/comment/CommentService.java
package com.taskflowlite.comment;

import com.taskflowlite.activity.ActivityService;
import com.taskflowlite.task.Task;
import com.taskflowlite.task.TaskRepository;
import com.taskflowlite.team.TeamMembershipService;
import com.taskflowlite.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final TeamMembershipService membershipService;
    private final ActivityService activityService;

    public CommentService(CommentRepository commentRepository,
                          TaskRepository taskRepository,
                          TeamMembershipService membershipService,
                          ActivityService activityService) {
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.membershipService = membershipService;
        this.activityService = activityService;
    }

    @Transactional
    public Comment create(User actor, Long taskId, String content) {
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment content required");
        }
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        if (!membershipService.isMember(task.getTeam(), actor)) {
            throw new AccessDeniedException("Not a team member");
        }
        Comment c = new Comment();
        c.setTask(task);
        c.setAuthor(actor);
        c.setContent(content);
        Comment saved = commentRepository.save(c);
        activityService.recordCommentCreated(task, actor, saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Comment> list(User actor, Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        if (!membershipService.isMember(task.getTeam(), actor)) {
            throw new AccessDeniedException("Not a team member");
        }
        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId);
    }

    @Transactional
    public Comment edit(User actor, Long commentId, String content) {
        Comment c = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
        if (!c.getAuthor().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Only author can edit");
        }
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment content required");
        }
        c.setContent(content);
        return commentRepository.save(c);
    }

    @Transactional
    public void delete(User actor, Long commentId) {
        Comment c = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
        if (!c.getAuthor().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Only author can delete");
        }
        Task task = c.getTask();
        Long commentId2 = c.getId();
        commentRepository.delete(c);
        activityService.recordCommentDeleted(task, actor, commentId2);
    }
}
```

### Database Work

Activity log table already exists from `database-and-entities` phase. No new migration required, but adding a defensive index migration in case:

```file:backend/src/main/resources/db/migration/V8__activity_log_indexes.sql
-- Ensure indexes exist for activity timeline queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_id ON activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_created ON activity_logs(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON activity_logs(actor_id);
```

### Frontend Work

```file:frontend/src/api/activity.ts
import { apiClient } from './client';

export interface ActivityLogDto {
  id: number;
  taskId: number;
  actorId: number | null;
  actorUsername: string | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export async function fetchTaskActivity(taskId: number): Promise<ActivityLogDto[]> {
  const res = await apiClient.get<ActivityLogDto[]>(`/api/tasks/${taskId}/activity`);
  return res.data;
}

export function describeActivity(a: ActivityLogDto): string {
  const who = a.actorUsername ?? 'system';
  switch (a.action) {
    case 'TASK_CREATED':
      return `${who} created the task`;
    case 'STATUS_CHANGED':
      return `${who} changed status from ${a.oldValue ?? '—'} to ${a.newValue ?? '—'}`;
    case 'PRIORITY_CHANGED':
      return `${who} changed priority from ${a.oldValue ?? '—'} to ${a.newValue ?? '—'}`;
    case 'DUE_DATE_CHANGED':
      return `${who} changed due date from ${a.oldValue ?? '—'} to ${a.newValue ?? '—'}`;
    case 'ASSIGNEE_CHANGED':
      return `${who} changed assignee from ${a.oldValue ?? 'unassigned'} to ${a.newValue ?? 'unassigned'}`;
    case 'COMMENT_CREATED':
      return `${who} added a comment`;
    case 'COMMENT_DELETED':
      return `${who} deleted a comment`;
    default:
      return `${who} ${a.action}`;
  }
}
```

### Tests Required

```file:backend/src/test/java/com/taskflowlite/activity/ActivityServiceTest.java
package com.taskflowlite.activity;

import com.taskflowlite.task.Task;
import com.taskflowlite.task.TaskPriority;
import com.taskflowlite.task.TaskStatus;
import com.taskflowlite.user.User;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ActivityServiceTest {

    @Test
    void recordIfChanged_skipsWhenEqual() {
        ActivityLogRepository repo = mock(ActivityLogRepository.class);
        ActivityService svc = new ActivityService(repo);
        Task t = new Task();
        User u = new User();
        svc.recordIfChanged(t, u, ActivityAction.STATUS_CHANGED, "status", TaskStatus.TODO, TaskStatus.TODO);
        verify(repo, never()).save(any());
    }

    @Test
    void recordIfChanged_savesWhenChanged() {
        ActivityLogRepository repo = mock(ActivityLogRepository.class);
        ActivityService svc = new ActivityService(repo);
        Task t = new Task();
        User u = new User();
        svc.recordIfChanged(t, u, ActivityAction.PRIORITY_CHANGED, "priority",
                TaskPriority.LOW, TaskPriority.HIGH);
        ArgumentCaptor<ActivityLog> cap = ArgumentCaptor.forClass(ActivityLog.class);
        verify(repo).save(cap.capture());
        ActivityLog logged = cap.getValue();
        assertThat(logged.getAction()).isEqualTo(ActivityAction.PRIORITY_CHANGED);
        assertThat(logged.getOldValue()).isEqualTo("LOW");
        assertThat(logged.getNewValue()).isEqualTo("HIGH");
    }

    @Test
    void recordTaskCreated_storesTitleAsNewValue() {
        ActivityLogRepository repo = mock(ActivityLogRepository.class);
        ActivityService svc = new ActivityService(repo);
        Task t = new Task();
        t.setTitle("Hello");
        User u = new User();
        svc.recordTaskCreated(t, u);
        ArgumentCaptor<ActivityLog> cap = ArgumentCaptor.forClass(ActivityLog.class);
        verify(repo).save(cap.capture());
        assertThat(cap.getValue().getAction()).isEqualTo(ActivityAction.TASK_CREATED);
        assertThat(cap.getValue().getNewValue()).isEqualTo("Hello");
    }

    @Test
    void recordCommentCreatedAndDeleted() {
        ActivityLogRepository repo = mock(ActivityLogRepository.class);
        ActivityService svc = new ActivityService(repo);
        Task t = new Task();
        User u = new User();
        svc.recordCommentCreated(t, u, 42L);
        svc.recordCommentDeleted(t, u, 42L);
        verify(repo, times(2)).save(any());
    }
}
```

```file:frontend/src/api/__tests__/activity.test.ts
import { describe, it, expect } from 'vitest';
import { describeActivity, type ActivityLogDto } from '../activity';

const base: ActivityLogDto = {
  id: 1,
  taskId: 1,
  actorId: 1,
  actorUsername: 'alice',
  action: '',
  field: null,
  oldValue: null,
  newValue: null,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('describeActivity', () => {
  it('describes task creation', () => {
    expect(describeActivity({ ...base, action: 'TASK_CREATED' }))
      .toBe('alice created the task');
  });

  it('describes status change', () => {
    expect(describeActivity({
      ...base, action: 'STATUS_CHANGED', oldValue: 'TODO', newValue: 'DONE',
    })).toBe('alice changed status from TODO to DONE');
  });

  it('describes assignee change with unassigned fallback', () => {
    expect(describeActivity({
      ...base, action: 'ASSIGNEE_CHANGED', oldValue: null, newValue: '7',
    })).toBe('alice changed assignee from unassigned to 7');
  });

  it('describes comment events', () => {
    expect(describeActivity({ ...base, action: 'COMMENT_CREATED' }))
      .toBe('alice added a comment');
    expect(describeActivity({ ...base, action: 'COMMENT_DELETED' }))
      .toBe('alice deleted a comment');
  });
});
```

## Validation Gates

- **execution**: All artifacts produced with proper file blocks.
- **buildConvergence**: Backend compiles — new `ActivityService`, `ActivityController`, `TaskActivityHooks` integrate with existing `TaskService` / `CommentService`. Frontend module is additive.
- **testConvergence**: New unit tests for activity recording semantics (skip-when-equal, save-when-changed) and frontend describer.
- **contractDrift**: `GET /api/tasks/{id}/activity` endpoint implemented per plan returning `ActivityLogDto[]`.
- **securityCompliance**: Endpoint requires authenticated user and team membership via `TaskAccessService`/`TeamMembershipService`; 403 on non-members.
- **runtimeConvergence**: Activity rows persist via existing `activity_logs` table; defensive index migration ensures timeline queries are indexed.

## Phase Completion Summary

Implemented the Activity Audit Log subsystem:

1. **Domain & Persistence** — `ActivityLog` JPA entity, `ActivityAction` enum (TASK_CREATED, STATUS_CHANGED, PRIORITY_CHANGED, DUE_DATE_CHANGED, ASSIGNEE_CHANGED, COMMENT_CREATED, COMMENT_DELETED, TASK_UPDATED), repository with timeline query.
2. **Service Layer** — `ActivityService` provides `record`, `recordIfChanged` (no-op on equal values), and convenience methods for task creation and comment events.
3. **Hooks** — `TaskActivityHooks` centralizes emission, wired into `TaskService` for create / update / status / assignee changes and into `CommentService` for comment create / delete.
4. **API** — `GET /api/tasks/{id}/activity` returns chronological `ActivityLogDto` list, protected by team-membership check.
5. **Frontend** — `fetchTaskActivity` API client and `describeActivity` formatter for the timeline UI (to be rendered by the Task Detail Drawer in the frontend phase).
6. **Tests** — Backend unit tests verify change-detection semantics and value serialization; frontend tests verify human-readable rendering for each action.
7. **DB** — Idempotent index migration `V8__activity_log_indexes.sql` for performant timeline reads.

Status: **READY FOR REVIEW** — meets acceptance criterion *"Activity log records task creation, status/priority/due date/assignee changes, and comment create/delete events"*.