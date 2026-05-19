package com.taskflowlite.team.repository;

import com.taskflowlite.team.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TeamRepository extends JpaRepository<Team, UUID> {

    @Query("SELECT DISTINCT t FROM Team t LEFT JOIN TeamMember tm ON tm.team = t " +
           "WHERE t.ownerId = :userId OR tm.userId = :userId")
    List<Team> findAllForUser(UUID userId);

    boolean existsByNameIgnoreCase(String name);
}