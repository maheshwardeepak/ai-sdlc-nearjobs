package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.TaskEntity;
import com.taskflowlite.domain.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface TaskRepository extends JpaRepository<TaskEntity, Long>, JpaSpecificationExecutor<TaskEntity> {
    List<TaskEntity> findByTeamId(Long teamId);
    List<TaskEntity> findByAssigneeId(Long assigneeId);
    List<TaskEntity> findByTeamIdAndAssigneeIsNull(Long teamId);
    long countByStatus(TaskStatus status);
    long countByTeamIdAndStatus(Long teamId, TaskStatus status);
}