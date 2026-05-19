package com.taskflowlite.user.dto;

import com.taskflowlite.user.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(@NotNull Role role) {}