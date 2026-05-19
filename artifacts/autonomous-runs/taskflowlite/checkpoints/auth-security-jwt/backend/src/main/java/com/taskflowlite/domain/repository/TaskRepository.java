package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.Task;
import com.taskflowlite.domain.model.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {
    List<Task> findByTeamId(Long teamId);
    List<Task> findByAssigneeId(Long assigneeId);
    List<Task> findByStatus(TaskStatus status);
    long countByStatus(TaskStatus status);
    long countByTeamIdAndStatus(Long teamId, TaskStatus status);
    long countByAssigneeIdAndStatusNot(Long assigneeId, TaskStatus status);
}
