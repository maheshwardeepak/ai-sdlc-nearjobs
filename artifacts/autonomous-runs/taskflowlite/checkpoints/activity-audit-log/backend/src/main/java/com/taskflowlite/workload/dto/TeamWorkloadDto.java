package com.taskflowlite.workload.dto;

import java.util.List;

public class TeamWorkloadDto {
    private Long teamId;
    private String teamName;
    private long unassignedOpenTasks;
    private List<MemberWorkloadDto> members;

    public TeamWorkloadDto() {}

    public TeamWorkloadDto(Long teamId, String teamName,
                           long unassignedOpenTasks, List<MemberWorkloadDto> members) {
        this.teamId = teamId;
        this.teamName = teamName;
        this.unassignedOpenTasks = unassignedOpenTasks;
        this.members = members;
    }

    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }
    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }
    public long getUnassignedOpenTasks() { return unassignedOpenTasks; }
    public void setUnassignedOpenTasks(long u) { this.unassignedOpenTasks = u; }
    public List<MemberWorkloadDto> getMembers() { return members; }
    public void setMembers(List<MemberWorkloadDto> members) { this.members = members; }
}