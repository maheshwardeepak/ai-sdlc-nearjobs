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