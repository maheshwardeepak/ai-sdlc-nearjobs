package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.TeamMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamMemberRepository extends JpaRepository<TeamMemberEntity, Long> {
    List<TeamMemberEntity> findByTeamId(Long teamId);
    List<TeamMemberEntity> findByUserId(Long userId);
    Optional<TeamMemberEntity> findByTeamIdAndUserId(Long teamId, Long userId);
    boolean existsByTeamIdAndUserId(Long teamId, Long userId);
}
