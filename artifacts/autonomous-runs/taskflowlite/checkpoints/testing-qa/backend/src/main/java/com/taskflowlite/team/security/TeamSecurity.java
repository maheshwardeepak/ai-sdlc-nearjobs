package com.taskflowlite.team.security;

import com.taskflowlite.team.service.TeamService;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Helper bean usable from @PreAuthorize expressions to enforce team membership.
 * Example: @PreAuthorize("@teamSecurity.isMember(#teamId, principal.id)")
 */
@Component("teamSecurity")
public class TeamSecurity {

    private final TeamService teamService;

    public TeamSecurity(TeamService teamService) {
        this.teamService = teamService;
    }

    public boolean isMember(UUID teamId, UUID userId) {
        if (teamId == null || userId == null) return false;
        return teamService.isMember(teamId, userId);
    }
}