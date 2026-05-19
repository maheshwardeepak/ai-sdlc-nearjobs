package com.taskflowlite.team.repository;

import com.taskflowlite.team.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, UUID> {

    List<TeamMember> findByTeam_Id(UUID teamId);

    Optional<TeamMember> findByTeam_IdAndUserId(UUID teamId, UUID userId);

    boolean existsByTeam_IdAndUserId(UUID teamId, UUID userId);

    long countByTeam_Id(UUID teamId);

    void deleteByTeam_IdAndUserId(UUID teamId, UUID userId);
}

// ===== AI MERGE APPEND =====

package com.taskflowlite.team.repository;

import com.taskflowlite.domain.entity.TeamMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMemberEntity, UUID> {

    List<TeamMemberEntity> findByTeamId(UUID teamId);

    Optional<TeamMemberEntity> findByTeamIdAndUserId(UUID teamId, UUID userId);

    boolean existsByTeamIdAndUserId(UUID teamId, UUID userId);

    void deleteByTeamIdAndUserId(UUID teamId, UUID userId);

    long countByTeamId(UUID teamId);
}

// ===== AI MERGE APPEND =====

package com.taskflowlite.team.repository;

import com.taskflowlite.domain.entity.TeamMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMemberEntity, Long> {

    List<TeamMemberEntity> findByTeamId(Long teamId);

    Optional<TeamMemberEntity> findByTeamIdAndUserId(Long teamId, Long userId);

    boolean existsByTeamIdAndUserId(Long teamId, Long userId);

    void deleteByTeamIdAndUserId(Long teamId, Long userId);
}