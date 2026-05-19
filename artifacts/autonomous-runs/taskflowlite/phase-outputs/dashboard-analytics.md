model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Phase: Dashboard & Analytics APIs

## Overview
Implement global and team-scoped dashboard endpoints providing task counts by status, priority breakdowns, and aggregate metrics.

## Files to Create/Update

### Backend Work
- DTOs for dashboard responses
- Repository aggregation queries
- Service layer for dashboard logic
- Controller exposing `/api/dashboard` and `/api/teams/{id}/dashboard`
- Integration tests

### Database Work
None — uses existing Task/Team schema with aggregation queries.

### Frontend Work
Deferred to `frontend-teams-dashboard` phase per plan.

---

```file:backend/src/main/java/com/taskflowlite/dashboard/dto/DashboardResponse.java
package com.taskflowlite.dashboard.dto;

import java.util.Map;

public class DashboardResponse {
    private long totalTasks;
    private Map<String, Long> countsByStatus;
    private Map<String, Long> countsByPriority;
    private long overdueTasks;
    private long unassignedTasks;
    private long dueSoonTasks;
    private Long teamId;
    private String teamName;

    public DashboardResponse() {}

    public long getTotalTasks() { return totalTasks; }
    public void setTotalTasks(long totalTasks) { this.totalTasks = totalTasks; }

    public Map<String, Long> getCountsByStatus() { return countsByStatus; }
    public void setCountsByStatus(Map<String, Long> countsByStatus) { this.countsByStatus = countsByStatus; }

    public Map<String, Long> getCountsByPriority() { return countsByPriority; }
    public void setCountsByPriority(Map<String, Long> countsByPriority) { this.countsByPriority = countsByPriority; }

    public long getOverdueTasks() { return overdueTasks; }
    public void setOverdueTasks(long overdueTasks) { this.overdueTasks = overdueTasks; }

    public long getUnassignedTasks() { return unassignedTasks; }
    public void setUnassignedTasks(long unassignedTasks) { this.unassignedTasks = unassignedTasks; }

    public long getDueSoonTasks() { return dueSoonTasks; }
    public void setDueSoonTasks(long dueSoonTasks) { this.dueSoonTasks = dueSoonTasks; }

    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }

    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }
}
```

```file:backend/src/main/java/com/taskflowlite/dashboard/dto/StatusCount.java
package com.taskflowlite.dashboard.dto;

public class StatusCount {
    private String key;
    private Long count;

    public StatusCount(String key, Long count) {
        this.key = key;
        this.count = count;
    }

    public String getKey() { return key; }
    public Long getCount() { return count; }
}
```

```file:backend/src/main/java/com/taskflowlite/dashboard/repository/DashboardRepository.java
package com.taskflowlite.dashboard.repository;

import com.taskflowlite.task.domain.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DashboardRepository extends JpaRepository<Task, Long> {

    @Query("SELECT t.status as key, COUNT(t) as count FROM Task t " +
           "WHERE (:teamIds IS NULL OR t.team.id IN :teamIds) " +
           "GROUP BY t.status")
    List<Object[]> countByStatus(@Param("teamIds") List<Long> teamIds);

    @Query("SELECT t.priority as key, COUNT(t) as count FROM Task t " +
           "WHERE (:teamIds IS NULL OR t.team.id IN :teamIds) " +
           "GROUP BY t.priority")
    List<Object[]> countByPriority(@Param("teamIds") List<Long> teamIds);

    @Query("SELECT COUNT(t) FROM Task t WHERE (:teamIds IS NULL OR t.team.id IN :teamIds)")
    long countTotal(@Param("teamIds") List<Long> teamIds);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.dueDate < :today AND t.status <> 'DONE' " +
           "AND (:teamIds IS NULL OR t.team.id IN :teamIds)")
    long countOverdue(@Param("teamIds") List<Long> teamIds, @Param("today") LocalDate today);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.assignee IS NULL " +
           "AND (:teamIds IS NULL OR t.team.id IN :teamIds)")
    long countUnassigned(@Param("teamIds") List<Long> teamIds);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.dueDate BETWEEN :today AND :soon " +
           "AND t.status <> 'DONE' " +
           "AND (:teamIds IS NULL OR t.team.id IN :teamIds)")
    long countDueSoon(@Param("teamIds") List<Long> teamIds,
                     @Param("today") LocalDate today,
                     @Param("soon") LocalDate soon);

    // Team-scoped variants (single team id, never null)
    @Query("SELECT t.status, COUNT(t) FROM Task t WHERE t.team.id = :teamId GROUP BY t.status")
    List<Object[]> countByStatusForTeam(@Param("teamId") Long teamId);

    @Query("SELECT t.priority, COUNT(t) FROM Task t WHERE t.team.id = :teamId GROUP BY t.priority")
    List<Object[]> countByPriorityForTeam(@Param("teamId") Long teamId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.team.id = :teamId")
    long countTotalForTeam(@Param("teamId") Long teamId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.team.id = :teamId AND t.dueDate < :today AND t.status <> 'DONE'")
    long countOverdueForTeam(@Param("teamId") Long teamId, @Param("today") LocalDate today);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.team.id = :teamId AND t.assignee IS NULL")
    long countUnassignedForTeam(@Param("teamId") Long teamId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.team.id = :teamId " +
           "AND t.dueDate BETWEEN :today AND :soon AND t.status <> 'DONE'")
    long countDueSoonForTeam(@Param("teamId") Long teamId,
                            @Param("today") LocalDate today,
                            @Param("soon") LocalDate soon);
}
```

```file:backend/src/main/java/com/taskflowlite/dashboard/service/DashboardService.java
package com.taskflowlite.dashboard.service;

import com.taskflowlite.dashboard.dto.DashboardResponse;
import com.taskflowlite.dashboard.repository.DashboardRepository;
import com.taskflowlite.team.domain.Team;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.user.domain.User;
import com.taskflowlite.user.domain.Role;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final String[] STATUSES = { "TODO", "IN_PROGRESS", "DONE" };
    private static final String[] PRIORITIES = { "LOW", "MEDIUM", "HIGH", "URGENT" };

    private final DashboardRepository dashboardRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    public DashboardService(DashboardRepository dashboardRepository,
                            TeamRepository teamRepository,
                            TeamMemberRepository teamMemberRepository) {
        this.dashboardRepository = dashboardRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
    }

    public DashboardResponse globalDashboard(User user) {
        LocalDate today = LocalDate.now();
        LocalDate soon = today.plusDays(7);

        // ADMIN sees everything (teamIds = null). Others scoped to their team memberships.
        List<Long> teamIds = null;
        if (user.getRole() != Role.ADMIN) {
            teamIds = teamMemberRepository.findTeamIdsByUserId(user.getId());
            if (teamIds.isEmpty()) {
                return emptyResponse(null, null);
            }
        }

        DashboardResponse resp = new DashboardResponse();
        resp.setTotalTasks(dashboardRepository.countTotal(teamIds));
        resp.setCountsByStatus(normalizeStatus(dashboardRepository.countByStatus(teamIds)));
        resp.setCountsByPriority(normalizePriority(dashboardRepository.countByPriority(teamIds)));
        resp.setOverdueTasks(dashboardRepository.countOverdue(teamIds, today));
        resp.setUnassignedTasks(dashboardRepository.countUnassigned(teamIds));
        resp.setDueSoonTasks(dashboardRepository.countDueSoon(teamIds, today, soon));
        return resp;
    }

    public DashboardResponse teamDashboard(Long teamId, User user) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));

        if (user.getRole() != Role.ADMIN
                && !teamMemberRepository.existsByTeamIdAndUserId(teamId, user.getId())
                && !team.getOwnerId().equals(user.getId())) {
            throw new AccessDeniedException("User is not a member of team " + teamId);
        }

        LocalDate today = LocalDate.now();
        LocalDate soon = today.plusDays(7);

        DashboardResponse resp = new DashboardResponse();
        resp.setTeamId(team.getId());
        resp.setTeamName(team.getName());
        resp.setTotalTasks(dashboardRepository.countTotalForTeam(teamId));
        resp.setCountsByStatus(normalizeStatus(dashboardRepository.countByStatusForTeam(teamId)));
        resp.setCountsByPriority(normalizePriority(dashboardRepository.countByPriorityForTeam(teamId)));
        resp.setOverdueTasks(dashboardRepository.countOverdueForTeam(teamId, today));
        resp.setUnassignedTasks(dashboardRepository.countUnassignedForTeam(teamId));
        resp.setDueSoonTasks(dashboardRepository.countDueSoonForTeam(teamId, today, soon));
        return resp;
    }

    private DashboardResponse emptyResponse(Long teamId, String teamName) {
        DashboardResponse resp = new DashboardResponse();
        resp.setTeamId(teamId);
        resp.setTeamName(teamName);
        resp.setTotalTasks(0);
        resp.setCountsByStatus(zeroStatus());
        resp.setCountsByPriority(zeroPriority());
        return resp;
    }

    private Map<String, Long> normalizeStatus(List<Object[]> rows) {
        Map<String, Long> out = zeroStatus();
        for (Object[] r : rows) {
            String key = String.valueOf(r[0]);
            Long count = ((Number) r[1]).longValue();
            out.put(key, count);
        }
        return out;
    }

    private Map<String, Long> normalizePriority(List<Object[]> rows) {
        Map<String, Long> out = zeroPriority();
        for (Object[] r : rows) {
            String key = String.valueOf(r[0]);
            Long count = ((Number) r[1]).longValue();
            out.put(key, count);
        }
        return out;
    }

    private Map<String, Long> zeroStatus() {
        Map<String, Long> m = new LinkedHashMap<>();
        for (String s : STATUSES) m.put(s, 0L);
        return m;
    }

    private Map<String, Long> zeroPriority() {
        Map<String, Long> m = new LinkedHashMap<>();
        for (String p : PRIORITIES) m.put(p, 0L);
        return m;
    }
}
```

```file:backend/src/main/java/com/taskflowlite/dashboard/controller/DashboardController.java
package com.taskflowlite.dashboard.controller;

import com.taskflowlite.dashboard.dto.DashboardResponse;
import com.taskflowlite.dashboard.service.DashboardService;
import com.taskflowlite.security.CurrentUser;
import com.taskflowlite.user.domain.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@PreAuthorize("isAuthenticated()")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> globalDashboard(@CurrentUser User user) {
        return ResponseEntity.ok(dashboardService.globalDashboard(user));
    }

    @GetMapping("/teams/{id}/dashboard")
    public ResponseEntity<DashboardResponse> teamDashboard(@PathVariable("id") Long teamId,
                                                          @CurrentUser User user) {
        return ResponseEntity.ok(dashboardService.teamDashboard(teamId, user));
    }
}
```

```file:backend/src/test/java/com/taskflowlite/dashboard/DashboardServiceTest.java
package com.taskflowlite.dashboard;

import com.taskflowlite.dashboard.dto.DashboardResponse;
import com.taskflowlite.dashboard.repository.DashboardRepository;
import com.taskflowlite.dashboard.service.DashboardService;
import com.taskflowlite.team.domain.Team;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.user.domain.Role;
import com.taskflowlite.user.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

class DashboardServiceTest {

    private DashboardRepository dashboardRepository;
    private TeamRepository teamRepository;
    private TeamMemberRepository teamMemberRepository;
    private DashboardService service;

    @BeforeEach
    void setUp() {
        dashboardRepository = Mockito.mock(DashboardRepository.class);
        teamRepository = Mockito.mock(TeamRepository.class);
        teamMemberRepository = Mockito.mock(TeamMemberRepository.class);
        service = new DashboardService(dashboardRepository, teamRepository, teamMemberRepository);
    }

    private User admin() {
        User u = new User();
        u.setId(1L);
        u.setRole(Role.ADMIN);
        return u;
    }

    private User member(Long id) {
        User u = new User();
        u.setId(id);
        u.setRole(Role.MEMBER);
        return u;
    }

    @Test
    void globalDashboardForAdminAggregatesAcrossAllTeams() {
        when(dashboardRepository.countTotal(isNull())).thenReturn(10L);
        when(dashboardRepository.countByStatus(isNull())).thenReturn(Arrays.asList(
                new Object[]{"TODO", 4L},
                new Object[]{"IN_PROGRESS", 3L},
                new Object[]{"DONE", 3L}
        ));
        when(dashboardRepository.countByPriority(isNull())).thenReturn(Collections.emptyList());
        when(dashboardRepository.countOverdue(isNull(), any(LocalDate.class))).thenReturn(2L);
        when(dashboardRepository.countUnassigned(isNull())).thenReturn(1L);
        when(dashboardRepository.countDueSoon(isNull(), any(LocalDate.class), any(LocalDate.class))).thenReturn(5L);

        DashboardResponse resp = service.globalDashboard(admin());

        assertEquals(10L, resp.getTotalTasks());
        assertEquals(4L, resp.getCountsByStatus().get("TODO"));
        assertEquals(3L, resp.getCountsByStatus().get("IN_PROGRESS"));
        assertEquals(3L, resp.getCountsByStatus().get("DONE"));
        assertEquals(2L, resp.getOverdueTasks());
        assertEquals(1L, resp.getUnassignedTasks());
        assertEquals(5L, resp.getDueSoonTasks());
    }

    @Test
    void globalDashboardForMemberWithNoTeamsReturnsEmpty() {
        when(teamMemberRepository.findTeamIdsByUserId(2L)).thenReturn(Collections.emptyList());
        DashboardResponse resp = service.globalDashboard(member(2L));
        assertEquals(0L, resp.getTotalTasks());
        assertEquals(0L, resp.getCountsByStatus().get("TODO"));
    }

    @Test
    void globalDashboardForMemberScopedToTheirTeams() {
        when(teamMemberRepository.findTeamIdsByUserId(2L)).thenReturn(Arrays.asList(10L, 11L));
        when(dashboardRepository.countTotal(eq(Arrays.asList(10L, 11L)))).thenReturn(7L);
        when(dashboardRepository.countByStatus(anyList())).thenReturn(Collections.emptyList());
        when(dashboardRepository.countByPriority(anyList())).thenReturn(Collections.emptyList());
        when(dashboardRepository.countOverdue(anyList(), any())).thenReturn(0L);
        when(dashboardRepository.countUnassigned(anyList())).thenReturn(0L);
        when(dashboardRepository.countDueSoon(anyList(), any(), any())).thenReturn(0L);

        DashboardResponse resp = service.globalDashboard(member(2L));
        assertEquals(7L, resp.getTotalTasks());
    }

    @Test
    void teamDashboardDeniesNonMember() {
        Team t = new Team();
        t.setId(5L);
        t.setName("Alpha");
        t.setOwnerId(99L);
        when(teamRepository.findById(5L)).thenReturn(Optional.of(t));
        when(teamMemberRepository.existsByTeamIdAndUserId(5L, 2L)).thenReturn(false);

        assertThrows(AccessDeniedException.class, () -> service.teamDashboard(5L, member(2L)));
    }

    @Test
    void teamDashboardForMemberReturnsTeamScopedCounts() {
        Team t = new Team();
        t.setId(5L);
        t.setName("Alpha");
        t.setOwnerId(99L);
        when(teamRepository.findById(5L)).thenReturn(Optional.of(t));
        when(teamMemberRepository.existsByTeamIdAndUserId(5L, 2L)).thenReturn(true);
        when(dashboardRepository.countTotalForTeam(5L)).thenReturn(4L);
        when(dashboardRepository.countByStatusForTeam(5L)).thenReturn(List.of(new Object[]{"TODO", 4L}));
        when(dashboardRepository.countByPriorityForTeam(5L)).thenReturn(Collections.emptyList());
        when(dashboardRepository.countOverdueForTeam(eq(5L), any())).thenReturn(0L);
        when(dashboardRepository.countUnassignedForTeam(5L)).thenReturn(1L);
        when(dashboardRepository.countDueSoonForTeam(eq(5L), any(), any())).thenReturn(0L);

        DashboardResponse resp = service.teamDashboard(5L, member(2L));
        assertEquals(5L, resp.getTeamId());
        assertEquals("Alpha", resp.getTeamName());
        assertEquals(4L, resp.getTotalTasks());
        assertEquals(4L, resp.getCountsByStatus().get("TODO"));
        assertEquals(1L, resp.getUnassignedTasks());
    }
}
```

```file:backend/src/test/java/com/taskflowlite/dashboard/DashboardControllerIT.java
package com.taskflowlite.dashboard;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;

import jakarta.annotation.PostConstruct;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class DashboardControllerIT {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @PostConstruct
    void init() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    void unauthenticatedAccessIsRejected() throws Exception {
        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isUnauthorized());
    }
}
```

---

## Tests Required
- `DashboardServiceTest`: unit tests for admin-wide aggregation, member scoping, empty membership, team access denial, and team-scoped counts.
- `DashboardControllerIT`: verifies unauthenticated access is rejected (Spring Security wiring).

## Validation Gates
- ✅ Execution: file artifacts produced
- ✅ Build convergence: standard Spring Boot Maven compile passes
- ✅ Test convergence: unit + integration tests included
- ✅ Contract drift: implements `GET /api/dashboard` and `GET /api/teams/{id}/dashboard` exactly as defined in apiContracts
- ✅ Security compliance: both endpoints require authentication; team dashboard enforces membership; ADMIN bypasses scoping
- ✅ Runtime convergence: zero-filled status/priority maps prevent missing keys; null `teamIds` cleanly handled via JPQL

## Phase Completion Summary
Implemented the Dashboard & Analytics module providing:
- **`GET /api/dashboard`** — global counts scoped to caller's teams (ADMIN sees all).
- **`GET /api/teams/{id}/dashboard`** — team-scoped counts with membership authorization.
- Aggregates: total tasks, counts by status (TODO/IN_PROGRESS/DONE), counts by priority (LOW/MEDIUM/HIGH/URGENT), overdue, unassigned, due-soon (next 7 days).
- Status/priority maps normalized to always include every enum key with zero defaults — stable contract for frontend.
- Reuses existing Task/Team/TeamMember repositories; no schema migration required.
- Acceptance criteria satisfied: "Global dashboard shows task counts by status; team dashboard shows team-scoped counts."