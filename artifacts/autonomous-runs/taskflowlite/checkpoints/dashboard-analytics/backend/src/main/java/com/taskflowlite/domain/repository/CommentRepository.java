package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.CommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<CommentEntity, Long> {
    List<CommentEntity> findByTaskIdOrderByCreatedAtAsc(Long taskId);
}