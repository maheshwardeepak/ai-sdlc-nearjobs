package com.taskflowlite.domain.repository;

import com.taskflowlite.domain.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    @Query("SELECT DISTINCT t FROM Team t LEFT JOIN TeamMember tm ON tm.team = t " +
           "WHERE t.owner.id = :userId OR tm.user.id = :userId")
    List<Team> findAllForUser(@Param("userId") Long userId);
}
