package com.taskflowlite.task.dto;

public class AssigneeUpdateRequest {
    private Long assigneeId; // null means unassign

    public AssigneeUpdateRequest() {}

    public Long getAssigneeId() { return assigneeId; }
    public void setAssigneeId(Long assigneeId) { this.assigneeId = assigneeId; }
}