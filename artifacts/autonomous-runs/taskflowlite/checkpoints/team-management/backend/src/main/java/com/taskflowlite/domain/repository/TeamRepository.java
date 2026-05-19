package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.TeamEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<TeamEntity, Long> {
}
