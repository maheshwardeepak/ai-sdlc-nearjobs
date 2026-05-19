package com.taskflowlite.task.controller;

import com.taskflowlite.security.CurrentUser;
import com.taskflowlite.task.dto.AssigneeUpdateRequest;
import com.taskflowlite.task.dto.StatusUpdateRequest;
import com.taskflowlite.task.dto.TaskRequest;
import com.taskflowlite.task.dto.TaskResponse;
import com.taskflowlite.task.entity.TaskStatus;
import com.taskflowlite.task.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@PreAuthorize("isAuthenticated()")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody TaskRequest req,
                                               @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.create(req, userId));
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> list(
            @RequestParam(required = false) Long teamId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Boolean unassigned,
            @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.list(teamId, status, assigneeId, unassigned, userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> get(@PathVariable Long id, @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.get(id, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> update(@PathVariable Long id,
                                               @RequestBody TaskRequest req,
                                               @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.update(id, req, userId));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponse> updateStatus(@PathVariable Long id,
                                                     @Valid @RequestBody StatusUpdateRequest req,
                                                     @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.updateStatus(id, req.getStatus(), userId));
    }

    @PatchMapping("/{id}/assignee")
    public ResponseEntity<TaskResponse> updateAssignee(@PathVariable Long id,
                                                       @RequestBody AssigneeUpdateRequest req,
                                                       @CurrentUser Long userId) {
        return ResponseEntity.ok(taskService.updateAssignee(id, req.getAssigneeId(), userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @CurrentUser Long userId) {
        taskService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
