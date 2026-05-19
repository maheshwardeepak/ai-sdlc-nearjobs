package com.taskflowlite.task.repository;

import com.taskflowlite.task.domain.Task;
import com.taskflowlite.task.domain.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    List<Task> findByTeamId(Long teamId);

    List<Task> findByTeamIdAndStatus(Long teamId, TaskStatus status);

    List<Task> findByAssigneeId(Long assigneeId);
}

// ===== AI MERGE APPEND =====

package com.taskflowlite.task.repository;

import com.taskflowlite.task.entity.Task;
import com.taskflowlite.task.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByTeamIdOrderByCreatedAtDesc(Long teamId);

    List<Task> findByAssigneeIdOrderByCreatedAtDesc(Long assigneeId);

    @Query("SELECT t FROM Task t WHERE " +
            "(:teamId IS NULL OR t.teamId = :teamId) AND " +
            "(:status IS NULL OR t.status = :status) AND " +
            "(:assigneeId IS NULL OR t.assigneeId = :assigneeId) AND " +
            "(:unassigned = false OR t.assigneeId IS NULL) " +
            "ORDER BY t.createdAt DESC")
    List<Task> search(@Param("teamId") Long teamId,
                      @Param("status") TaskStatus status,
                      @Param("assigneeId") Long assigneeId,
                      @Param("unassigned") boolean unassigned);

    long countByTeamIdAndAssigneeIdAndStatus(Long teamId, Long assigneeId, TaskStatus status);

    long countByTeamIdAndAssigneeIdIsNullAndStatusIn(Long teamId, List<TaskStatus> statuses);
}