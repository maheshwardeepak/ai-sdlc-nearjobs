package com.taskflowlite.team.dto;

import jakarta.validation.constraints.Size;

public record UpdateTeamRequest(
        @Size(min = 2, max = 100, message = "Team name must be between 2 and 100 characters")
        String name,

        @Size(max = 500, message = "Description must be at most 500 characters")
        String description
) {
}