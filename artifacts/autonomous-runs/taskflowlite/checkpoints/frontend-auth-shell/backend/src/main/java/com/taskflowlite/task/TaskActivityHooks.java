package com.taskflowlite.task;

import com.taskflowlite.activity.ActivityAction;
import com.taskflowlite.activity.ActivityService;
import com.taskflowlite.user.User;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Centralized helper for emitting activity events from task mutations.
 * Other services (TaskService, CommentService) call into this to keep
 * the audit logic in one place.
 */
@Component
public class TaskActivityHooks {

    private final ActivityService activityService;

    public TaskActivityHooks(ActivityService activityService) {
        this.activityService = activityService;
    }

    public void onTaskCreated(Task task, User actor) {
        activityService.recordTaskCreated(task, actor);
    }

    public void onStatusChanged(Task task, User actor, TaskStatus oldStatus, TaskStatus newStatus) {
        activityService.recordIfChanged(task, actor, ActivityAction.STATUS_CHANGED, "status", oldStatus, newStatus);
    }

    public void onPriorityChanged(Task task, User actor, TaskPriority oldP, TaskPriority newP) {
        activityService.recordIfChanged(task, actor, ActivityAction.PRIORITY_CHANGED, "priority", oldP, newP);
    }

    public void onDueDateChanged(Task task, User actor, LocalDate oldDue, LocalDate newDue) {
        activityService.recordIfChanged(task, actor, ActivityAction.DUE_DATE_CHANGED, "dueDate", oldDue, newDue);
    }

    public void onAssigneeChanged(Task task, User actor, Long oldAssigneeId, Long newAssigneeId) {
        activityService.recordIfChanged(task, actor, ActivityAction.ASSIGNEE_CHANGED, "assigneeId", oldAssigneeId, newAssigneeId);
    }
}