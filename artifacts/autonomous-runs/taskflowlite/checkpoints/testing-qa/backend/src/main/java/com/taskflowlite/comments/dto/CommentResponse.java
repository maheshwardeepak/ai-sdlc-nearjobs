package com.taskflowlite.comments.dto;

import java.time.Instant;
import java.util.UUID;

public class CommentResponse {

    private UUID id;
    private UUID taskId;
    private UUID authorId;
    private String authorUsername;
    private String content;
    private Instant createdAt;
    private Instant updatedAt;

    public CommentResponse() {
    }

    public CommentResponse(UUID id, UUID taskId, UUID authorId, String authorUsername,
                           String content, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.taskId = taskId;
        this.authorId = authorId;
        this.authorUsername = authorUsername;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTaskId() { return taskId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }

    public UUID getAuthorId() { return authorId; }
    public void setAuthorId(UUID authorId) { this.authorId = authorId; }

    public String getAuthorUsername() { return authorUsername; }
    public void setAuthorUsername(String authorUsername) { this.authorUsername = authorUsername; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}