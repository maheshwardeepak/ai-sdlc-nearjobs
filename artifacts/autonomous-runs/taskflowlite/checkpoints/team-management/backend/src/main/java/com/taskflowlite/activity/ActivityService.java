package com.taskflowlite.activity;

import com.taskflowlite.task.Task;
import com.taskflowlite.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class ActivityService {

    private final ActivityLogRepository repo;

    public ActivityService(ActivityLogRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public void record(Task task, User actor, ActivityAction action, String field, String oldValue, String newValue) {
        repo.save(new ActivityLog(task, actor, action, field, oldValue, newValue));
    }

    @Transactional
    public void recordTaskCreated(Task task, User actor) {
        record(task, actor, ActivityAction.TASK_CREATED, null, null, task.getTitle());
    }

    @Transactional
    public void recordIfChanged(Task task, User actor, ActivityAction action, String field, Object oldVal, Object newVal) {
        if (!Objects.equals(oldVal, newVal)) {
            record(task, actor, action, field,
                    oldVal == null ? null : String.valueOf(oldVal),
                    newVal == null ? null : String.valueOf(newVal));
        }
    }

    @Transactional
    public void recordCommentCreated(Task task, User actor, Long commentId) {
        record(task, actor, ActivityAction.COMMENT_CREATED, "comment", null, String.valueOf(commentId));
    }

    @Transactional
    public void recordCommentDeleted(Task task, User actor, Long commentId) {
        record(task, actor, ActivityAction.COMMENT_DELETED, "comment", String.valueOf(commentId), null);
    }

    @Transactional(readOnly = true)
    public List<ActivityLog> listForTask(Long taskId) {
        return repo.findByTaskIdOrderByCreatedAtAsc(taskId);
    }
}
