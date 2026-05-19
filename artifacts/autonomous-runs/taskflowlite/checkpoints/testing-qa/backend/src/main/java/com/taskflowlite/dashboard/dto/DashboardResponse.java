package com.taskflowlite.dashboard.dto;

import java.util.Map;

public class DashboardResponse {
    private long totalTasks;
    private Map<String, Long> countsByStatus;
    private Map<String, Long> countsByPriority;
    private long overdueTasks;
    private long unassignedTasks;
    private long dueSoonTasks;
    private Long teamId;
    private String teamName;

    public DashboardResponse() {}

    public long getTotalTasks() { return totalTasks; }
    public void setTotalTasks(long totalTasks) { this.totalTasks = totalTasks; }

    public Map<String, Long> getCountsByStatus() { return countsByStatus; }
    public void setCountsByStatus(Map<String, Long> countsByStatus) { this.countsByStatus = countsByStatus; }

    public Map<String, Long> getCountsByPriority() { return countsByPriority; }
    public void setCountsByPriority(Map<String, Long> countsByPriority) { this.countsByPriority = countsByPriority; }

    public long getOverdueTasks() { return overdueTasks; }
    public void setOverdueTasks(long overdueTasks) { this.overdueTasks = overdueTasks; }

    public long getUnassignedTasks() { return unassignedTasks; }
    public void setUnassignedTasks(long unassignedTasks) { this.unassignedTasks = unassignedTasks; }

    public long getDueSoonTasks() { return dueSoonTasks; }
    public void setDueSoonTasks(long dueSoonTasks) { this.dueSoonTasks = dueSoonTasks; }

    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }

    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }
}