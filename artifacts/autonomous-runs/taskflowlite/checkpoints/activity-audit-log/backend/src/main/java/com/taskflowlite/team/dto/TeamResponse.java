package com.taskflowlite.team.dto;

import java.time.Instant;
import java.util.UUID;

public record TeamResponse(
        UUID id,
        String name,
        String description,
        UUID ownerId,
        String ownerUsername,
        int memberCount,
        Instant createdAt,
        Instant updatedAt
) {
}