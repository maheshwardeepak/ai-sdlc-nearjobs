package com.taskflowlite.team.service;

import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.common.exception.ValidationException;
import com.taskflowlite.team.dto.AddMemberRequest;
import com.taskflowlite.team.dto.CreateTeamRequest;
import com.taskflowlite.team.dto.TeamMemberResponse;
import com.taskflowlite.team.dto.TeamResponse;
import com.taskflowlite.team.dto.UpdateTeamRequest;
import com.taskflowlite.team.entity.Team;
import com.taskflowlite.team.entity.TeamMember;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.user.entity.User;
import com.taskflowlite.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
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

    @Transactional
    public TeamResponse createTeam(CreateTeamRequest request, UUID ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Team team = new Team();
        team.setName(request.name().trim());
        team.setDescription(request.description());
        team.setOwnerId(ownerId);
        team.setCreatedAt(Instant.now());
        team.setUpdatedAt(Instant.now());
        team = teamRepository.save(team);

        // Owner is automatically a member
        TeamMember owningMember = new TeamMember();
        owningMember.setTeam(team);
        owningMember.setUserId(ownerId);
        owningMember.setRoleInTeam("OWNER");
        owningMember.setJoinedAt(Instant.now());
        teamMemberRepository.save(owningMember);

        return toResponse(team, owner.getUsername(), 1);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> listTeamsForUser(UUID userId) {
        return teamRepository.findAllForUser(userId).stream()
                .map(this::toResponseWithCounts)
                .toList();
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeam(UUID teamId, UUID requesterId) {
        Team team = requireTeam(teamId);
        ensureMember(teamId, requesterId);
        return toResponseWithCounts(team);
    }

    @Transactional
    public TeamResponse updateTeam(UUID teamId, UpdateTeamRequest request, UUID requesterId) {
        Team team = requireTeam(teamId);
        ensureOwner(team, requesterId);

        if (request.name() != null && !request.name().isBlank()) {
            team.setName(request.name().trim());
        }
        if (request.description() != null) {
            team.setDescription(request.description());
        }
        team.setUpdatedAt(Instant.now());
        team = teamRepository.save(team);
        return toResponseWithCounts(team);
    }

    @Transactional
    public void deleteTeam(UUID teamId, UUID requesterId) {
        Team team = requireTeam(teamId);
        ensureOwner(team, requesterId);
        teamRepository.delete(team);
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> listMembers(UUID teamId, UUID requesterId) {
        requireTeam(teamId);
        ensureMember(teamId, requesterId);

        return teamMemberRepository.findByTeam_Id(teamId).stream()
                .map(tm -> {
                    User user = userRepository.findById(tm.getUserId()).orElse(null);
                    return new TeamMemberResponse(
                            tm.getId(),
                            tm.getUserId(),
                            user != null ? user.getUsername() : "unknown",
                            user != null ? user.getEmail() : "",
                            tm.getRoleInTeam(),
                            tm.getJoinedAt()
                    );
                })
                .toList();
    }

    @Transactional
    public TeamMemberResponse addMember(UUID teamId, AddMemberRequest request, UUID requesterId) {
        Team team = requireTeam(teamId);
        ensureOwner(team, requesterId);

        User newMember = userRepository.findById(request.userId())
                .orElseThrow(() -> new NotFoundException("User to add not found"));

        if (teamMemberRepository.existsByTeam_IdAndUserId(teamId, request.userId())) {
            throw new ValidationException("User is already a member of this team");
        }

        TeamMember tm = new TeamMember();
        tm.setTeam(team);
        tm.setUserId(newMember.getId());
        tm.setRoleInTeam(request.roleInTeam() != null ? request.roleInTeam() : "MEMBER");
        tm.setJoinedAt(Instant.now());
        tm = teamMemberRepository.save(tm);

        return new TeamMemberResponse(
                tm.getId(),
                tm.getUserId(),
                newMember.getUsername(),
                newMember.getEmail(),
                tm.getRoleInTeam(),
                tm.getJoinedAt()
        );
    }

    @Transactional
    public void removeMember(UUID teamId, UUID memberUserId, UUID requesterId) {
        Team team = requireTeam(teamId);
        ensureOwner(team, requesterId);

        if (team.getOwnerId().equals(memberUserId)) {
            throw new ValidationException("Cannot remove team owner");
        }

        TeamMember tm = teamMemberRepository.findByTeam_IdAndUserId(teamId, memberUserId)
                .orElseThrow(() -> new NotFoundException("Member not found in this team"));
        teamMemberRepository.delete(tm);
    }

    public boolean isMember(UUID teamId, UUID userId) {
        return teamMemberRepository.existsByTeam_IdAndUserId(teamId, userId);
    }

    // ---------- helpers ----------

    private Team requireTeam(UUID teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));
    }

    private void ensureOwner(Team team, UUID userId) {
        if (!team.getOwnerId().equals(userId)) {
            throw new ForbiddenException("Only the team owner can perform this action");
        }
    }

    private void ensureMember(UUID teamId, UUID userId) {
        if (!teamMemberRepository.existsByTeam_IdAndUserId(teamId, userId)) {
            throw new ForbiddenException("You are not a member of this team");
        }
    }

    private TeamResponse toResponseWithCounts(Team team) {
        long count = teamMemberRepository.countByTeam_Id(team.getId());
        String ownerUsername = userRepository.findById(team.getOwnerId())
                .map(User::getUsername)
                .orElse("unknown");
        return toResponse(team, ownerUsername, (int) count);
    }

    private TeamResponse toResponse(Team team, String ownerUsername, int memberCount) {
        return new TeamResponse(
                team.getId(),
                team.getName(),
                team.getDescription(),
                team.getOwnerId(),
                ownerUsername,
                memberCount,
                team.getCreatedAt(),
                team.getUpdatedAt()
        );
    }
}