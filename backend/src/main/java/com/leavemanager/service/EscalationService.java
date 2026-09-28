package com.leavemanager.service;

import com.leavemanager.domain.ApprovalHistory;
import com.leavemanager.domain.LeaveRequest;
import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.LeaveAction;
import com.leavemanager.domain.enums.LeaveStatus;
import com.leavemanager.domain.enums.Role;
import com.leavemanager.repository.ApprovalHistoryRepository;
import com.leavemanager.repository.LeaveRequestRepository;
import com.leavemanager.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Handles escalation logic for overdue leave requests.
 *
 * Escalation chain:
 * - Manager stage: current manager -> manager's manager -> HR pool
 * - HR stage: current HR -> next HR user in rotation
 *
 * Each escalation writes an ApprovalHistory entry and sets stageSkipped=true.
 */
@Service
public class EscalationService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final ApprovalHistoryRepository approvalHistoryRepository;
    private final Clock clock;

    public EscalationService(LeaveRequestRepository leaveRequestRepository,
                             UserRepository userRepository,
                             ApprovalHistoryRepository approvalHistoryRepository,
                             Clock clock) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.userRepository = userRepository;
        this.approvalHistoryRepository = approvalHistoryRepository;
        this.clock = clock;
    }

    /**
     * Check and escalate all overdue requests. Called by the scheduler.
     */
    @Transactional
    public void processEscalations() {
        Instant now = Instant.now(clock);
        List<LeaveStatus> pendingStatuses = List.of(LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_HR);
        List<LeaveRequest> overdueRequests = leaveRequestRepository.findOverdueRequests(pendingStatuses, now);

        for (LeaveRequest request : overdueRequests) {
            escalate(request);
        }
    }

    /**
     * Escalate a single request to the next approver.
     */
    void escalate(LeaveRequest request) {
        User currentAssignee = request.getCurrentAssignee();
        String previousAssigneeName = currentAssignee != null ? currentAssignee.getName() : "Unknown";

        User newAssignee = findNextApprover(request, currentAssignee);

        if (newAssignee == null) {
            // No one to escalate to; leave as-is
            return;
        }

        // Record escalation
        request.setEscalated(true);
        request.setEscalatedFrom(previousAssigneeName);
        request.setStageSkipped(true);
        request.setCurrentAssignee(newAssignee);
        request.setUpdatedAt(Instant.now(clock));

        // Reset due date based on team's escalation timeout
        int timeoutHours = 48;
        if (request.getRequester().getTeam() != null) {
            timeoutHours = request.getRequester().getTeam().getEscalationTimeoutHours();
        }
        request.setDueAt(Instant.now(clock).plus(timeoutHours, ChronoUnit.HOURS));

        leaveRequestRepository.save(request);

        // Write audit trail
        ApprovalHistory history = new ApprovalHistory(
                request,
                request.getStatus().name(),
                null, // System action
                LeaveAction.ESCALATE,
                "Escalated from " + previousAssigneeName + " to " + newAssignee.getName() + " (timeout)",
                Instant.now(clock)
        );
        approvalHistoryRepository.save(history);
    }

    /**
     * Find the next approver in the escalation chain.
     */
    private User findNextApprover(LeaveRequest request, User currentAssignee) {
        if (request.getStatus() == LeaveStatus.PENDING_MANAGER) {
            return escalateManagerStage(currentAssignee);
        } else if (request.getStatus() == LeaveStatus.PENDING_HR) {
            return escalateHrStage(currentAssignee);
        }
        return null;
    }

    /**
     * Manager escalation chain: manager -> manager's manager -> first HR user
     */
    private User escalateManagerStage(User currentManager) {
        if (currentManager == null) {
            return findFirstHrUser();
        }

        // Try manager's manager
        User managerOfManager = currentManager.getManager();
        if (managerOfManager != null) {
            return managerOfManager;
        }

        // Fall back to HR pool
        return findFirstHrUser();
    }

    /**
     * HR escalation: rotate to the next HR user
     */
    private User escalateHrStage(User currentHr) {
        List<User> hrUsers = userRepository.findByRole(Role.HR);
        if (hrUsers.isEmpty()) {
            return null;
        }

        if (currentHr == null) {
            return hrUsers.get(0);
        }

        // Find the next HR user after the current one
        for (int i = 0; i < hrUsers.size(); i++) {
            if (hrUsers.get(i).getId().equals(currentHr.getId())) {
                return hrUsers.get((i + 1) % hrUsers.size());
            }
        }

        return hrUsers.get(0);
    }

    private User findFirstHrUser() {
        List<User> hrUsers = userRepository.findByRole(Role.HR);
        return hrUsers.isEmpty() ? null : hrUsers.get(0);
    }
}
