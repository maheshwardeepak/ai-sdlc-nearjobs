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
