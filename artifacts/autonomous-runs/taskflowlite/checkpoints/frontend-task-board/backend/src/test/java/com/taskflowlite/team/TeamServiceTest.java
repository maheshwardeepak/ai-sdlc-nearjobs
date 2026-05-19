package com.taskflowlite.team;

import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.ValidationException;
import com.taskflowlite.team.dto.AddMemberRequest;
import com.taskflowlite.team.dto.CreateTeamRequest;
import com.taskflowlite.team.dto.TeamMemberResponse;
import com.taskflowlite.team.dto.TeamResponse;
import com.taskflowlite.team.service.TeamService;
import com.taskflowlite.user.entity.User;
import com.taskflowlite.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class TeamServiceTest {

    @Autowired private TeamService teamService;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private User owner;
    private User other;

    @BeforeEach
    void setUp() {
        owner = createUser("owner-" + UUID.randomUUID(), "owner@example.com");
        other = createUser("user-" + UUID.randomUUID(), "user@example.com");
    }

    private User createUser(String username, String email) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode("secret123"));
        u.setRole("MEMBER");
        u.setCreatedAt(Instant.now());
        u.setUpdatedAt(Instant.now());
        return userRepository.save(u);
    }

    @Test
    void createTeam_addsOwnerAsMember() {
        TeamResponse t = teamService.createTeam(
                new CreateTeamRequest("Alpha Team", "desc"), owner.getId());
        assertThat(t.id()).isNotNull();
        assertThat(t.ownerId()).isEqualTo(owner.getId());
        assertThat(t.memberCount()).isEqualTo(1);
    }

    @Test
    void listTeams_returnsTeamsUserOwnsOrBelongsTo() {
        TeamResponse t = teamService.createTeam(
                new CreateTeamRequest("Bravo", null), owner.getId());
        teamService.addMember(t.id(), new AddMemberRequest(other.getId(), "MEMBER"), owner.getId());

        assertThat(teamService.listTeamsForUser(owner.getId())).hasSize(1);
        assertThat(teamService.listTeamsForUser(other.getId())).hasSize(1);
    }

    @Test
    void getTeam_nonMember_isForbidden() {
        TeamResponse t = teamService.createTeam(
                new CreateTeamRequest("Charlie", null), owner.getId());
        assertThatThrownBy(() -> teamService.getTeam(t.id(), other.getId()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void addMember_byNonOwner_isForbidden() {
        TeamResponse t = teamService.createTeam(
                new CreateTeamRequest("Delta", null), owner.getId());
        teamService.addMember(t.id(), new AddMemberRequest(other.getId(), "MEMBER"), owner.getId());
        User third = createUser("third-" + UUID.randomUUID(), "third@example.com");

        assertThatThrownBy(() ->
                teamService.addMember(t.id(), new AddMemberRequest(third.getId(), "MEMBER"), other.getId()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void addMember_duplicate_throwsValidation() {
        TeamResponse t = teamService.createTeam(
                new CreateTeamRequest("Echo", null), owner.getId());
        teamService.addMember(t.id(), new AddMemberRequest(other.getId(), "MEMBER"), owner.getId());

        assertThatThrownBy(() ->
                teamService.addMember(t.id(), new AddMemberRequest(other.getId(), "MEMBER"), owner.getId()))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void removeMember_ownerCannotBeRemoved() {
        TeamResponse t = teamService.createTeam(
                new CreateTeamRequest("Foxtrot", null), owner.getId());
        assertThatThrownBy(() -> teamService.removeMember(t.id(), owner.getId(), owner.getId()))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void removeMember_byOwner_succeeds() {
        TeamResponse t = teamService.createTeam(
                new CreateTeamRequest("Golf", null), owner.getId());
        teamService.addMember(t.id(), new AddMemberRequest(other.getId(), "MEMBER"), owner.getId());

        teamService.removeMember(t.id(), other.getId(), owner.getId());
        List<TeamMemberResponse> members = teamService.listMembers(t.id(), owner.getId());
        assertThat(members).hasSize(1);
        assertThat(members.get(0).userId()).isEqualTo(owner.getId());
    }

    @Test
    void deleteTeam_byNonOwner_isForbidden() {
        TeamResponse t = teamService.createTeam(
                new CreateTeamRequest("Hotel", null), owner.getId());
        assertThatThrownBy(() -> teamService.deleteTeam(t.id(), other.getId()))
                .isInstanceOf(ForbiddenException.class);
    }
}