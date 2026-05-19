package com.taskflowlite.team.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddMemberRequest(
        @NotNull(message = "userId is required")
        UUID userId,

        String roleInTeam
) {
}

// ===== AI MERGE APPEND =====

package com.taskflowlite.team.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class AddMemberRequest {

    @NotNull
    private UUID userId;

    private String roleInTeam;

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getRoleInTeam() {
        return roleInTeam;
    }

    public void setRoleInTeam(String roleInTeam) {
        this.roleInTeam = roleInTeam;
    }
}

// ===== AI MERGE APPEND =====

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