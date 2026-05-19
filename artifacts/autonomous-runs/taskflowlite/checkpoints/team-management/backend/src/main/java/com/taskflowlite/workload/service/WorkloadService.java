package com.taskflowlite.workload.service;

import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.task.entity.TaskStatus;
import com.taskflowlite.task.repository.TaskRepository;
import com.taskflowlite.team.entity.Team;
import com.taskflowlite.team.entity.TeamMember;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.user.entity.User;
import com.taskflowlite.user.repository.UserRepository;
import com.taskflowlite.workload.dto.MemberWorkloadDto;
import com.taskflowlite.workload.dto.TeamWorkloadDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class WorkloadService {

    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    public WorkloadService(TaskRepository taskRepository,
                           TeamRepository teamRepository,
                           TeamMemberRepository teamMemberRepository,
                           UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public TeamWorkloadDto getTeamWorkload(Long teamId, Long actorId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));
        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, actorId)) {
            throw new ForbiddenException("Not a member of this team");
        }

        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);
        List<MemberWorkloadDto> memberStats = new ArrayList<>();
        for (TeamMember m : members) {
            User u = userRepository.findById(m.getUserId()).orElse(null);
            if (u == null) continue;
            long todo = taskRepository.countByTeamIdAndAssigneeIdAndStatus(teamId, u.getId(), TaskStatus.TODO);
            long inProgress = taskRepository.countByTeamIdAndAssigneeIdAndStatus(teamId, u.getId(), TaskStatus.IN_PROGRESS);
            long done = taskRepository.countByTeamIdAndAssigneeIdAndStatus(teamId, u.getId(), TaskStatus.DONE);
            memberStats.add(new MemberWorkloadDto(u.getId(), u.getUsername(), u.getEmail(),
                    todo, inProgress, done));
        }

        long unassignedOpen = taskRepository.countByTeamIdAndAssigneeIdIsNullAndStatusIn(
                teamId, Arrays.asList(TaskStatus.TODO, TaskStatus.IN_PROGRESS));

        return new TeamWorkloadDto(team.getId(), team.getName(), unassignedOpen, memberStats);
    }
}
