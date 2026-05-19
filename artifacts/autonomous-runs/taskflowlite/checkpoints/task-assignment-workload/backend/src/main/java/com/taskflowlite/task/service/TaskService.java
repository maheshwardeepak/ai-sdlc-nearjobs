package com.taskflowlite.task.service;

import com.taskflowlite.team.domain.Team;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.task.domain.Task;
import com.taskflowlite.task.domain.TaskStatus;
import com.taskflowlite.task.dto.CreateTaskRequest;
import com.taskflowlite.task.dto.TaskResponse;
import com.taskflowlite.task.dto.UpdateTaskRequest;
import com.taskflowlite.task.exception.TaskAccessDeniedException;
import com.taskflowlite.task.exception.TaskNotFoundException;
import com.taskflowlite.task.repository.TaskRepository;
import com.taskflowlite.user.domain.User;
import com.taskflowlite.user.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository,
                       TeamRepository teamRepository,
                       TeamMemberRepository teamMemberRepository,
                       UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TaskResponse createTask(CreateTaskRequest request, User currentUser) {
        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new TaskNotFoundException("Team not found: " + request.getTeamId()));

        assertTeamMember(team.getId(), currentUser.getId());

        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setPriority(request.getPriority());
        task.setStatus(TaskStatus.TODO);
        task.setDueDate(request.getDueDate());
        task.setTeam(team);
        task.setCreatedBy(currentUser);

        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new TaskNotFoundException("Assignee not found: " + request.getAssigneeId()));
            assertTeamMember(team.getId(), assignee.getId());
            task.setAssignee(assignee);
        }

        Task saved = taskRepository.save(task);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(Long id, User currentUser) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException("Task not found: " + id));
        assertTeamMember(task.getTeam().getId(), currentUser.getId());
        return toResponse(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listTasks(Long teamId, TaskStatus status, Long assigneeId, Boolean unassigned, User currentUser) {
        Specification<Task> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (teamId != null) {
                assertTeamMember(teamId, currentUser.getId());
                predicates.add(cb.equal(root.get("team").get("id"), teamId));
            } else {
                // restrict to teams user is member of
                List<Long> myTeams = teamMemberRepository.findTeamIdsByUserId(currentUser.getId());
                if (myTeams.isEmpty()) {
                    predicates.add(cb.disjunction());
                } else {
                    predicates.add(root.get("team").get("id").in(myTeams));
                }
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (Boolean.TRUE.equals(unassigned)) {
                predicates.add(cb.isNull(root.get("assignee")));
            } else if (assigneeId != null) {
                predicates.add(cb.equal(root.get("assignee").get("id"), assigneeId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return taskRepository.findAll(spec).stream().map(this::toResponse).toList();
    }

    @Transactional
    public TaskResponse updateTask(Long id, UpdateTaskRequest request, User currentUser) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException("Task not found: " + id));
        assertTeamMember(task.getTeam().getId(), currentUser.getId());

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            task.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate());
        }
        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new TaskNotFoundException("Assignee not found: " + request.getAssigneeId()));
            assertTeamMember(task.getTeam().getId(), assignee.getId());
            task.setAssignee(assignee);
        }

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse updateStatus(Long id, TaskStatus status, User currentUser) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException("Task not found: " + id));
        assertTeamMember(task.getTeam().getId(), currentUser.getId());
        task.setStatus(status);
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(Long id, User currentUser) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException("Task not found: " + id));
        assertTeamMember(task.getTeam().getId(), currentUser.getId());
        taskRepository.delete(task);
    }

    private void assertTeamMember(Long teamId, Long userId) {
        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new TaskAccessDeniedException("User is not a member of team " + teamId);
        }
    }

    private TaskResponse toResponse(Task task) {
        TaskResponse r = new TaskResponse();
        r.setId(task.getId());
        r.setTitle(task.getTitle());
        r.setDescription(task.getDescription());
        r.setStatus(task.getStatus());
        r.setPriority(task.getPriority());
        r.setDueDate(task.getDueDate());
        r.setTeamId(task.getTeam() != null ? task.getTeam().getId() : null);
        if (task.getAssignee() != null) {
            r.setAssigneeId(task.getAssignee().getId());
            r.setAssigneeUsername(task.getAssignee().getUsername());
        }
        if (task.getCreatedBy() != null) {
            r.setCreatedById(task.getCreatedBy().getId());
            r.setCreatedByUsername(task.getCreatedBy().getUsername());
        }
        r.setCreatedAt(task.getCreatedAt());
        r.setUpdatedAt(task.getUpdatedAt());
        return r;
    }
}