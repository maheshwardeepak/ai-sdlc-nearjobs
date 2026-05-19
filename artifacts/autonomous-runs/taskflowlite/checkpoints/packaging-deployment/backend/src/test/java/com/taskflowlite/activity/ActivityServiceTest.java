package com.taskflowlite.activity;

import com.taskflowlite.task.Task;
import com.taskflowlite.task.TaskPriority;
import com.taskflowlite.task.TaskStatus;
import com.taskflowlite.user.User;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ActivityServiceTest {

    @Test
    void recordIfChanged_skipsWhenEqual() {
        ActivityLogRepository repo = mock(ActivityLogRepository.class);
        ActivityService svc = new ActivityService(repo);
        Task t = new Task();
        User u = new User();
        svc.recordIfChanged(t, u, ActivityAction.STATUS_CHANGED, "status", TaskStatus.TODO, TaskStatus.TODO);
        verify(repo, never()).save(any());
    }

    @Test
    void recordIfChanged_savesWhenChanged() {
        ActivityLogRepository repo = mock(ActivityLogRepository.class);
        ActivityService svc = new ActivityService(repo);
        Task t = new Task();
        User u = new User();
        svc.recordIfChanged(t, u, ActivityAction.PRIORITY_CHANGED, "priority",
                TaskPriority.LOW, TaskPriority.HIGH);
        ArgumentCaptor<ActivityLog> cap = ArgumentCaptor.forClass(ActivityLog.class);
        verify(repo).save(cap.capture());
        ActivityLog logged = cap.getValue();
        assertThat(logged.getAction()).isEqualTo(ActivityAction.PRIORITY_CHANGED);
        assertThat(logged.getOldValue()).isEqualTo("LOW");
        assertThat(logged.getNewValue()).isEqualTo("HIGH");
    }

    @Test
    void recordTaskCreated_storesTitleAsNewValue() {
        ActivityLogRepository repo = mock(ActivityLogRepository.class);
        ActivityService svc = new ActivityService(repo);
        Task t = new Task();
        t.setTitle("Hello");
        User u = new User();
        svc.recordTaskCreated(t, u);
        ArgumentCaptor<ActivityLog> cap = ArgumentCaptor.forClass(ActivityLog.class);
        verify(repo).save(cap.capture());
        assertThat(cap.getValue().getAction()).isEqualTo(ActivityAction.TASK_CREATED);
        assertThat(cap.getValue().getNewValue()).isEqualTo("Hello");
    }

    @Test
    void recordCommentCreatedAndDeleted() {
        ActivityLogRepository repo = mock(ActivityLogRepository.class);
        ActivityService svc = new ActivityService(repo);
        Task t = new Task();
        User u = new User();
        svc.recordCommentCreated(t, u, 42L);
        svc.recordCommentDeleted(t, u, 42L);
        verify(repo, times(2)).save(any());
    }
}