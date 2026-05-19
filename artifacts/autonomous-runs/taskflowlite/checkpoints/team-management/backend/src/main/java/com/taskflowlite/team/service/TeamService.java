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

// ===== AI MERGE APPEND =====

package com.taskflowlite.team.service;

import com.taskflowlite.common.exception.ConflictException;
import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.common.exception.ValidationException;
import com.taskflowlite.domain.entity.TeamEntity;
import com.taskflowlite.domain.entity.TeamMemberEntity;
import com.taskflowlite.team.dto.AddMemberRequest;
import com.taskflowlite.team.dto.CreateTeamRequest;
import com.taskflowlite.team.dto.TeamMemberResponse;
import com.taskflowlite.team.dto.TeamResponse;
import com.taskflowlite.team.dto.UpdateTeamRequest;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.user.User;
import com.taskflowlite.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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
        TeamEntity team = new TeamEntity();
        team.setId(UUID.randomUUID());
        team.setName(request.getName());
        team.setDescription(request.getDescription());
        team.setOwnerId(ownerId);
        Instant now = Instant.now();
        team.setCreatedAt(now);
        team.setUpdatedAt(now);
        TeamEntity saved = teamRepository.save(team);

        // Auto-add owner as a member
        TeamMemberEntity ownerMember = new TeamMemberEntity();
        ownerMember.setId(UUID.randomUUID());
        ownerMember.setTeamId(saved.getId());
        ownerMember.setUserId(ownerId);
        ownerMember.setRoleInTeam("OWNER");
        ownerMember.setJoinedAt(now);
        teamMemberRepository.save(ownerMember);

        return toTeamResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> listTeamsForUser(UUID userId) {
        return teamRepository.findAllForUser(userId).stream()
                .map(this::toTeamResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeam(UUID teamId, UUID requesterId) {
        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));
        if (!isMemberOrOwner(team, requesterId)) {
            throw new ForbiddenException("Not a member of this team");
        }
        return toTeamResponse(team);
    }

    @Transactional
    public TeamResponse updateTeam(UUID teamId, UpdateTeamRequest request, UUID requesterId) {
        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));
        if (!team.getOwnerId().equals(requesterId)) {
            throw new ForbiddenException("Only the owner can update the team");
        }
        if (request.getName() != null && !request.getName().isBlank()) {
            team.setName(request.getName());
        }
        if (request.getDescription() != null) {
            team.setDescription(request.getDescription());
        }
        team.setUpdatedAt(Instant.now());
        return toTeamResponse(teamRepository.save(team));
    }

    @Transactional
    public void deleteTeam(UUID teamId, UUID requesterId) {
        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));
        if (!team.getOwnerId().equals(requesterId)) {
            throw new ForbiddenException("Only the owner can delete the team");
        }
        teamRepository.delete(team);
    }

    @Transactional
    public TeamMemberResponse addMember(UUID teamId, AddMemberRequest request, UUID requesterId) {
        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));
        if (!team.getOwnerId().equals(requesterId)) {
            throw new ForbiddenException("Only the owner can add members");
        }
        if (request.getUserId() == null) {
            throw new ValidationException("userId is required");
        }
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found: " + request.getUserId()));
        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, user.getId())) {
            throw new ConflictException("User is already a member of this team");
        }

        TeamMemberEntity member = new TeamMemberEntity();
        member.setId(UUID.randomUUID());
        member.setTeamId(teamId);
        member.setUserId(user.getId());
        member.setRoleInTeam(request.getRoleInTeam() != null ? request.getRoleInTeam() : "MEMBER");
        member.setJoinedAt(Instant.now());
        TeamMemberEntity saved = teamMemberRepository.save(member);

        return toTeamMemberResponse(saved, user);
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> listMembers(UUID teamId, UUID requesterId) {
        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));
        if (!isMemberOrOwner(team, requesterId)) {
            throw new ForbiddenException("Not a member of this team");
        }
        List<TeamMemberEntity> members = teamMemberRepository.findByTeamId(teamId);
        return members.stream().map(m -> {
            User user = userRepository.findById(m.getUserId()).orElse(null);
            return toTeamMemberResponse(m, user);
        }).collect(Collectors.toList());
    }

    @Transactional
    public void removeMember(UUID teamId, UUID userId, UUID requesterId) {
        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));
        if (!team.getOwnerId().equals(requesterId)) {
            throw new ForbiddenException("Only the owner can remove members");
        }
        if (team.getOwnerId().equals(userId)) {
            throw new ValidationException("Cannot remove team owner");
        }
        TeamMemberEntity member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new NotFoundException("Member not found in team"));
        teamMemberRepository.delete(member);
    }

    private boolean isMemberOrOwner(TeamEntity team, UUID userId) {
        if (team.getOwnerId().equals(userId)) {
            return true;
        }
        return teamMemberRepository.existsByTeamIdAndUserId(team.getId(), userId);
    }

    private TeamResponse toTeamResponse(TeamEntity team) {
        return new TeamResponse(
                team.getId(),
                team.getName(),
                team.getDescription(),
                team.getOwnerId(),
                team.getCreatedAt(),
                team.getUpdatedAt()
        );
    }

    private TeamMemberResponse toTeamMemberResponse(TeamMemberEntity member, User user) {
        return new TeamMemberResponse(
                member.getId(),
                member.getTeamId(),
                member.getUserId(),
                user != null ? user.getUsername() : null,
                user != null ? user.getEmail() : null,
                member.getRoleInTeam(),
                member.getJoinedAt()
        );
    }
}

// ===== AI MERGE APPEND =====

package com.taskflowlite.team.service;

import com.taskflowlite.common.exception.ConflictException;
import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.domain.entity.TeamEntity;
import com.taskflowlite.domain.entity.TeamMemberEntity;
import com.taskflowlite.team.dto.AddMemberRequest;
import com.taskflowlite.team.dto.CreateTeamRequest;
import com.taskflowlite.team.dto.TeamMemberResponse;
import com.taskflowlite.team.dto.TeamResponse;
import com.taskflowlite.team.dto.UpdateTeamRequest;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.team.security.TeamSecurity;
import com.taskflowlite.user.User;
import com.taskflowlite.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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

    public TeamResponse create(CreateTeamRequest request, Long ownerId) {
        TeamEntity team = new TeamEntity();
        team.setName(request.getName());
        team.setDescription(request.getDescription());
        team.setOwnerId(ownerId);
        Instant now = Instant.now();
        team.setCreatedAt(now);
        team.setUpdatedAt(now);
        TeamEntity saved = teamRepository.save(team);

        // Add owner as member
        if (!teamMemberRepository.existsByTeamIdAndUserId(saved.getId(), ownerId)) {
            TeamMemberEntity member = new TeamMemberEntity();
            member.setTeamId(saved.getId());
            member.setUserId(ownerId);
            member.setRoleInTeam("OWNER");
            member.setJoinedAt(now);
            teamMemberRepository.save(member);
        }

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> listForUser(Long userId) {
        List<TeamResponse> result = new ArrayList<>();
        for (TeamEntity t : teamRepository.findTeamsForUser(userId)) {
            result.add(toResponse(t));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public TeamResponse get(Long teamId, Long userId) {
        teamSecurity.requireMember(teamId, userId);
        TeamEntity team = teamSecurity.requireTeam(teamId);
        return toResponse(team);
    }

    public TeamResponse update(Long teamId, UpdateTeamRequest request, Long userId) {
        teamSecurity.requireOwner(teamId, userId);
        TeamEntity team = teamSecurity.requireTeam(teamId);
        if (request.getName() != null) {
            team.setName(request.getName());
        }
        if (request.getDescription() != null) {
            team.setDescription(request.getDescription());
        }
        team.setUpdatedAt(Instant.now());
        return toResponse(teamRepository.save(team));
    }

    public void delete(Long teamId, Long userId) {
        teamSecurity.requireOwner(teamId, userId);
        teamRepository.deleteById(teamId);
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> listMembers(Long teamId, Long userId) {
        teamSecurity.requireMember(teamId, userId);
        List<TeamMemberResponse> result = new ArrayList<>();
        for (TeamMemberEntity m : teamMemberRepository.findByTeamId(teamId)) {
            result.add(toMemberResponse(m));
        }
        return result;
    }

    public TeamMemberResponse addMember(Long teamId, AddMemberRequest request, Long userId) {
        teamSecurity.requireOwner(teamId, userId);
        teamSecurity.requireTeam(teamId);

        if (!userRepository.existsById(request.getUserId())) {
            throw new NotFoundException("User not found: " + request.getUserId());
        }
        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, request.getUserId())) {
            throw new ConflictException("User is already a member of team " + teamId);
        }

        TeamMemberEntity member = new TeamMemberEntity();
        member.setTeamId(teamId);
        member.setUserId(request.getUserId());
        member.setRoleInTeam(request.getRoleInTeam() == null ? "MEMBER" : request.getRoleInTeam());
        member.setJoinedAt(Instant.now());
        return toMemberResponse(teamMemberRepository.save(member));
    }

    public void removeMember(Long teamId, Long memberUserId, Long actorUserId) {
        teamSecurity.requireOwner(teamId, actorUserId);
        TeamEntity team = teamSecurity.requireTeam(teamId);
        if (team.getOwnerId() != null && team.getOwnerId().equals(memberUserId)) {
            throw new com.taskflowlite.common.exception.ValidationException("Cannot remove team owner");
        }
        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, memberUserId)) {
            throw new NotFoundException("Member not found in team " + teamId);
        }
        teamMemberRepository.deleteByTeamIdAndUserId(teamId, memberUserId);
    }

    private TeamResponse toResponse(TeamEntity t) {
        return new TeamResponse(
                t.getId(),
                t.getName(),
                t.getDescription(),
                t.getOwnerId(),
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }

    private TeamMemberResponse toMemberResponse(TeamMemberEntity m) {
        String username = null;
        String email = null;
        User u = userRepository.findById(m.getUserId()).orElse(null);
        if (u != null) {
            username = u.getUsername();
            email = u.getEmail();
        }
        return new TeamMemberResponse(
                m.getId(),
                m.getTeamId(),
                m.getUserId(),
                username,
                email,
                m.getRoleInTeam(),
                m.getJoinedAt()
        );
    }
}