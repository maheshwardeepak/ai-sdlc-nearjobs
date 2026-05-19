package com.taskflowlite.workload.dto;

public class MemberWorkloadDto {
    private Long userId;
    private String username;
    private String email;
    private long todo;
    private long inProgress;
    private long done;
    private long openTasks; // todo + inProgress
    private long totalTasks;

    public MemberWorkloadDto() {}

    public MemberWorkloadDto(Long userId, String username, String email,
                             long todo, long inProgress, long done) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.todo = todo;
        this.inProgress = inProgress;
        this.done = done;
        this.openTasks = todo + inProgress;
        this.totalTasks = todo + inProgress + done;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public long getTodo() { return todo; }
    public void setTodo(long todo) { this.todo = todo; }
    public long getInProgress() { return inProgress; }
    public void setInProgress(long inProgress) { this.inProgress = inProgress; }
    public long getDone() { return done; }
    public void setDone(long done) { this.done = done; }
    public long getOpenTasks() { return openTasks; }
    public void setOpenTasks(long openTasks) { this.openTasks = openTasks; }
    public long getTotalTasks() { return totalTasks; }
    public void setTotalTasks(long totalTasks) { this.totalTasks = totalTasks; }
}
