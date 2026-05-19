package com.taskflowlite.dashboard.repository;

import com.taskflowlite.task.domain.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DashboardRepository extends JpaRepository<Task, Long> {

    @Query("SELECT t.status as key, COUNT(t) as count FROM Task t " +
           "WHERE (:teamIds IS NULL OR t.team.id IN :teamIds) " +
           "GROUP BY t.status")
    List<Object[]> countByStatus(@Param("teamIds") List<Long> teamIds);

    @Query("SELECT t.priority as key, COUNT(t) as count FROM Task t " +
           "WHERE (:teamIds IS NULL OR t.team.id IN :teamIds) " +
           "GROUP BY t.priority")
    List<Object[]> countByPriority(@Param("teamIds") List<Long> teamIds);

    @Query("SELECT COUNT(t) FROM Task t WHERE (:teamIds IS NULL OR t.team.id IN :teamIds)")
    long countTotal(@Param("teamIds") List<Long> teamIds);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.dueDate < :today AND t.status <> 'DONE' " +
           "AND (:teamIds IS NULL OR t.team.id IN :teamIds)")
    long countOverdue(@Param("teamIds") List<Long> teamIds, @Param("today") LocalDate today);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.assignee IS NULL " +
           "AND (:teamIds IS NULL OR t.team.id IN :teamIds)")
    long countUnassigned(@Param("teamIds") List<Long> teamIds);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.dueDate BETWEEN :today AND :soon " +
           "AND t.status <> 'DONE' " +
           "AND (:teamIds IS NULL OR t.team.id IN :teamIds)")
    long countDueSoon(@Param("teamIds") List<Long> teamIds,
                     @Param("today") LocalDate today,
                     @Param("soon") LocalDate soon);

    // Team-scoped variants (single team id, never null)
    @Query("SELECT t.status, COUNT(t) FROM Task t WHERE t.team.id = :teamId GROUP BY t.status")
    List<Object[]> countByStatusForTeam(@Param("teamId") Long teamId);

    @Query("SELECT t.priority, COUNT(t) FROM Task t WHERE t.team.id = :teamId GROUP BY t.priority")
    List<Object[]> countByPriorityForTeam(@Param("teamId") Long teamId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.team.id = :teamId")
    long countTotalForTeam(@Param("teamId") Long teamId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.team.id = :teamId AND t.dueDate < :today AND t.status <> 'DONE'")
    long countOverdueForTeam(@Param("teamId") Long teamId, @Param("today") LocalDate today);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.team.id = :teamId AND t.assignee IS NULL")
    long countUnassignedForTeam(@Param("teamId") Long teamId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.team.id = :teamId " +
           "AND t.dueDate BETWEEN :today AND :soon AND t.status <> 'DONE'")
    long countDueSoonForTeam(@Param("teamId") Long teamId,
                            @Param("today") LocalDate today,
                            @Param("soon") LocalDate soon);
}