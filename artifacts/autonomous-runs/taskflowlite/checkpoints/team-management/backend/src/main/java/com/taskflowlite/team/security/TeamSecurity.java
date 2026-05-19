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

// ===== AI MERGE APPEND =====

package com.taskflowlite.team.security;

import com.taskflowlite.domain.entity.TeamEntity;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class TeamSecurity {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    public TeamSecurity(TeamRepository teamRepository, TeamMemberRepository teamMemberRepository) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
    }

    public boolean isMemberOrOwner(UUID teamId, UUID userId) {
        if (teamId == null || userId == null) {
            return false;
        }
        return teamRepository.findById(teamId)
                .map(team -> team.getOwnerId().equals(userId)
                        || teamMemberRepository.existsByTeamIdAndUserId(teamId, userId))
                .orElse(false);
    }

    public boolean isOwner(UUID teamId, UUID userId) {
        if (teamId == null || userId == null) {
            return false;
        }
        return teamRepository.findById(teamId)
                .map(team -> team.getOwnerId().equals(userId))
                .orElse(false);
    }

    public TeamEntity requireTeam(UUID teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new com.taskflowlite.common.exception.NotFoundException("Team not found: " + teamId));
    }
}

// ===== AI MERGE APPEND =====

package com.taskflowlite.team.security;

import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.domain.entity.TeamEntity;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import org.springframework.stereotype.Component;

@Component
public class TeamSecurity {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    public TeamSecurity(TeamRepository teamRepository, TeamMemberRepository teamMemberRepository) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
    }

    public TeamEntity requireTeam(Long teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));
    }

    public void requireMember(Long teamId, Long userId) {
        TeamEntity team = requireTeam(teamId);
        if (team.getOwnerId() != null && team.getOwnerId().equals(userId)) {
            return;
        }
        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new ForbiddenException("Not a member of team " + teamId);
        }
    }

    public void requireOwner(Long teamId, Long userId) {
        TeamEntity team = requireTeam(teamId);
        if (team.getOwnerId() == null || !team.getOwnerId().equals(userId)) {
            throw new ForbiddenException("Only the team owner can perform this action");
        }
    }

    public boolean isOwner(Long teamId, Long userId) {
        return teamRepository.findById(teamId)
                .map(t -> t.getOwnerId() != null && t.getOwnerId().equals(userId))
                .orElse(false);
    }
}