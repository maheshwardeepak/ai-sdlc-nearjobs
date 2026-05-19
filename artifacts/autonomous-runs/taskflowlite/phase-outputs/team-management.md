model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Team Management & Membership Phase Execution

## Analysis

The prior attempt failed with compilation errors indicating files contained duplicated content (classes appended multiple times to the same file). I will produce clean, single-class-per-file artifacts for all team management components.

## Files to Create

### Backend Work

```file:backend/src/main/java/com/taskflowlite/common/exception/ForbiddenException.java
package com.taskflowlite.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
```

```file:backend/src/main/java/com/taskflowlite/common/exception/ValidationException.java
package com.taskflowlite.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ValidationException extends RuntimeException {
    public ValidationException(String message) {
        super(message);
    }
}
```

```file:backend/src/main/java/com/taskflowlite/team/dto/CreateTeamRequest.java
package com.taskflowlite.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateTeamRequest {

    @NotBlank
    @Size(max = 120)
    private String name;

    @Size(max = 1000)
    private String description;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
```

```file:backend/src/main/java/com/taskflowlite/team/dto/UpdateTeamRequest.java
package com.taskflowlite.team.dto;

import jakarta.validation.constraints.Size;

public class UpdateTeamRequest {

    @Size(max = 120)
    private String name;

    @Size(max = 1000)
    private String description;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
```

```file:backend/src/main/java/com/taskflowlite/team/dto/AddMemberRequest.java
package com.taskflowlite.team.dto;

import jakarta.validation.constraints.NotNull;

public class AddMemberRequest {

    @NotNull
    private Long userId;

    private String roleInTeam;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getRoleInTeam() {
        return roleInTeam;
    }

    public void setRoleInTeam(String roleInTeam) {
        this.roleInTeam = roleInTeam;
    }
}
```

```file:backend/src/main/java/com/taskflowlite/team/dto/TeamResponse.java
package com.taskflowlite.team.dto;

import java.time.Instant;

public class TeamResponse {
    private Long id;
    private String name;
    private String description;
    private Long ownerId;
    private Instant createdAt;
    private Instant updatedAt;

    public TeamResponse() {}

    public TeamResponse(Long id, String name, String description, Long ownerId, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.ownerId = ownerId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
```

```file:backend/src/main/java/com/taskflowlite/team/dto/TeamMemberResponse.java
package com.taskflowlite.team.dto;

import java.time.Instant;

public class TeamMemberResponse {
    private Long id;
    private Long teamId;
    private Long userId;
    private String username;
    private String email;
    private String roleInTeam;
    private Instant joinedAt;

    public TeamMemberResponse() {}

    public TeamMemberResponse(Long id, Long teamId, Long userId, String username, String email, String roleInTeam, Instant joinedAt) {
        this.id = id;
        this.teamId = teamId;
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.roleInTeam = roleInTeam;
        this.joinedAt = joinedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRoleInTeam() { return roleInTeam; }
    public void setRoleInTeam(String roleInTeam) { this.roleInTeam = roleInTeam; }
    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
}
```

```file:backend/src/main/java/com/taskflowlite/team/repository/TeamRepository.java
package com.taskflowlite.team.repository;

import com.taskflowlite.domain.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, Long> {

    @Query("SELECT DISTINCT t FROM Team t LEFT JOIN TeamMember m ON m.team = t " +
           "WHERE t.ownerId = :userId OR m.userId = :userId")
    List<Team> findTeamsForUser(@Param("userId") Long userId);
}
```

```file:backend/src/main/java/com/taskflowlite/team/repository/TeamMemberRepository.java
package com.taskflowlite.team.repository;

import com.taskflowlite.domain.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {

    List<TeamMember> findByTeamId(Long teamId);

    Optional<TeamMember> findByTeamIdAndUserId(Long teamId, Long userId);

    boolean existsByTeamIdAndUserId(Long teamId, Long userId);

    void deleteByTeamIdAndUserId(Long teamId, Long userId);
}
```

```file:backend/src/main/java/com/taskflowlite/team/security/TeamSecurity.java
package com.taskflowlite.team.security;

import com.taskflowlite.domain.entity.Team;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("teamSecurity")
public class TeamSecurity {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    public TeamSecurity(TeamRepository teamRepository, TeamMemberRepository teamMemberRepository) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
    }

    public boolean isMember(Long teamId, Long userId) {
        if (teamId == null || userId == null) return false;
        Team team = teamRepository.findById(teamId).orElse(null);
        if (team == null) return false;
        if (team.getOwnerId() != null && team.getOwnerId().equals(userId)) return true;
        return teamMemberRepository.existsByTeamIdAndUserId(teamId, userId);
    }

    public boolean isOwner(Long teamId, Long userId) {
        if (teamId == null || userId == null) return false;
        return teamRepository.findById(teamId)
                .map(t -> userId.equals(t.getOwnerId()))
                .orElse(false);
    }

    public boolean canManage(Authentication auth, Long teamId) {
        if (auth == null || teamId == null) return false;
        if (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return true;
        }
        Long userId = extractUserId(auth);
        return isOwner(teamId, userId);
    }

    public boolean canView(Authentication auth, Long teamId) {
        if (auth == null || teamId == null) return false;
        if (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return true;
        }
        Long userId = extractUserId(auth);
        return isMember(teamId, userId);
    }

    private Long extractUserId(Authentication auth) {
        Object principal = auth.getPrincipal();
        if (principal instanceof com.taskflowlite.auth.security.UserPrincipal up) {
            return up.getId();
        }
        return null;
    }
}
```

```file:backend/src/main/java/com/taskflowlite/team/service/TeamService.java
package com.taskflowlite.team.service;

import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.ValidationException;
import com.taskflowlite.domain.entity.Team;
import com.taskflowlite.domain.entity.TeamMember;
import com.taskflowlite.domain.entity.User;
import com.taskflowlite.domain.repository.UserRepository;
import com.taskflowlite.team.dto.AddMemberRequest;
import com.taskflowlite.team.dto.CreateTeamRequest;
import com.taskflowlite.team.dto.TeamMemberResponse;
import com.taskflowlite.team.dto.TeamResponse;
import com.taskflowlite.team.dto.UpdateTeamRequest;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    public TeamService(TeamRepository teamRepository,
                       TeamMemberRepository teamMemberRepository,
                       UserRepository userRepository) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.userRepository = userRepository;
    }

    public TeamResponse createTeam(CreateTeamRequest request, Long ownerId) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new ValidationException("Team name is required");
        }
        Team team = new Team();
        team.setName(request.getName().trim());
        team.setDescription(request.getDescription());
        team.setOwnerId(ownerId);
        team.setCreatedAt(Instant.now());
        team.setUpdatedAt(Instant.now());
        Team saved = teamRepository.save(team);

        // Auto-add owner as a team member
        TeamMember owner = new TeamMember();
        owner.setTeam(saved);
        owner.setUserId(ownerId);
        owner.setRoleInTeam("OWNER");
        owner.setJoinedAt(Instant.now());
        teamMemberRepository.save(owner);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> listTeamsForUser(Long userId) {
        return teamRepository.findTeamsForUser(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeam(Long teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId));
        return toResponse(team);
    }

    public TeamResponse updateTeam(Long teamId, UpdateTeamRequest request, Long actorId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId));
        if (!team.getOwnerId().equals(actorId)) {
            throw new ForbiddenException("Only owner can update team");
        }
        if (request.getName() != null && !request.getName().isBlank()) {
            team.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            team.setDescription(request.getDescription());
        }
        team.setUpdatedAt(Instant.now());
        return toResponse(teamRepository.save(team));
    }

    public void deleteTeam(Long teamId, Long actorId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId));
        if (!team.getOwnerId().equals(actorId)) {
            throw new ForbiddenException("Only owner can delete team");
        }
        teamRepository.delete(team);
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> listMembers(Long teamId) {
        return teamMemberRepository.findByTeamId(teamId).stream()
                .map(this::toMemberResponse)
                .collect(Collectors.toList());
    }

    public TeamMemberResponse addMember(Long teamId, AddMemberRequest request, Long actorId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId));
        if (!team.getOwnerId().equals(actorId)) {
            throw new ForbiddenException("Only owner can add members");
        }
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + request.getUserId()));

        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, user.getId())) {
            throw new ValidationException("User is already a member of this team");
        }

        TeamMember member = new TeamMember();
        member.setTeam(team);
        member.setUserId(user.getId());
        member.setRoleInTeam(request.getRoleInTeam() != null ? request.getRoleInTeam() : "MEMBER");
        member.setJoinedAt(Instant.now());
        TeamMember saved = teamMemberRepository.save(member);
        return toMemberResponse(saved);
    }

    public void removeMember(Long teamId, Long userId, Long actorId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId));
        if (!team.getOwnerId().equals(actorId)) {
            throw new ForbiddenException("Only owner can remove members");
        }
        if (team.getOwnerId().equals(userId)) {
            throw new ValidationException("Cannot remove team owner");
        }
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found"));
        teamMemberRepository.delete(member);
    }

    private TeamResponse toResponse(Team t) {
        return new TeamResponse(t.getId(), t.getName(), t.getDescription(), t.getOwnerId(),
                t.getCreatedAt(), t.getUpdatedAt());
    }

    private TeamMemberResponse toMemberResponse(TeamMember m) {
        User u = userRepository.findById(m.getUserId()).orElse(null);
        return new TeamMemberResponse(
                m.getId(),
                m.getTeam() != null ? m.getTeam().getId() : null,
                m.getUserId(),
                u != null ? u.getUsername() : null,
                u != null ? u.getEmail() : null,
                m.getRoleInTeam(),
                m.getJoinedAt()
        );
    }
}
```

```file:backend/src/main/java/com/taskflowlite/team/controller/TeamController.java
package com.taskflowlite.team.controller;

import com.taskflowlite.auth.security.UserPrincipal;
import com.taskflowlite.team.dto.AddMemberRequest;
import com.taskflowlite.team.dto.CreateTeamRequest;
import com.taskflowlite.team.dto.TeamMemberResponse;
import com.taskflowlite.team.dto.TeamResponse;
import com.taskflowlite.team.dto.UpdateTeamRequest;
import com.taskflowlite.team.service.TeamService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @PostMapping
    public ResponseEntity<TeamResponse> createTeam(@Valid @RequestBody CreateTeamRequest request,
                                                   @AuthenticationPrincipal UserPrincipal principal) {
        TeamResponse response = teamService.createTeam(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<TeamResponse>> listTeams(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(teamService.listTeamsForUser(principal.getId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @teamSecurity.isMember(#id, principal.id)")
    public ResponseEntity<TeamResponse> getTeam(@PathVariable("id") Long id) {
        return ResponseEntity.ok(teamService.getTeam(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TeamResponse> updateTeam(@PathVariable("id") Long id,
                                                   @Valid @RequestBody UpdateTeamRequest request,
                                                   @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(teamService.updateTeam(id, request, principal.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeam(@PathVariable("id") Long id,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        teamService.deleteTeam(id, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/members")
    @PreAuthorize("hasRole('ADMIN') or @teamSecurity.isMember(#id, principal.id)")
    public ResponseEntity<List<TeamMemberResponse>> listMembers(@PathVariable("id") Long id) {
        return ResponseEntity.ok(teamService.listMembers(id));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<TeamMemberResponse> addMember(@PathVariable("id") Long id,
                                                        @Valid @RequestBody AddMemberRequest request,
                                                        @AuthenticationPrincipal UserPrincipal principal) {
        TeamMemberResponse response = teamService.addMember(id, request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable("id") Long id,
                                             @PathVariable("userId") Long userId,
                                             @AuthenticationPrincipal UserPrincipal principal) {
        teamService.removeMember(id, userId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
```

### Tests Required

```file:backend/src/test/java/com/taskflowlite/team/service/TeamServiceTest.java
package com.taskflowlite.team.service;

import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.ValidationException;
import com.taskflowlite.domain.entity.Team;
import com.taskflowlite.domain.entity.TeamMember;
import com.taskflowlite.domain.entity.User;
import com.taskflowlite.domain.repository.UserRepository;
import com.taskflowlite.team.dto.AddMemberRequest;
import com.taskflowlite.team.dto.CreateTeamRequest;
import com.taskflowlite.team.dto.TeamResponse;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @Mock TeamRepository teamRepository;
    @Mock TeamMemberRepository teamMemberRepository;
    @Mock UserRepository userRepository;
    @InjectMocks TeamService teamService;

    private Team team;

    @BeforeEach
    void setUp() {
        team = new Team();
        team.setId(1L);
        team.setName("Alpha");
        team.setOwnerId(10L);
    }

    @Test
    void createTeamSavesAndAddsOwnerMember() {
        CreateTeamRequest req = new CreateTeamRequest();
        req.setName("Alpha");
        when(teamRepository.save(any(Team.class))).thenAnswer(inv -> {
            Team t = inv.getArgument(0);
            t.setId(1L);
            return t;
        });

        TeamResponse resp = teamService.createTeam(req, 10L);

        assertNotNull(resp);
        assertEquals("Alpha", resp.getName());
        verify(teamMemberRepository).save(any(TeamMember.class));
    }

    @Test
    void updateTeamThrowsForNonOwner() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        var update = new com.taskflowlite.team.dto.UpdateTeamRequest();
        update.setName("New");
        assertThrows(ForbiddenException.class, () -> teamService.updateTeam(1L, update, 99L));
    }

    @Test
    void addMemberRejectsDuplicate() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        User u = new User();
        u.setId(20L);
        when(userRepository.findById(20L)).thenReturn(Optional.of(u));
        when(teamMemberRepository.existsByTeamIdAndUserId(1L, 20L)).thenReturn(true);

        AddMemberRequest req = new AddMemberRequest();
        req.setUserId(20L);

        assertThrows(ValidationException.class, () -> teamService.addMember(1L, req, 10L));
    }

    @Test
    void removeMemberRejectsOwnerRemoval() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        assertThrows(ValidationException.class, () -> teamService.removeMember(1L, 10L, 10L));
    }
}
```

## Validation Gates

- **Compile**: Each Java file contains exactly one top-level class/interface (no duplicate appended content).
- **Build**: `mvn -q clean package` succeeds.
- **Unit Tests**: TeamServiceTest passes covering create, update authz, duplicate add rejection, owner removal protection.
- **Security**: Team access enforced via `@teamSecurity.isMember` and owner-only mutations in service layer.
- **API Contract**: All endpoints from plan implemented — POST/GET `/api/teams`, GET `/api/teams/{id}`, POST/DELETE `/api/teams/{id}/members/{userId}`.

## Phase Completion Summary

Implemented Team Management & Membership with clean, single-class file artifacts to resolve the prior compilation failure caused by duplicated class declarations:

- **DTOs**: `CreateTeamRequest`, `UpdateTeamRequest`, `AddMemberRequest`, `TeamResponse`, `TeamMemberResponse`
- **Repositories**: `TeamRepository` (with `findTeamsForUser` query), `TeamMemberRepository`
- **Security**: `TeamSecurity` component with `isMember`, `isOwner`, `canManage`, `canView` for SpEL `@teamSecurity` authorization
- **Service**: `TeamService` with CRUD, owner auto-membership, member add/remove with ownership checks and duplicate protection
- **Controller**: `TeamController` exposing all team management endpoints with `@PreAuthorize` and `@AuthenticationPrincipal`
- **Exceptions**: `ForbiddenException`, `ValidationException` for clean error mapping
- **Tests**: `TeamServiceTest` covering happy path and authorization edge cases

Phase ready for build convergence and downstream consumers (tasks scoped to teams).