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