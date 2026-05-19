package com.taskflowlite.team.service;

import com.taskflowlite.common.exception.ConflictException;
import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.common.exception.ValidationException;
import com.taskflowlite.domain.entity.TeamEntity;
import com.taskflowlite.domain.entity.TeamMemberEntity;
import com.taskflowlite.domain.entity.UserEntity;
import com.taskflowlite.domain.enums.TeamRole;
import com.taskflowlite.domain.repository.UserRepository;
import com.taskflowlite.team.dto.AddMemberRequest;
import com.taskflowlite.team.dto.CreateTeamRequest;
import com.taskflowlite.team.dto.TeamMemberResponse;
import com.taskflowlite.team.dto.TeamResponse;
import com.taskflowlite.team.dto.UpdateTeamRequest;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.team.security.TeamSecurity;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final TeamSecurity teamSecurity;

    public TeamService(TeamRepository teamRepository,
                       TeamMemberRepository teamMemberRepository,
                       UserRepository userRepository,
                       TeamSecurity teamSecurity) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.userRepository = userRepository;
        this.teamSecurity = teamSecurity;
    }

    public TeamResponse createTeam(CreateTeamRequest request, Long ownerId) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ValidationException("Team name is required");
        }
        if (teamRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw new ConflictException("Team name already exists");
        }
        UserEntity owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new NotFoundException("Owner user not found"));

        TeamEntity team = new TeamEntity();
        team.setName(request.getName().trim());
        team.setDescription(request.getDescription());
        team.setOwnerId(ownerId);
        team.setCreatedAt(Instant.now());
        team.setUpdatedAt(Instant.now());
        team = teamRepository.save(team);

        TeamMemberEntity membership = new TeamMemberEntity();
        membership.setTeam(team);
        membership.setUser(owner);
        membership.setRoleInTeam(TeamRole.OWNER);
        membership.setJoinedAt(Instant.now());
        teamMemberRepository.save(membership);

        return toResponse(team, 1);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> listTeamsForUser(Long userId) {
        List<TeamEntity> teams = teamRepository.findTeamsForUser(userId);
        List<TeamResponse> result = new ArrayList<>();
        for (TeamEntity team : teams) {
            long count = teamMemberRepository.countByTeamId(team.getId());
            result.add(toResponse(team, (int) count));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeam(Long teamId, Long requestingUserId) {
        TeamEntity team = teamSecurity.requireTeam(teamId);
        teamSecurity.requireMember(teamId, requestingUserId);
        long count = teamMemberRepository.countByTeamId(teamId);
        return toResponse(team, (int) count);
    }

    public TeamResponse updateTeam(Long teamId, UpdateTeamRequest request, Long requestingUserId) {
        TeamEntity team = teamSecurity.requireTeam(teamId);
        teamSecurity.requireOwner(team, requestingUserId);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            String trimmed = request.getName().trim();
            if (!trimmed.equalsIgnoreCase(team.getName())
                    && teamRepository.existsByNameIgnoreCase(trimmed)) {
                throw new ConflictException("Team name already exists");
            }
            team.setName(trimmed);
        }
        if (request.getDescription() != null) {
            team.setDescription(request.getDescription());
        }
        team.setUpdatedAt(Instant.now());
        team = teamRepository.save(team);

        long count = teamMemberRepository.countByTeamId(teamId);
        return toResponse(team, (int) count);
    }

    public void deleteTeam(Long teamId, Long requestingUserId) {
        TeamEntity team = teamSecurity.requireTeam(teamId);
        teamSecurity.requireOwner(team, requestingUserId);
        teamRepository.delete(team);
    }

    public TeamMemberResponse addMember(Long teamId, AddMemberRequest request, Long requestingUserId) {
        TeamEntity team = teamSecurity.requireTeam(teamId);
        teamSecurity.requireOwner(team, requestingUserId);

        if (request.getUserId() == null) {
            throw new ValidationException("userId is required");
        }
        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found: " + request.getUserId()));

        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, user.getId())) {
            throw new ConflictException("User is already a member");
        }

        TeamRole role = TeamRole.MEMBER;
        if (request.getRoleInTeam() != null && !request.getRoleInTeam().isBlank()) {
            try {
                role = TeamRole.valueOf(request.getRoleInTeam().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new ValidationException("Invalid roleInTeam: " + request.getRoleInTeam());
            }
        }

        TeamMemberEntity membership = new TeamMemberEntity();
        membership.setTeam(team);
        membership.setUser(user);
        membership.setRoleInTeam(role);
        membership.setJoinedAt(Instant.now());
        membership = teamMemberRepository.save(membership);

        return toMemberResponse(membership);
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> listMembers(Long teamId, Long requestingUserId) {
        teamSecurity.requireTeam(teamId);
        teamSecurity.requireMember(teamId, requestingUserId);
        List<TeamMemberEntity> members = teamMemberRepository.findByTeamId(teamId);
        List<TeamMemberResponse> result = new ArrayList<>();
        for (TeamMemberEntity m : members) {
            result.add(toMemberResponse(m));
        }
        return result;
    }

    public void removeMember(Long teamId, Long userId, Long requestingUserId) {
        TeamEntity team = teamSecurity.requireTeam(teamId);
        teamSecurity.requireOwner(team, requestingUserId);
        if (team.getOwnerId() != null && team.getOwnerId().equals(userId)) {
            throw new ForbiddenException("Cannot remove the team owner");
        }
        TeamMemberEntity membership = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new NotFoundException("Membership not found"));
        teamMemberRepository.delete(membership);
    }

    private TeamResponse toResponse(TeamEntity team, int memberCount) {
        return new TeamResponse(
                team.getId(),
                team.getName(),
                team.getDescription(),
                team.getOwnerId(),
                team.getCreatedAt(),
                team.getUpdatedAt(),
                memberCount
        );
    }

    private TeamMemberResponse toMemberResponse(TeamMemberEntity m) {
        UserEntity u = m.getUser();
        return new TeamMemberResponse(
                m.getId(),
                m.getTeam() != null ? m.getTeam().getId() : null,
                u != null ? u.getId() : null,
                u != null ? u.getUsername() : null,
                u != null ? u.getEmail() : null,
                m.getRoleInTeam() != null ? m.getRoleInTeam().name() : null,
                m.getJoinedAt()
        );
    }
}