package com.leavemanager.repository;

import com.leavemanager.domain.Workation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkationRepository extends JpaRepository<Workation, Long> {

    List<Workation> findByUserIdOrderByStartDateDesc(Long userId);

    @Query("SELECT w FROM Workation w WHERE w.user.id = :userId AND w.active = true AND w.approvalStatus = 'APPROVED' " +
           "AND COALESCE(w.baseStartDate, w.startDate) <= :date AND COALESCE(w.baseEndDate, w.endDate) >= :date")
    Optional<Workation> findActiveForUserOnDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Query("SELECT w FROM Workation w WHERE (w.user.manager.id = :managerId OR w.user.id = :managerId) " +
           "AND w.active = true AND w.approvalStatus = 'APPROVED' " +
           "AND COALESCE(w.baseStartDate, w.startDate) <= :endDate AND COALESCE(w.baseEndDate, w.endDate) >= :startDate " +
           "ORDER BY COALESCE(w.baseStartDate, w.startDate) ASC")
    List<Workation> findApprovedTeamWorkations(@Param("managerId") Long managerId,
                                               @Param("startDate") LocalDate startDate,
                                               @Param("endDate") LocalDate endDate);

    @Query("SELECT w FROM Workation w WHERE w.active = true AND w.approvalStatus = 'APPROVED' " +
           "AND COALESCE(w.baseStartDate, w.startDate) <= :endDate AND COALESCE(w.baseEndDate, w.endDate) >= :startDate " +
           "ORDER BY COALESCE(w.baseStartDate, w.startDate) ASC")
    List<Workation> findAllApprovedWorkationsInRange(@Param("startDate") LocalDate startDate,
                                                     @Param("endDate") LocalDate endDate);

    @Query("SELECT w FROM Workation w WHERE w.user.manager.id = :managerId AND w.active = true AND w.approvalStatus = 'PENDING_MANAGER' " +
           "ORDER BY w.createdAt DESC")
    List<Workation> findPendingForManager(@Param("managerId") Long managerId);

    @Query("SELECT w FROM Workation w WHERE w.active = true AND w.approvalStatus IN ('PENDING_MANAGER', 'PENDING_HR') " +
           "ORDER BY w.createdAt DESC")
    List<Workation> findPendingForHr();
}
