package com.leavemanager.repository;

import com.leavemanager.domain.LeaveRequest;
import com.leavemanager.domain.enums.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    List<LeaveRequest> findByRequesterId(Long requesterId);

    List<LeaveRequest> findByRequesterIdOrderByCreatedAtDesc(Long requesterId);

    List<LeaveRequest> findByCurrentAssigneeIdAndStatus(Long assigneeId, LeaveStatus status);

    @Query("SELECT lr FROM LeaveRequest lr WHERE (lr.currentAssignee.id = :managerId OR (lr.currentAssignee IS NULL AND lr.requester.manager.id = :managerId)) AND lr.status = :status ORDER BY lr.createdAt DESC")
    List<LeaveRequest> findManagerPending(@Param("managerId") Long managerId, @Param("status") LeaveStatus status);

    List<LeaveRequest> findByStatus(LeaveStatus status);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.status IN :statuses AND lr.dueAt < :now")
    List<LeaveRequest> findOverdueRequests(@Param("statuses") List<LeaveStatus> statuses,
                                           @Param("now") Instant now);

    @Query("SELECT lr FROM LeaveRequest lr WHERE (lr.requester.manager.id = :managerId OR lr.requester.id = :managerId) " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate " +
           "AND lr.status IN :statuses")
    List<LeaveRequest> findTeamLeaves(@Param("managerId") Long managerId,
                                      @Param("startDate") LocalDate startDate,
                                      @Param("endDate") LocalDate endDate,
                                      @Param("statuses") List<LeaveStatus> statuses);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.requester.manager.id = :managerId " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate " +
           "AND lr.status IN :statuses AND lr.requester.id != :excludeEmployeeId")
    List<LeaveRequest> findTeamLeavesExcluding(@Param("managerId") Long managerId,
                                               @Param("startDate") LocalDate startDate,
                                               @Param("endDate") LocalDate endDate,
                                               @Param("statuses") List<LeaveStatus> statuses,
                                               @Param("excludeEmployeeId") Long excludeEmployeeId);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.startDate <= :endDate AND lr.endDate >= :startDate AND lr.status IN :statuses")
    List<LeaveRequest> findAllLeavesInRange(@Param("startDate") LocalDate startDate,
                                            @Param("endDate") LocalDate endDate,
                                            @Param("statuses") List<LeaveStatus> statuses);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.status = :status ORDER BY lr.createdAt ASC")
    List<LeaveRequest> findByStatusOrderByCreatedAtAsc(@Param("status") LeaveStatus status);
}
