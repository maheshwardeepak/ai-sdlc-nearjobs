package com.taskflowlite.team.controller;

import com.taskflowlite.security.CurrentUser;
import com.taskflowlite.security.UserPrincipal;
import com.taskflowlite.team.dto.AddMemberRequest;
import com.taskflowlite.team.dto.CreateTeamRequest;
import com.taskflowlite.team.dto.TeamMemberResponse;
import com.taskflowlite.team.dto.TeamResponse;
import com.taskflowlite.team.dto.UpdateTeamRequest;
import com.taskflowlite.team.service.TeamService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/teams")
@PreAuthorize("isAuthenticated()")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeamResponse create(@Valid @RequestBody CreateTeamRequest req,
                               @CurrentUser UserPrincipal principal) {
        return teamService.createTeam(req, principal.getId());
    }

    @GetMapping
    public List<TeamResponse> listMyTeams(@CurrentUser UserPrincipal principal) {
        return teamService.listTeamsForUser(principal.getId());
    }

    @GetMapping("/{id}")
    public TeamResponse get(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        return teamService.getTeam(id, principal.getId());
    }

    @PatchMapping("/{id}")
    public TeamResponse update(@PathVariable UUID id,
                               @Valid @RequestBody UpdateTeamRequest req,
                               @CurrentUser UserPrincipal principal) {
        return teamService.updateTeam(id, req, principal.getId());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        teamService.deleteTeam(id, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/members")
    public List<TeamMemberResponse> listMembers(@PathVariable UUID id,
                                                @CurrentUser UserPrincipal principal) {
        return teamService.listMembers(id, principal.getId());
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public TeamMemberResponse addMember(@PathVariable UUID id,
                                        @Valid @RequestBody AddMemberRequest req,
                                        @CurrentUser UserPrincipal principal) {
        return teamService.addMember(id, req, principal.getId());
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID id,
                                             @PathVariable UUID userId,
                                             @CurrentUser UserPrincipal principal) {
        teamService.removeMember(id, userId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}