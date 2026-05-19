package com.taskflowlite.team.security;

import com.taskflowlite.domain.entity.TeamEntity;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.NotFoundException;
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
        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new ForbiddenException("User is not a member of this team");
        }
    }

    public void requireOwner(TeamEntity team, Long userId) {
        if (team.getOwnerId() == null || !team.getOwnerId().equals(userId)) {
            throw new ForbiddenException("Only the team owner can perform this action");
        }
    }

    public boolean isOwner(TeamEntity team, Long userId) {
        return team.getOwnerId() != null && team.getOwnerId().equals(userId);
    }

    public boolean isMember(Long teamId, Long userId) {
        return teamMemberRepository.existsByTeamIdAndUserId(teamId, userId);
    }
}