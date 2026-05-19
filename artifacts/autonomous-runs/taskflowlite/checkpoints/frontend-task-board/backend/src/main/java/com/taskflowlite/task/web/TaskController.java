package com.taskflowlite.task.web;

import com.taskflowlite.security.CurrentUser;
import com.taskflowlite.task.domain.TaskStatus;
import com.taskflowlite.task.dto.CreateTaskRequest;
import com.taskflowlite.task.dto.TaskResponse;
import com.taskflowlite.task.dto.UpdateTaskRequest;
import com.taskflowlite.task.dto.UpdateTaskStatusRequest;
import com.taskflowlite.task.service.TaskService;
import com.taskflowlite.user.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody CreateTaskRequest request,
                                               @CurrentUser User currentUser) {
        TaskResponse created = taskService.createTask(request, currentUser);
        return ResponseEntity.created(URI.create("/api/tasks/" + created.getId())).body(created);
    }

    @GetMapping
    public List<TaskResponse> list(@RequestParam(required = false) Long teamId,
                                   @RequestParam(required = false) TaskStatus status,
                                   @RequestParam(required = false) Long assigneeId,
                                   @RequestParam(required = false) Boolean unassigned,
                                   @CurrentUser User currentUser) {
        return taskService.listTasks(teamId, status, assigneeId, unassigned, currentUser);
    }

    @GetMapping("/{id}")
    public TaskResponse get(@PathVariable Long id, @CurrentUser User currentUser) {
        return taskService.getTask(id, currentUser);
    }

    @PutMapping("/{id}")
    public TaskResponse update(@PathVariable Long id,
                               @Valid @RequestBody UpdateTaskRequest request,
                               @CurrentUser User currentUser) {
        return taskService.updateTask(id, request, currentUser);
    }

    @PatchMapping("/{id}/status")
    public TaskResponse updateStatus(@PathVariable Long id,
                                     @Valid @RequestBody UpdateTaskStatusRequest request,
                                     @CurrentUser User currentUser) {
        return taskService.updateStatus(id, request.getStatus(), currentUser);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @CurrentUser User currentUser) {
        taskService.deleteTask(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}