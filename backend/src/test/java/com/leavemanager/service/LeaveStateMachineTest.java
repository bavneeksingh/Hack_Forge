package com.leavemanager.service;

import com.leavemanager.domain.ApprovalHistory;
import com.leavemanager.domain.LeaveRequest;
import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.LeaveAction;
import com.leavemanager.domain.enums.LeaveStatus;
import com.leavemanager.domain.enums.Role;
import com.leavemanager.exception.IllegalStateTransitionException;
import com.leavemanager.exception.UnauthorizedActionException;
import com.leavemanager.repository.ApprovalHistoryRepository;
import org.mockito.Mockito;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveStateMachineTest {

    @Mock
    private ApprovalHistoryRepository approvalHistoryRepository;

    private Clock fixedClock;
    private LeaveStateMachine stateMachine;

    private User employee;
    private User manager;
    private User hrUser;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneId.of("UTC"));
        stateMachine = new LeaveStateMachine(approvalHistoryRepository, fixedClock);

        Mockito.lenient().when(approvalHistoryRepository.save(any(ApprovalHistory.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        employee = new User("charlie@company.com", "pass", "Charlie", Role.EMPLOYEE, LocalDate.of(2024, 3, 1));
        employee.setId(3L);

        manager = new User("alice@company.com", "pass", "Alice Manager", Role.MANAGER, LocalDate.of(2024, 1, 15));
        manager.setId(1L);

        hrUser = new User("hr@company.com", "pass", "Helen HR", Role.HR, LocalDate.of(2024, 1, 1));
        hrUser.setId(7L);

        employee.setManager(manager);
    }

    private LeaveRequest createRequest(LeaveStatus status) {
        LeaveRequest request = new LeaveRequest();
        request.setId(1L);
        request.setRequester(employee);
        request.setStatus(status);
        request.setCurrentAssignee(manager);
        request.setStartDate(LocalDate.of(2026, 10, 10));
        request.setEndDate(LocalDate.of(2026, 10, 15));
        request.setWorkingDays(4);
        request.setCreatedAt(Instant.now(fixedClock));
        request.setUpdatedAt(Instant.now(fixedClock));
        return request;
    }

    // ─── SUBMIT ────────────────────────────────────────────────────

    @Test
    void submit_newRequest_transitionsToPendingManager() {
        LeaveRequest request = createRequest(null);
        request.setStatus(null);

        LeaveStatus result = stateMachine.transition(request, LeaveAction.SUBMIT, employee, null);

        assertThat(result).isEqualTo(LeaveStatus.PENDING_MANAGER);
        assertThat(request.getStatus()).isEqualTo(LeaveStatus.PENDING_MANAGER);
    }

    // ─── MANAGER APPROVE ──────────────────────────────────────────

    @Test
    void managerApprove_pendingManager_transitionsToPendingHr() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_MANAGER);

        LeaveStatus result = stateMachine.transition(request, LeaveAction.MANAGER_APPROVE, manager, "Looks good");

        assertThat(result).isEqualTo(LeaveStatus.PENDING_HR);
    }

    @Test
    void managerApprove_wrongStatus_throws() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_HR);

        assertThatThrownBy(() -> stateMachine.transition(request, LeaveAction.MANAGER_APPROVE, manager, null))
                .isInstanceOf(IllegalStateTransitionException.class);
    }

    @Test
    void managerApprove_wrongActor_throws() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_MANAGER);
        User otherManager = new User("other@co.com", "pass", "Other", Role.MANAGER, LocalDate.now());
        otherManager.setId(99L);
        request.setCurrentAssignee(manager); // assigned to manager (id=1), not otherManager

        assertThatThrownBy(() -> stateMachine.transition(request, LeaveAction.MANAGER_APPROVE, otherManager, null))
                .isInstanceOf(UnauthorizedActionException.class);
    }

    // ─── MANAGER REJECT ───────────────────────────────────────────

    @Test
    void managerReject_withComment_transitionsToRejected() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_MANAGER);

        LeaveStatus result = stateMachine.transition(request, LeaveAction.MANAGER_REJECT, manager, "Not enough coverage");

        assertThat(result).isEqualTo(LeaveStatus.REJECTED);
    }

    @Test
    void managerReject_withoutComment_throws() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_MANAGER);

        assertThatThrownBy(() -> stateMachine.transition(request, LeaveAction.MANAGER_REJECT, manager, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Comment is required");
    }

    @Test
    void managerReject_withBlankComment_throws() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_MANAGER);

        assertThatThrownBy(() -> stateMachine.transition(request, LeaveAction.MANAGER_REJECT, manager, "  "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ─── HR APPROVE ───────────────────────────────────────────────

    @Test
    void hrApprove_pendingHr_transitionsToApproved() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_HR);

        LeaveStatus result = stateMachine.transition(request, LeaveAction.HR_APPROVE, hrUser, null);

        assertThat(result).isEqualTo(LeaveStatus.APPROVED);
    }

    @Test
    void hrApprove_wrongStatus_throws() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_MANAGER);

        assertThatThrownBy(() -> stateMachine.transition(request, LeaveAction.HR_APPROVE, hrUser, null))
                .isInstanceOf(IllegalStateTransitionException.class);
    }

    // ─── HR REJECT ────────────────────────────────────────────────

    @Test
    void hrReject_pendingHr_transitionsToRejected() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_HR);

        LeaveStatus result = stateMachine.transition(request, LeaveAction.HR_REJECT, hrUser, "Policy violation");

        assertThat(result).isEqualTo(LeaveStatus.REJECTED);
    }

    @Test
    void hrReject_withoutComment_throws() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_HR);

        assertThatThrownBy(() -> stateMachine.transition(request, LeaveAction.HR_REJECT, hrUser, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ─── CANCEL ───────────────────────────────────────────────────

    @Test
    void cancel_pendingManager_transitionsToCancelled() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_MANAGER);

        LeaveStatus result = stateMachine.transition(request, LeaveAction.CANCEL, employee, "Changed plans");

        assertThat(result).isEqualTo(LeaveStatus.CANCELLED);
    }

    @Test
    void cancel_pendingHr_transitionsToCancelled() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_HR);

        LeaveStatus result = stateMachine.transition(request, LeaveAction.CANCEL, employee, null);

        assertThat(result).isEqualTo(LeaveStatus.CANCELLED);
    }

    @Test
    void cancel_approved_futureEndDate_transitionsToCancelled() {
        LeaveRequest request = createRequest(LeaveStatus.APPROVED);
        request.setEndDate(LocalDate.of(2026, 12, 31)); // future

        LeaveStatus result = stateMachine.transition(request, LeaveAction.CANCEL, employee, null);

        assertThat(result).isEqualTo(LeaveStatus.CANCELLED);
    }

    @Test
    void cancel_approved_pastEndDate_throws() {
        LeaveRequest request = createRequest(LeaveStatus.APPROVED);
        request.setEndDate(LocalDate.of(2026, 9, 1)); // past relative to fixed clock (Oct 1)

        assertThatThrownBy(() -> stateMachine.transition(request, LeaveAction.CANCEL, employee, null))
                .isInstanceOf(IllegalStateTransitionException.class)
                .hasMessageContaining("already ended");
    }

    @Test
    void cancel_rejected_throws() {
        LeaveRequest request = createRequest(LeaveStatus.REJECTED);

        assertThatThrownBy(() -> stateMachine.transition(request, LeaveAction.CANCEL, employee, null))
                .isInstanceOf(IllegalStateTransitionException.class);
    }

    @Test
    void cancel_byNonOwner_throws() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_MANAGER);

        assertThatThrownBy(() -> stateMachine.transition(request, LeaveAction.CANCEL, manager, null))
                .isInstanceOf(UnauthorizedActionException.class);
    }

    // ─── AUDIT TRAIL ──────────────────────────────────────────────

    @Test
    void transition_writesApprovalHistory() {
        LeaveRequest request = createRequest(LeaveStatus.PENDING_MANAGER);
        ArgumentCaptor<ApprovalHistory> captor = ArgumentCaptor.forClass(ApprovalHistory.class);

        stateMachine.transition(request, LeaveAction.MANAGER_APPROVE, manager, "Approved");

        verify(approvalHistoryRepository).save(captor.capture());
        ApprovalHistory saved = captor.getValue();
        assertThat(saved.getAction()).isEqualTo(LeaveAction.MANAGER_APPROVE);
        assertThat(saved.getStage()).isEqualTo("PENDING_MANAGER");
        assertThat(saved.getActor()).isEqualTo(manager);
        assertThat(saved.getComment()).isEqualTo("Approved");
    }
}
