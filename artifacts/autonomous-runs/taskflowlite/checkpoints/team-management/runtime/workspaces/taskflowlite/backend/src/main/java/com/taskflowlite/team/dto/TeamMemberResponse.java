package com.taskflowlite.team.dto;

import java.time.Instant;

public class TeamMemberResponse {

    private Long id;
    private Long teamId;
    private Long userId;
    private String username;
    private String email;
    private String roleInTeam;
    private Instant joinedAt;

    public TeamMemberResponse() {
    }

    public TeamMemberResponse(Long id, Long teamId, Long userId, String username,
                              String email, String roleInTeam, Instant joinedAt) {
        this.id = id;
        this.teamId = teamId;
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.roleInTeam = roleInTeam;
        this.joinedAt = joinedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRoleInTeam() { return roleInTeam; }
    public void setRoleInTeam(String roleInTeam) { this.roleInTeam = roleInTeam; }
    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
}