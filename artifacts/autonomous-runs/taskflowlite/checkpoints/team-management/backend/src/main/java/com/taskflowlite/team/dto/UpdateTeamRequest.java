package com.taskflowlite.team.dto;

import jakarta.validation.constraints.Size;

public record UpdateTeamRequest(
        @Size(min = 2, max = 100, message = "Team name must be between 2 and 100 characters")
        String name,

        @Size(max = 500, message = "Description must be at most 500 characters")
        String description
) {
}

// ===== AI MERGE APPEND =====

package com.taskflowlite.team.dto;

import jakarta.validation.constraints.Size;

public class UpdateTeamRequest {

    @Size(max = 120)
    private String name;

    @Size(max = 1000)
    private String description;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}