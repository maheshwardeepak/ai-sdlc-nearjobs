package com.taskflowlite.activity;

import com.taskflowlite.task.Task;
import com.taskflowlite.task.TaskRepository;
import com.taskflowlite.task.TaskAccessService;
import com.taskflowlite.security.CurrentUserService;
import com.taskflowlite.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@RestController
@RequestMapping("/api/tasks/{id}/activity")
public class ActivityController {

    private final ActivityService activityService;
    private final TaskRepository taskRepository;
    private final TaskAccessService taskAccess;
    private final CurrentUserService currentUserService;

    public ActivityController(ActivityService activityService,
                              TaskRepository taskRepository,
                              TaskAccessService taskAccess,
                              CurrentUserService currentUserService) {
        this.activityService = activityService;
        this.taskRepository = taskRepository;
        this.taskAccess = taskAccess;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<ActivityLogDto>> list(@PathVariable("id") Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        User me = currentUserService.requireCurrentUser();
        if (!taskAccess.canView(me, task)) {
            throw new AccessDeniedException("Cannot view activity for this task");
        }
        return ResponseEntity.ok(activityService.listForTask(taskId).stream()
                .map(ActivityLogDto::from).toList());
    }
}