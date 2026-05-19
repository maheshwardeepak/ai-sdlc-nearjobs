package com.taskflowlite.team.dto;

import java.time.Instant;
import java.util.UUID;

public record TeamMemberResponse(
        UUID id,
        UUID userId,
        String username,
        String email,
        String roleInTeam,
        Instant joinedAt
) {
}