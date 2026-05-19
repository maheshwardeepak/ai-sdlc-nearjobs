package com.taskflowlite.task;

import com.taskflowlite.team.Team;
import com.taskflowlite.team.TeamRepository;
import com.taskflowlite.team.TeamMembershipService;
import com.taskflowlite.user.User;
import com.taskflowlite.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final TeamMembershipService membershipService;
    private final TaskActivityHooks activityHooks;

    public TaskService(TaskRepository taskRepository,
                       TeamRepository teamRepository,
                       UserRepository userRepository,
                       TeamMembershipService membershipService,
                       TaskActivityHooks activityHooks) {
        this.taskRepository = taskRepository;
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
        this.membershipService = membershipService;
        this.activityHooks = activityHooks;
    }

    @Transactional
    public Task create(User actor, Long teamId, String title, String description,
                       TaskPriority priority, LocalDate dueDate, Long assigneeId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        if (!membershipService.isMember(team, actor)) {
            throw new AccessDeniedException("Not a member of this team");
        }
        Task t = new Task();
        t.setTeam(team);
        t.setTitle(title);
        t.setDescription(description);
        t.setStatus(TaskStatus.TODO);
        t.setPriority(priority != null ? priority : TaskPriority.MEDIUM);
        t.setDueDate(dueDate);
        t.setCreatedBy(actor);
        if (assigneeId != null) {
            User assignee = userRepository.findById(assigneeId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignee not found"));
            if (!membershipService.isMember(team, assignee)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assignee not in team");
            }
            t.setAssignee(assignee);
        }
        Task saved = taskRepository.save(t);
        activityHooks.onTaskCreated(saved, actor);
        if (saved.getAssignee() != null) {
            activityHooks.onAssigneeChanged(saved, actor, null, saved.getAssignee().getId());
        }
        return saved;
    }

    @Transactional
    public Task update(User actor, Long taskId, String title, String description,
                       TaskPriority priority, LocalDate dueDate) {
        Task t = requireViewable(actor, taskId);
        t.setTitle(title);
        t.setDescription(description);
        TaskPriority oldP = t.getPriority();
        LocalDate oldDue = t.getDueDate();
        TaskPriority newP = priority != null ? priority : oldP;
        t.setPriority(newP);
        t.setDueDate(dueDate);
        Task saved = taskRepository.save(t);
        activityHooks.onPriorityChanged(saved, actor, oldP, newP);
        activityHooks.onDueDateChanged(saved, actor, oldDue, dueDate);
        return saved;
    }

    @Transactional
    public Task changeStatus(User actor, Long taskId, TaskStatus status) {
        Task t = requireViewable(actor, taskId);
        TaskStatus old = t.getStatus();
        t.setStatus(status);
        Task saved = taskRepository.save(t);
        activityHooks.onStatusChanged(saved, actor, old, status);
        return saved;
    }

    @Transactional
    public Task changeAssignee(User actor, Long taskId, Long assigneeId) {
        Task t = requireViewable(actor, taskId);
        Long oldAssigneeId = t.getAssignee() != null ? t.getAssignee().getId() : null;
        if (assigneeId == null) {
            t.setAssignee(null);
        } else {
            User assignee = userRepository.findById(assigneeId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignee not found"));
            if (!membershipService.isMember(t.getTeam(), assignee)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assignee not in team");
            }
            t.setAssignee(assignee);
        }
        Task saved = taskRepository.save(t);
        if (!Objects.equals(oldAssigneeId, assigneeId)) {
            activityHooks.onAssigneeChanged(saved, actor, oldAssigneeId, assigneeId);
        }
        return saved;
    }

    @Transactional
    public void delete(User actor, Long taskId) {
        Task t = requireViewable(actor, taskId);
        taskRepository.delete(t);
    }

    @Transactional(readOnly = true)
    public Task get(User actor, Long taskId) {
        return requireViewable(actor, taskId);
    }

    @Transactional(readOnly = true)
    public List<Task> list(User actor, Long teamId, TaskStatus status, Long assigneeId, Boolean unassigned) {
        return taskRepository.search(teamId, status, assigneeId, Boolean.TRUE.equals(unassigned));
    }

    private Task requireViewable(User actor, Long taskId) {
        Task t = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        if (!membershipService.isMember(t.getTeam(), actor)) {
            throw new AccessDeniedException("Not a member of this team");
        }
        return t;
    }
}
