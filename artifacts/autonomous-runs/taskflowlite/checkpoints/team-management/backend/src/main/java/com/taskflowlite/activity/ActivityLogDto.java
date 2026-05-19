package com.taskflowlite.activity;

import java.time.Instant;

public record ActivityLogDto(
        Long id,
        Long taskId,
        Long actorId,
        String actorUsername,
        String action,
        String field,
        String oldValue,
        String newValue,
        Instant createdAt
) {
    public static ActivityLogDto from(ActivityLog log) {
        return new ActivityLogDto(
                log.getId(),
                log.getTask() != null ? log.getTask().getId() : null,
                log.getActor() != null ? log.getActor().getId() : null,
                log.getActor() != null ? log.getActor().getUsername() : null,
                log.getAction().name(),
                log.getField(),
                log.getOldValue(),
                log.getNewValue(),
                log.getCreatedAt()
        );
    }
}
