package com.leavemanager.service;

import com.leavemanager.domain.ApprovalHistory;
import com.leavemanager.domain.LeaveRequest;
import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.LeaveAction;
import com.leavemanager.domain.enums.LeaveStatus;
import com.leavemanager.exception.IllegalStateTransitionException;
import com.leavemanager.exception.UnauthorizedActionException;
import com.leavemanager.repository.ApprovalHistoryRepository;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;

/**
 * Single source of truth for all leave state transitions.
 * Every state change goes through this machine and writes ApprovalHistory.
 */
@Service
public class LeaveStateMachine {

    private final ApprovalHistoryRepository approvalHistoryRepository;
    private final Clock clock;

    public LeaveStateMachine(ApprovalHistoryRepository approvalHistoryRepository, Clock clock) {
        this.approvalHistoryRepository = approvalHistoryRepository;
        this.clock = clock;
    }

    /**
     * Execute a state transition on the leave request.
     * Validates the transition is legal and the actor has permission.
     * Writes an ApprovalHistory entry.
     *
     * @return the new status after transition
     */
    public LeaveStatus transition(LeaveRequest request, LeaveAction action, User actor, String comment) {
        LeaveStatus currentStatus = request.getStatus();
        LeaveStatus newStatus = resolveTransition(currentStatus, action);

        validateActorPermission(request, action, actor);
        validateComment(action, comment);

        if (action == LeaveAction.CANCEL) {
            validateCancellation(request);
        }

        // Apply the transition
        request.setStatus(newStatus);
        request.setUpdatedAt(Instant.now(clock));

        // Write audit trail
        ApprovalHistory history = new ApprovalHistory(
                request,
                currentStatus != null ? currentStatus.name() : "NEW",
                actor,
                action,
                comment,
                Instant.now(clock)
        );
        approvalHistoryRepository.save(history);

        return newStatus;
    }

    /**
     * Resolve the target status for a given (currentStatus, action) pair.
     * This is the complete transition table.
     */
    private LeaveStatus resolveTransition(LeaveStatus currentStatus, LeaveAction action) {
        return switch (action) {
            case SUBMIT -> {
                if (currentStatus != null) {
                    throw new IllegalStateTransitionException("SUBMIT is only valid for new requests");
                }
                yield LeaveStatus.PENDING_MANAGER;
            }
            case MANAGER_APPROVE -> {
                assertCurrentStatus(currentStatus, LeaveStatus.PENDING_MANAGER, action);
                yield LeaveStatus.PENDING_HR;
            }
            case MANAGER_REJECT -> {
                assertCurrentStatus(currentStatus, LeaveStatus.PENDING_MANAGER, action);
                yield LeaveStatus.REJECTED;
            }
            case HR_APPROVE -> {
                assertCurrentStatus(currentStatus, LeaveStatus.PENDING_HR, action);
                yield LeaveStatus.APPROVED;
            }
            case HR_REJECT -> {
                assertCurrentStatus(currentStatus, LeaveStatus.PENDING_HR, action);
                yield LeaveStatus.REJECTED;
            }
            case CANCEL -> {
                if (!Set.of(LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_HR, LeaveStatus.APPROVED)
                        .contains(currentStatus)) {
                    throw new IllegalStateTransitionException(
                            "Cannot cancel request in status: " + currentStatus);
                }
                yield LeaveStatus.CANCELLED;
            }
            case ESCALATE -> {
                // Escalation keeps the same status, just reassigns
                if (!Set.of(LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_HR).contains(currentStatus)) {
                    throw new IllegalStateTransitionException(
                            "Cannot escalate request in status: " + currentStatus);
                }
                yield currentStatus;
            }
        };
    }

    private void assertCurrentStatus(LeaveStatus currentStatus, LeaveStatus expected, LeaveAction action) {
        if (currentStatus != expected) {
            throw new IllegalStateTransitionException(
                    String.format("Action %s requires status %s but current is %s",
                            action, expected, currentStatus));
        }
    }

    /**
     * Validate that the actor has the right role/relationship for this action.
     */
    private void validateActorPermission(LeaveRequest request, LeaveAction action, User actor) {
        switch (action) {
            case CANCEL -> {
                // Only the request owner can cancel
                if (!request.getRequester().getId().equals(actor.getId())) {
                    throw new UnauthorizedActionException("Only the requester can cancel their leave");
                }
            }
            case MANAGER_APPROVE, MANAGER_REJECT -> {
                // Must be the current assignee OR the requester's manager
                boolean isAssignee = request.getCurrentAssignee() != null
                        && request.getCurrentAssignee().getId().equals(actor.getId());
                boolean isManager = request.getRequester().getManager() != null
                        && request.getRequester().getManager().getId().equals(actor.getId());
                if (!isAssignee && !isManager) {
                    throw new UnauthorizedActionException(
                            "Only the assigned manager or requester's manager can approve/reject");
                }
            }
            case HR_APPROVE, HR_REJECT -> {
                // Actor must have HR role (checked at controller level via Spring Security)
                // Additional check: any HR can act on PENDING_HR requests
            }
            case SUBMIT, ESCALATE -> {
                // SUBMIT: any authenticated user (employee)
                // ESCALATE: system action, no actor check
            }
        }
    }

    private void validateComment(LeaveAction action, String comment) {
        if ((action == LeaveAction.MANAGER_REJECT || action == LeaveAction.HR_REJECT)
                && (comment == null || comment.isBlank())) {
            throw new IllegalArgumentException("Comment is required for rejection");
        }
    }

    private void validateCancellation(LeaveRequest request) {
        if (request.getStatus() == LeaveStatus.APPROVED) {
            LocalDate today = LocalDate.now(clock);
            if (request.getEndDate().isBefore(today)) {
                throw new IllegalStateTransitionException(
                        "Cannot cancel approved leave that has already ended");
            }
        }
    }
}
