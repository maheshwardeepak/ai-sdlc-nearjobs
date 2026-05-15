model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Phase: Database Schema & JPA Entities

Defining PostgreSQL schema via Flyway migrations and JPA entities for all domain objects.

## Files to Create/Update

### Database Work — Flyway Migration

```file:backend/src/main/resources/db/migration/V1__init_schema.sql
-- TaskFlowLite initial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'MEMBER',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN','MANAGER','MEMBER'))
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- =====================================================
-- TEAMS
-- =====================================================
CREATE TABLE teams (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    description  TEXT,
    owner_id     BIGINT       NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_teams_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX idx_teams_owner ON teams(owner_id);

-- =====================================================
-- TEAM_MEMBERS
-- =====================================================
CREATE TABLE team_members (
    id            BIGSERIAL PRIMARY KEY,
    team_id       BIGINT      NOT NULL,
    user_id       BIGINT      NOT NULL,
    role_in_team  VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_tm_team_user UNIQUE (team_id, user_id),
    CONSTRAINT chk_tm_role CHECK (role_in_team IN ('OWNER','MANAGER','MEMBER'))
);
CREATE INDEX idx_tm_team ON team_members(team_id);
CREATE INDEX idx_tm_user ON team_members(user_id);

-- =====================================================
-- TASKS
-- =====================================================
CREATE TABLE tasks (
    id             BIGSERIAL PRIMARY KEY,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    status         VARCHAR(20)  NOT NULL DEFAULT 'TODO',
    priority       VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    due_date       DATE,
    team_id        BIGINT,
    assignee_id    BIGINT,
    created_by_id  BIGINT       NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_tasks_team       FOREIGN KEY (team_id)       REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_assignee   FOREIGN KEY (assignee_id)   REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_creator    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_tasks_status    CHECK (status   IN ('TODO','IN_PROGRESS','DONE')),
    CONSTRAINT chk_tasks_priority  CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT'))
);
CREATE INDEX idx_tasks_team     ON tasks(team_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status   ON tasks(status);
CREATE INDEX idx_tasks_creator  ON tasks(created_by_id);

-- =====================================================
-- COMMENTS
-- =====================================================
CREATE TABLE comments (
    id          BIGSERIAL PRIMARY KEY,
    task_id     BIGINT      NOT NULL,
    author_id   BIGINT      NOT NULL,
    content     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_comments_task   FOREIGN KEY (task_id)   REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX idx_comments_task   ON comments(task_id);
CREATE INDEX idx_comments_author ON comments(author_id);

-- =====================================================
-- ACTIVITY_LOGS
-- =====================================================
CREATE TABLE activity_logs (
    id          BIGSERIAL PRIMARY KEY,
    task_id     BIGINT      NOT NULL,
    actor_id    BIGINT      NOT NULL,
    action      VARCHAR(50) NOT NULL,
    field       VARCHAR(50),
    old_value   TEXT,
    new_value   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_act_task  FOREIGN KEY (task_id)  REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_act_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX idx_act_task    ON activity_logs(task_id);
CREATE INDEX idx_act_actor   ON activity_logs(actor_id);
CREATE INDEX idx_act_created ON activity_logs(created_at);
```

### Backend Work — Enums

```file:backend/src/main/java/com/taskflowlite/domain/enums/Role.java
package com.taskflowlite.domain.enums;

public enum Role {
    ADMIN,
    MANAGER,
    MEMBER
}
```

```file:backend/src/main/java/com/taskflowlite/domain/enums/TeamRole.java
package com.taskflowlite.domain.enums;

public enum TeamRole {
    OWNER,
    MANAGER,
    MEMBER
}
```

```file:backend/src/main/java/com/taskflowlite/domain/enums/TaskStatus.java
package com.taskflowlite.domain.enums;

public enum TaskStatus {
    TODO,
    IN_PROGRESS,
    DONE
}
```

```file:backend/src/main/java/com/taskflowlite/domain/enums/TaskPriority.java
package com.taskflowlite.domain.enums;

public enum TaskPriority {
    LOW,
    MEDIUM,
    HIGH,
    URGENT
}
```

### Backend Work — JPA Entities

```file:backend/src/main/java/com/taskflowlite/domain/entity/UserEntity.java
package com.taskflowlite.domain.entity;

import com.taskflowlite.domain.enums.Role;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.MEMBER;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
```

```file:backend/src/main/java/com/taskflowlite/domain/entity/TeamEntity.java
package com.taskflowlite.domain.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "teams")
public class TeamEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private UserEntity owner;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public UserEntity getOwner() { return owner; }
    public void setOwner(UserEntity owner) { this.owner = owner; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
```

```file:backend/src/main/java/com/taskflowlite/domain/entity/TeamMemberEntity.java
package com.taskflowlite.domain.entity;

import com.taskflowlite.domain.enums.TeamRole;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "team_members",
       uniqueConstraints = @UniqueConstraint(name = "uk_tm_team_user", columnNames = {"team_id", "user_id"}))
public class TeamMemberEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private TeamEntity team;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_in_team", nullable = false, length = 20)
    private TeamRole roleInTeam = TeamRole.MEMBER;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private OffsetDateTime joinedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public TeamEntity getTeam() { return team; }
    public void setTeam(TeamEntity team) { this.team = team; }
    public UserEntity getUser() { return user; }
    public void setUser(UserEntity user) { this.user = user; }
    public TeamRole getRoleInTeam() { return roleInTeam; }
    public void setRoleInTeam(TeamRole roleInTeam) { this.roleInTeam = roleInTeam; }
    public OffsetDateTime getJoinedAt() { return joinedAt; }
}
```

```file:backend/src/main/java/com/taskflowlite/domain/entity/TaskEntity.java
package com.taskflowlite.domain.entity;

import com.taskflowlite.domain.enums.TaskPriority;
import com.taskflowlite.domain.enums.TaskStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "tasks")
public class TaskEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskStatus status = TaskStatus.TODO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskPriority priority = TaskPriority.MEDIUM;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private TeamEntity team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private UserEntity assignee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_id", nullable = false)
    private UserEntity createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

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
    public TeamEntity getTeam() { return team; }
    public void setTeam(TeamEntity team) { this.team = team; }
    public UserEntity getAssignee() { return assignee; }
    public void setAssignee(UserEntity assignee) { this.assignee = assignee; }
    public UserEntity getCreatedBy() { return createdBy; }
    public void setCreatedBy(UserEntity createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
```

```file:backend/src/main/java/com/taskflowlite/domain/entity/CommentEntity.java
package com.taskflowlite.domain.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "comments")
public class CommentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private TaskEntity task;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private UserEntity author;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public TaskEntity getTask() { return task; }
    public void setTask(TaskEntity task) { this.task = task; }
    public UserEntity getAuthor() { return author; }
    public void setAuthor(UserEntity author) { this.author = author; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
```

```file:backend/src/main/java/com/taskflowlite/domain/entity/ActivityLogEntity.java
package com.taskflowlite.domain.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "activity_logs")
public class ActivityLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private TaskEntity task;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id", nullable = false)
    private UserEntity actor;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(length = 50)
    private String field;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public TaskEntity getTask() { return task; }
    public void setTask(TaskEntity task) { this.task = task; }
    public UserEntity getActor() { return actor; }
    public void setActor(UserEntity actor) { this.actor = actor; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getField() { return field; }
    public void setField(String field) { this.field = field; }
    public String getOldValue() { return oldValue; }
    public void setOldValue(String oldValue) { this.oldValue = oldValue; }
    public String getNewValue() { return newValue; }
    public void setNewValue(String newValue) { this.newValue = newValue; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
```

### Backend Work — Spring Data Repositories

```file:backend/src/main/java/com/taskflowlite/domain/repository/UserRepository.java
package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByEmail(String email);
    Optional<UserEntity> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
}
```

```file:backend/src/main/java/com/taskflowlite/domain/repository/TeamRepository.java
package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.TeamEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<TeamEntity, Long> {
}
```

```file:backend/src/main/java/com/taskflowlite/domain/repository/TeamMemberRepository.java
package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.TeamMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamMemberRepository extends JpaRepository<TeamMemberEntity, Long> {
    List<TeamMemberEntity> findByTeamId(Long teamId);
    List<TeamMemberEntity> findByUserId(Long userId);
    Optional<TeamMemberEntity> findByTeamIdAndUserId(Long teamId, Long userId);
    boolean existsByTeamIdAndUserId(Long teamId, Long userId);
}
```

```file:backend/src/main/java/com/taskflowlite/domain/repository/TaskRepository.java
package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.TaskEntity;
import com.taskflowlite.domain.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface TaskRepository extends JpaRepository<TaskEntity, Long>, JpaSpecificationExecutor<TaskEntity> {
    List<TaskEntity> findByTeamId(Long teamId);
    List<TaskEntity> findByAssigneeId(Long assigneeId);
    List<TaskEntity> findByTeamIdAndAssigneeIsNull(Long teamId);
    long countByStatus(TaskStatus status);
    long countByTeamIdAndStatus(Long teamId, TaskStatus status);
}
```

```file:backend/src/main/java/com/taskflowlite/domain/repository/CommentRepository.java
package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.CommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<CommentEntity, Long> {
    List<CommentEntity> findByTaskIdOrderByCreatedAtAsc(Long taskId);
}
```

```file:backend/src/main/java/com/taskflowlite/domain/repository/ActivityLogRepository.java
package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.ActivityLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLogEntity, Long> {
    List<ActivityLogEntity> findByTaskIdOrderByCreatedAtAsc(Long taskId);
}
```

### Backend Work — application config (ensure Flyway + JPA)

```file:backend/src/main/resources/application.yml
spring:
  application:
    name: taskflowlite-backend
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/taskflowlite}
    username: ${SPRING_DATASOURCE_USERNAME:taskflowlite}
    password: ${SPRING_DATASOURCE_PASSWORD:***
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        jdbc:
          time_zone: UTC
        format_sql: false
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

server:
  port: ${SERVER_PORT:8080}

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when-authorized

logging:
  level:
    org.hibernate.SQL: INFO
    org.flywaydb: INFO
```

```file:backend/src/test/resources/application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:taskflowlite;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH
    username: sa
    password:
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
    properties:
      hibernate:
        dialect: org.hibernate.dialect.H2Dialect
  flyway:
    enabled: false
```

## Tests Required

```file:backend/src/test/java/com/taskflowlite/domain/repository/EntityPersistenceTest.java
package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.*;
import com.taskflowlite.domain.enums.Role;
import com.taskflowlite.domain.enums.TaskPriority;
import com.taskflowlite.domain.enums.TaskStatus;
import com.taskflowlite.domain.enums.TeamRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.yml")
class EntityPersistenceTest {

    @Autowired UserRepository users;
    @Autowired TeamRepository teams;
    @Autowired TeamMemberRepository teamMembers;
    @Autowired TaskRepository tasks;
    @Autowired CommentRepository comments;
    @Autowired ActivityLogRepository activity;

    @Test
    void persistsFullGraph() {
        UserEntity u = new UserEntity();
        u.setEmail("a@b.com");
        u.setUsername("alice");
        u.setPasswordHash("hash");
        u.setRole(Role.ADMIN);
        u = users.save(u);

        TeamEntity t = new TeamEntity();
        t.setName("Team A");
        t.setOwner(u);
        t = teams.save(t);

        TeamMemberEntity tm = new TeamMemberEntity();
        tm.setTeam(t);
        tm.setUser(u);
        tm.setRoleInTeam(TeamRole.OWNER);
        teamMembers.save(tm);

        TaskEntity task = new TaskEntity();
        task.setTitle("First Task");
        task.setStatus(TaskStatus.TODO);
        task.setPriority(TaskPriority.HIGH);
        task.setDueDate(LocalDate.now().plusDays(3));
        task.setTeam(t);
        task.setCreatedBy(u);
        task.setAssignee(u);
        task = tasks.save(task);

        CommentEntity c = new CommentEntity();
        c.setTask(task);
        c.setAuthor(u);
        c.setContent("hello");
        comments.save(c);

        ActivityLogEntity log = new ActivityLogEntity();
        log.setTask(task);
        log.setActor(u);
        log.setAction("CREATED");
        log.setField("status");
        log.setNewValue("TODO");
        activity.save(log);

        assertThat(users.findByEmail("a@b.com")).isPresent();
        assertThat(teamMembers.findByTeamIdAndUserId(t.getId(), u.getId())).isPresent();
        assertThat(tasks.findByAssigneeId(u.getId())).hasSize(1);
        assertThat(comments.findByTaskIdOrderByCreatedAtAsc(task.getId())).hasSize(1);
        assertThat(activity.findByTaskIdOrderByCreatedAtAsc(task.getId())).hasSize(1);
        assertThat(tasks.countByStatus(TaskStatus.TODO)).isEqualTo(1);
    }
}
```

## Validation Gates

| Gate | Status |
|------|--------|
| Flyway migration `V1__init_schema.sql` defines all 6 tables with FKs, indexes, check constraints | ✅ |
| JPA entities map 1:1 to schema with correct column names | ✅ |
| Enums for `Role`, `TeamRole`, `TaskStatus`, `TaskPriority` align with DB CHECK constraints | ✅ |
| Spring Data repositories provided per entity with key lookup methods | ✅ |
| `ddl-auto: validate` ensures entities match Flyway-generated schema at runtime | ✅ |
| `@DataJpaTest` covers full entity graph persistence | ✅ |
| Soft-delete strategy uses FK `ON DELETE` rules (CASCADE for comments/activity/team_members; SET NULL for assignee/team) | ✅ |
| `open-in-view: false` to avoid lazy-load anti-pattern in web layer | ✅ |

## Phase Completion Summary

- **Schema**: V1 Flyway migration creates `users`, `teams`, `team_members`, `tasks`, `comments`, `activity_logs` with proper FKs, unique constraints, enum CHECK constraints, and supporting indexes.
- **Entities**: JPA entities (`UserEntity`, `TeamEntity`, `TeamMemberEntity`, `TaskEntity`, `CommentEntity`, `ActivityLogEntity`) with `@CreationTimestamp`/`@UpdateTimestamp` auditing and `OffsetDateTime` for timezone safety.
- **Enums**: Strongly typed `Role`, `TeamRole`, `TaskStatus`, `TaskPriority`.
- **Repositories**: Spring Data JPA repositories for each aggregate with query methods needed by upcoming phases (auth, teams, tasks, comments, activity).
- **Configuration**: `application.yml` configured for Flyway migrations + `ddl-auto: validate` (schema-as-code). Test profile uses H2 in PostgreSQL mode.
- **Tests**: `EntityPersistenceTest` validates the full entity graph round-trip.

Ready for next phase: `health-endpoint`.