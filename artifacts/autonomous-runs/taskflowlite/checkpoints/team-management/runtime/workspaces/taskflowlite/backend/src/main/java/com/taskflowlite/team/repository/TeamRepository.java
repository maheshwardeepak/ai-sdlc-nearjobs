package com.taskflowlite.team.repository;

import com.taskflowlite.domain.entity.TeamEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamRepository extends JpaRepository<TeamEntity, Long> {

    Optional<TeamEntity> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    @Query("select t from TeamEntity t where t.id in " +
            "(select tm.team.id from TeamMemberEntity tm where tm.user.id = :userId)")
    List<TeamEntity> findTeamsForUser(@Param("userId") Long userId);
}