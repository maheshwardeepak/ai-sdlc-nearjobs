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
