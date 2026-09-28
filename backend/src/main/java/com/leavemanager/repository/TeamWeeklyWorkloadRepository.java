package com.leavemanager.repository;

import com.leavemanager.domain.TeamWeeklyWorkload;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TeamWeeklyWorkloadRepository extends JpaRepository<TeamWeeklyWorkload, Long> {

    List<TeamWeeklyWorkload> findByTeamIdOrderByStartDateAsc(Long teamId);

    List<TeamWeeklyWorkload> findByTeamIdInOrderByStartDateAsc(List<Long> teamIds);

    Optional<TeamWeeklyWorkload> findByTeamIdAndStartDate(Long teamId, LocalDate startDate);

    @Query("SELECT w FROM TeamWeeklyWorkload w WHERE w.team.id = :teamId AND w.startDate <= :date AND w.endDate >= :date")
    Optional<TeamWeeklyWorkload> findByTeamIdAndDate(@Param("teamId") Long teamId, @Param("date") LocalDate date);

    @Query("SELECT w FROM TeamWeeklyWorkload w WHERE w.team.id = :teamId AND w.startDate <= :endDate AND w.endDate >= :startDate ORDER BY w.startDate ASC")
    List<TeamWeeklyWorkload> findByTeamIdAndDateRange(@Param("teamId") Long teamId,
                                                     @Param("startDate") LocalDate startDate,
                                                     @Param("endDate") LocalDate endDate);

    @Query("SELECT w FROM TeamWeeklyWorkload w WHERE w.startDate <= :endDate AND w.endDate >= :startDate ORDER BY w.startDate ASC")
    List<TeamWeeklyWorkload> findAllByDateRange(@Param("startDate") LocalDate startDate,
                                                @Param("endDate") LocalDate endDate);
}
