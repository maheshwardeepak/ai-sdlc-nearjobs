package com.taskflowlite.team.controller;

import com.taskflowlite.team.dto.AddMemberRequest;
import com.taskflowlite.team.dto.CreateTeamRequest;
import com.taskflowlite.team.dto.TeamMemberResponse;
import com.taskflowlite.team.dto.TeamResponse;
import com.taskflowlite.team.dto.UpdateTeamRequest;
import com.taskflowlite.team.service.TeamService;
import com.taskflowlite.security.AuthenticatedUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @PostMapping
    public ResponseEntity<TeamResponse> createTeam(@Valid @RequestBody CreateTeamRequest request,
                                                   @AuthenticationPrincipal AuthenticatedUser principal) {
        TeamResponse response = teamService.createTeam(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public List<TeamResponse> listTeams(@AuthenticationPrincipal AuthenticatedUser principal) {
        return teamService.listTeamsForUser(principal.getId());
    }

    @GetMapping("/{id}")
    public TeamResponse getTeam(@PathVariable Long id,
                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return teamService.getTeam(id, principal.getId());
    }

    @PatchMapping("/{id}")
    public TeamResponse updateTeam(@PathVariable Long id,
                                   @Valid @RequestBody UpdateTeamRequest request,
                                   @AuthenticationPrincipal AuthenticatedUser principal) {
        return teamService.updateTeam(id, request, principal.getId());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeam(@PathVariable Long id,
                                           @AuthenticationPrincipal AuthenticatedUser principal) {
        teamService.deleteTeam(id, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/members")
    public List<TeamMemberResponse> listMembers(@PathVariable Long id,
                                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return teamService.listMembers(id, principal.getId());
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<TeamMemberResponse> addMember(@PathVariable Long id,
                                                        @Valid @RequestBody AddMemberRequest request,
                                                        @AuthenticationPrincipal AuthenticatedUser principal) {
        TeamMemberResponse response = teamService.addMember(id, request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long id,
                                             @PathVariable Long userId,
                                             @AuthenticationPrincipal AuthenticatedUser principal) {
        teamService.removeMember(id, userId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}