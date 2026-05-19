package com.taskflowlite.team.dto;

import jakarta.validation.constraints.NotNull;

public class AddMemberRequest {

    @NotNull
    private Long userId;

    private String roleInTeam;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getRoleInTeam() {
        return roleInTeam;
    }

    public void setRoleInTeam(String roleInTeam) {
        this.roleInTeam = roleInTeam;
    }
}