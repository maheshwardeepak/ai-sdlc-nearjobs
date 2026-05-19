package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.ActivityLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLogEntity, Long> {
    List<ActivityLogEntity> findByTaskIdOrderByCreatedAtAsc(Long taskId);
}
