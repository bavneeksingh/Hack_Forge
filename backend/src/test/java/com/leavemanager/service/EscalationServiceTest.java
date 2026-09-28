package com.leavemanager.service;

import com.leavemanager.domain.LeaveRequest;
import com.leavemanager.domain.Team;
import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.LeaveStatus;
import com.leavemanager.domain.enums.Role;
import com.leavemanager.repository.ApprovalHistoryRepository;
import com.leavemanager.repository.LeaveRequestRepository;
import com.leavemanager.repository.UserRepository;
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
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EscalationServiceTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApprovalHistoryRepository approvalHistoryRepository;

    private Clock fixedClock;
    private EscalationService escalationService;

    private User employee;
    private User manager;
    private User seniorManager;
    private User hrUser1;
    private User hrUser2;
    private Team team;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneId.of("UTC"));
        escalationService = new EscalationService(
                leaveRequestRepository, userRepository, approvalHistoryRepository, fixedClock);

        seniorManager = new User("senior@co.com", "pass", "Senior Manager", Role.MANAGER, LocalDate.of(2024, 1, 1));
        seniorManager.setId(10L);

        manager = new User("manager@co.com", "pass", "Manager", Role.MANAGER, LocalDate.of(2024, 1, 1));
        manager.setId(1L);
        manager.setManager(seniorManager);

        team = new Team("Engineering", manager);
        team.setId(1L);
        team.setEscalationTimeoutHours(48);

        employee = new User("emp@co.com", "pass", "Employee", Role.EMPLOYEE, LocalDate.of(2024, 1, 1));
        employee.setId(2L);
        employee.setManager(manager);
        employee.setTeam(team);

        hrUser1 = new User("hr1@co.com", "pass", "HR 1", Role.HR, LocalDate.of(2024, 1, 1));
        hrUser1.setId(7L);

        hrUser2 = new User("hr2@co.com", "pass", "HR 2", Role.HR, LocalDate.of(2024, 1, 1));
        hrUser2.setId(8L);

        when(approvalHistoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(leaveRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void processEscalations_findsAndEscalatesOverdueRequests() {
        LeaveRequest request = createOverdueRequest(LeaveStatus.PENDING_MANAGER, manager);
        when(leaveRequestRepository.findOverdueRequests(any(), any())).thenReturn(List.of(request));

        escalationService.processEscalations();

        assertThat(request.isEscalated()).isTrue();
        assertThat(request.getCurrentAssignee()).isEqualTo(seniorManager);
    }

    @Test
    void escalate_managerStage_goesToManagersManager() {
        LeaveRequest request = createOverdueRequest(LeaveStatus.PENDING_MANAGER, manager);

        escalationService.escalate(request);

        assertThat(request.getCurrentAssignee()).isEqualTo(seniorManager);
        assertThat(request.isEscalated()).isTrue();
        assertThat(request.getEscalatedFrom()).isEqualTo("Manager");
        assertThat(request.isStageSkipped()).isTrue();
    }

    @Test
    void escalate_managerStage_noManagersManager_goesToHr() {
        manager.setManager(null); // no senior manager
        LeaveRequest request = createOverdueRequest(LeaveStatus.PENDING_MANAGER, manager);
        when(userRepository.findByRole(Role.HR)).thenReturn(List.of(hrUser1));

        escalationService.escalate(request);

        assertThat(request.getCurrentAssignee()).isEqualTo(hrUser1);
    }

    @Test
    void escalate_hrStage_rotatesToNextHrUser() {
        LeaveRequest request = createOverdueRequest(LeaveStatus.PENDING_HR, hrUser1);
        when(userRepository.findByRole(Role.HR)).thenReturn(List.of(hrUser1, hrUser2));

        escalationService.escalate(request);

        assertThat(request.getCurrentAssignee()).isEqualTo(hrUser2);
    }

    @Test
    void escalate_hrStage_wrapsAround() {
        LeaveRequest request = createOverdueRequest(LeaveStatus.PENDING_HR, hrUser2);
        when(userRepository.findByRole(Role.HR)).thenReturn(List.of(hrUser1, hrUser2));

        escalationService.escalate(request);

        assertThat(request.getCurrentAssignee()).isEqualTo(hrUser1);
    }

    @Test
    void escalate_resetsDueDate() {
        LeaveRequest request = createOverdueRequest(LeaveStatus.PENDING_MANAGER, manager);

        escalationService.escalate(request);

        Instant expectedDue = Instant.now(fixedClock).plus(48, ChronoUnit.HOURS);
        assertThat(request.getDueAt()).isEqualTo(expectedDue);
    }

    @Test
    void escalate_writesApprovalHistory() {
        LeaveRequest request = createOverdueRequest(LeaveStatus.PENDING_MANAGER, manager);

        escalationService.escalate(request);

        verify(approvalHistoryRepository).save(any());
    }

    private LeaveRequest createOverdueRequest(LeaveStatus status, User assignee) {
        LeaveRequest request = new LeaveRequest();
        request.setId(1L);
        request.setRequester(employee);
        request.setStatus(status);
        request.setCurrentAssignee(assignee);
        request.setDueAt(Instant.now(fixedClock).minus(1, ChronoUnit.HOURS)); // overdue
        request.setStartDate(LocalDate.of(2026, 10, 10));
        request.setEndDate(LocalDate.of(2026, 10, 15));
        request.setCreatedAt(Instant.now(fixedClock));
        request.setUpdatedAt(Instant.now(fixedClock));
        return request;
    }
}
