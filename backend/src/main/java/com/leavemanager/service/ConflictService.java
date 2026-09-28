package com.leavemanager.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leavemanager.domain.LeaveRequest;
import com.leavemanager.domain.Team;
import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.LeaveStatus;
import com.leavemanager.dto.ConflictDetail;
import com.leavemanager.repository.LeaveRequestRepository;
import com.leavemanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Detects team conflicts: for each requested working day, calculates the percentage
 * of team members who are away (APPROVED or PENDING leave) and flags if any day
 * exceeds the team's dynamic conflict threshold (taking weekly workload into account).
 *
 * Conflict flags are INFORMATION ONLY — they never block submit or approval.
 */
@Service
public class ConflictService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final WorkingDayService workingDayService;
    private final WorkloadService workloadService;
    private final ObjectMapper objectMapper;

    public ConflictService(LeaveRequestRepository leaveRequestRepository,
                           UserRepository userRepository,
                           WorkingDayService workingDayService,
                           ObjectMapper objectMapper) {
        this(leaveRequestRepository, userRepository, workingDayService, null, objectMapper);
    }

    @Autowired
    public ConflictService(LeaveRequestRepository leaveRequestRepository,
                           UserRepository userRepository,
                           WorkingDayService workingDayService,
                           WorkloadService workloadService,
                           ObjectMapper objectMapper) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.userRepository = userRepository;
        this.workingDayService = workingDayService;
        this.workloadService = workloadService;
        this.objectMapper = objectMapper;
    }

    /**
     * Check conflict for a leave request. Updates the request's conflictFlagged
     * and conflictDetails fields using the day's dynamic workload threshold.
     */
    public void checkAndSetConflict(LeaveRequest request, User requester) {
        User manager = requester.getManager();
        if (manager == null) {
            request.setConflictFlagged(false);
            request.setConflictDetails(null);
            return;
        }

        List<User> teammates = userRepository.findByManagerId(manager.getId());
        int teamSize = teammates.size();

        if (teamSize <= 1) {
            request.setConflictFlagged(false);
            request.setConflictDetails(null);
            return;
        }

        List<LocalDate> workingDays = workingDayService.getWorkingDaysInRange(
                request.getStartDate(), request.getEndDate());

        List<LeaveStatus> relevantStatuses = List.of(
                LeaveStatus.APPROVED, LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_HR);
        List<LeaveRequest> teammateLeaves = leaveRequestRepository.findTeamLeavesExcluding(
                manager.getId(),
                request.getStartDate(),
                request.getEndDate(),
                relevantStatuses,
                requester.getId()
        );

        Team team = requester.getTeam();

        List<ConflictDetail> conflicts = new ArrayList<>();
        boolean flagged = false;

        for (LocalDate day : workingDays) {
            List<String> awayNames = new ArrayList<>();

            for (LeaveRequest tl : teammateLeaves) {
                if (!day.isBefore(tl.getStartDate()) && !day.isAfter(tl.getEndDate())) {
                    awayNames.add(tl.getRequester().getName());
                }
            }

            double awayPct = (double) (awayNames.size() + 1) / teamSize;

            BigDecimal dayThreshold = workloadService != null
                    ? workloadService.getEffectiveThresholdForDate(team, day)
                    : (team != null && team.getConflictThreshold() != null ? team.getConflictThreshold() : new BigDecimal("0.40"));

            if (awayPct >= dayThreshold.doubleValue()) {
                flagged = true;
                conflicts.add(new ConflictDetail(day, awayNames, Math.round(awayPct * 100.0) / 100.0));
            }
        }

        request.setConflictFlagged(flagged);
        if (flagged) {
            try {
                request.setConflictDetails(objectMapper.writeValueAsString(conflicts));
            } catch (JsonProcessingException e) {
                request.setConflictDetails("[]");
            }
        } else {
            request.setConflictDetails(null);
        }
    }

    /**
     * Preview conflict for a potential leave request (before submission).
     */
    public ConflictPreviewResult previewConflict(User requester, LocalDate startDate, LocalDate endDate) {
        User manager = requester.getManager();
        if (manager == null) {
            return new ConflictPreviewResult(false, List.of());
        }

        List<User> teammates = userRepository.findByManagerId(manager.getId());
        int teamSize = teammates.size();

        if (teamSize <= 1) {
            return new ConflictPreviewResult(false, List.of());
        }

        List<LocalDate> workingDays = workingDayService.getWorkingDaysInRange(startDate, endDate);

        List<LeaveStatus> relevantStatuses = List.of(
                LeaveStatus.APPROVED, LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_HR);
        List<LeaveRequest> teammateLeaves = leaveRequestRepository.findTeamLeavesExcluding(
                manager.getId(), startDate, endDate, relevantStatuses, requester.getId());

        Team team = requester.getTeam();

        List<ConflictDetail> conflicts = new ArrayList<>();
        boolean flagged = false;

        for (LocalDate day : workingDays) {
            List<String> awayNames = new ArrayList<>();
            for (LeaveRequest tl : teammateLeaves) {
                if (!day.isBefore(tl.getStartDate()) && !day.isAfter(tl.getEndDate())) {
                    awayNames.add(tl.getRequester().getName());
                }
            }
            double awayPct = (double) (awayNames.size() + 1) / teamSize;

            BigDecimal dayThreshold = workloadService != null
                    ? workloadService.getEffectiveThresholdForDate(team, day)
                    : (team != null && team.getConflictThreshold() != null ? team.getConflictThreshold() : new BigDecimal("0.40"));

            if (awayPct >= dayThreshold.doubleValue()) {
                flagged = true;
                conflicts.add(new ConflictDetail(day, awayNames, Math.round(awayPct * 100.0) / 100.0));
            }
        }

        return new ConflictPreviewResult(flagged, conflicts);
    }

    public record ConflictPreviewResult(boolean flagged, List<ConflictDetail> details) {}
}
