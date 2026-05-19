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

// ===== AI MERGE APPEND =====

package com.taskflowlite.task.service;

import com.taskflowlite.common.exception.NotFoundException;
import com.taskflowlite.common.exception.ForbiddenException;
import com.taskflowlite.common.exception.BadRequestException;
import com.taskflowlite.task.dto.TaskRequest;
import com.taskflowlite.task.dto.TaskResponse;
import com.taskflowlite.task.entity.Task;
import com.taskflowlite.task.entity.TaskPriority;
import com.taskflowlite.task.entity.TaskStatus;
import com.taskflowlite.task.repository.TaskRepository;
import com.taskflowlite.team.repository.TeamMemberRepository;
import com.taskflowlite.team.repository.TeamRepository;
import com.taskflowlite.user.entity.User;
import com.taskflowlite.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

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

    private void ensureTeamMembership(Long teamId, Long userId) {
        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new ForbiddenException("User is not a member of this team");
        }
    }

    @Transactional
    public TaskResponse create(TaskRequest req, Long actorId) {
        if (req.getTeamId() == null) throw new BadRequestException("teamId is required");
        if (!teamRepository.existsById(req.getTeamId()))
            throw new NotFoundException("Team not found");
        ensureTeamMembership(req.getTeamId(), actorId);

        if (req.getAssigneeId() != null) {
            ensureTeamMembership(req.getTeamId(), req.getAssigneeId());
        }

        Task t = new Task();
        t.setTitle(req.getTitle());
        t.setDescription(req.getDescription());
        t.setStatus(req.getStatus() != null ? req.getStatus() : TaskStatus.TODO);
        t.setPriority(req.getPriority() != null ? req.getPriority() : TaskPriority.MEDIUM);
        t.setDueDate(req.getDueDate());
        t.setTeamId(req.getTeamId());
        t.setAssigneeId(req.getAssigneeId());
        t.setCreatedById(actorId);
        Instant now = Instant.now();
        t.setCreatedAt(now);
        t.setUpdatedAt(now);
        return toResponse(taskRepository.save(t));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> list(Long teamId, TaskStatus status, Long assigneeId, Boolean unassigned, Long actorId) {
        boolean unassignedFlag = Boolean.TRUE.equals(unassigned);
        List<Task> tasks = taskRepository.search(teamId, status, assigneeId, unassignedFlag);
        // Filter by membership: only return tasks in teams user belongs to
        return tasks.stream()
                .filter(t -> teamMemberRepository.existsByTeamIdAndUserId(t.getTeamId(), actorId))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaskResponse get(Long id, Long actorId) {
        Task t = taskRepository.findById(id).orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTeamMembership(t.getTeamId(), actorId);
        return toResponse(t);
    }

    @Transactional
    public TaskResponse update(Long id, TaskRequest req, Long actorId) {
        Task t = taskRepository.findById(id).orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTeamMembership(t.getTeamId(), actorId);
        if (req.getTitle() != null) t.setTitle(req.getTitle());
        if (req.getDescription() != null) t.setDescription(req.getDescription());
        if (req.getStatus() != null) t.setStatus(req.getStatus());
        if (req.getPriority() != null) t.setPriority(req.getPriority());
        if (req.getDueDate() != null) t.setDueDate(req.getDueDate());
        if (req.getAssigneeId() != null) {
            ensureTeamMembership(t.getTeamId(), req.getAssigneeId());
            t.setAssigneeId(req.getAssigneeId());
        }
        t.setUpdatedAt(Instant.now());
        return toResponse(taskRepository.save(t));
    }

    @Transactional
    public TaskResponse updateStatus(Long id, TaskStatus status, Long actorId) {
        Task t = taskRepository.findById(id).orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTeamMembership(t.getTeamId(), actorId);
        t.setStatus(status);
        t.setUpdatedAt(Instant.now());
        return toResponse(taskRepository.save(t));
    }

    /**
     * Assign or reassign a task. Passing null assigneeId unassigns the task.
     */
    @Transactional
    public TaskResponse updateAssignee(Long id, Long assigneeId, Long actorId) {
        Task t = taskRepository.findById(id).orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTeamMembership(t.getTeamId(), actorId);

        if (assigneeId != null) {
            if (!userRepository.existsById(assigneeId)) {
                throw new NotFoundException("Assignee user not found");
            }
            if (!teamMemberRepository.existsByTeamIdAndUserId(t.getTeamId(), assigneeId)) {
                throw new BadRequestException("Assignee must be a member of the task's team");
            }
        }
        t.setAssigneeId(assigneeId);
        t.setUpdatedAt(Instant.now());
        return toResponse(taskRepository.save(t));
    }

    @Transactional
    public void delete(Long id, Long actorId) {
        Task t = taskRepository.findById(id).orElseThrow(() -> new NotFoundException("Task not found"));
        ensureTeamMembership(t.getTeamId(), actorId);
        taskRepository.delete(t);
    }

    private TaskResponse toResponse(Task t) {
        TaskResponse r = new TaskResponse();
        r.setId(t.getId());
        r.setTitle(t.getTitle());
        r.setDescription(t.getDescription());
        r.setStatus(t.getStatus());
        r.setPriority(t.getPriority());
        r.setDueDate(t.getDueDate());
        r.setTeamId(t.getTeamId());
        r.setAssigneeId(t.getAssigneeId());
        r.setCreatedById(t.getCreatedById());
        r.setCreatedAt(t.getCreatedAt());
        r.setUpdatedAt(t.getUpdatedAt());
        if (t.getAssigneeId() != null) {
            userRepository.findById(t.getAssigneeId()).ifPresent(u -> {
                r.setAssigneeUsername(u.getUsername());
                r.setAssigneeEmail(u.getEmail());
            });
        }
        return r;
    }
}