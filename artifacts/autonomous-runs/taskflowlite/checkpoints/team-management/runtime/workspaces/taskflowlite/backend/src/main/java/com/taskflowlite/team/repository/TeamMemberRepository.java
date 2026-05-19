package com.taskflowlite.team.repository;

import com.taskflowlite.domain.entity.TeamMemberEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMemberEntity, Long> {

    List<TeamMemberEntity> findByTeamId(Long teamId);

    Optional<TeamMemberEntity> findByTeamIdAndUserId(Long teamId, Long userId);

    boolean existsByTeamIdAndUserId(Long teamId, Long userId);

    long countByTeamId(Long teamId);

    void deleteByTeamIdAndUserId(Long teamId, Long userId);
}