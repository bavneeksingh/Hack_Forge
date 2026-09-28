package com.leavemanager.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.leavemanager.domain.LeaveRequest;
import com.leavemanager.domain.Team;
import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.LeaveStatus;
import com.leavemanager.domain.enums.Role;
import com.leavemanager.repository.LeaveRequestRepository;
import com.leavemanager.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConflictServiceTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WorkingDayService workingDayService;

    private ConflictService conflictService;
    private ObjectMapper objectMapper;

    private User manager;
    private User employee1;
    private User employee2;
    private User employee3;
    private Team team;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        conflictService = new ConflictService(leaveRequestRepository, userRepository, workingDayService, objectMapper);

        manager = new User("manager@co.com", "pass", "Manager", Role.MANAGER, LocalDate.of(2024, 1, 1));
        manager.setId(1L);

        team = new Team("Engineering", manager);
        team.setId(1L);
        team.setConflictThreshold(new BigDecimal("0.40"));

        employee1 = new User("emp1@co.com", "pass", "Employee 1", Role.EMPLOYEE, LocalDate.of(2024, 1, 1));
        employee1.setId(2L);
        employee1.setManager(manager);
        employee1.setTeam(team);

        employee2 = new User("emp2@co.com", "pass", "Employee 2", Role.EMPLOYEE, LocalDate.of(2024, 1, 1));
        employee2.setId(3L);
        employee2.setManager(manager);

        employee3 = new User("emp3@co.com", "pass", "Employee 3", Role.EMPLOYEE, LocalDate.of(2024, 1, 1));
        employee3.setId(4L);
        employee3.setManager(manager);
    }

    @Test
    void noConflict_whenNoTeammatesOnLeave() {
        LeaveRequest request = createRequest(employee1, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 9));

        when(userRepository.findByManagerId(1L)).thenReturn(List.of(employee1, employee2, employee3));
        when(workingDayService.getWorkingDaysInRange(any(), any()))
                .thenReturn(List.of(LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 6)));
        when(leaveRequestRepository.findTeamLeavesExcluding(any(), any(), any(), any(), any()))
                .thenReturn(List.of());

        conflictService.checkAndSetConflict(request, employee1);

        // 1/3 = 0.33 < 0.40 threshold
        assertThat(request.isConflictFlagged()).isFalse();
    }

    @Test
    void conflict_whenThresholdExceeded() {
        LeaveRequest request = createRequest(employee1, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 9));

        when(userRepository.findByManagerId(1L)).thenReturn(List.of(employee1, employee2, employee3));
        when(workingDayService.getWorkingDaysInRange(any(), any()))
                .thenReturn(List.of(LocalDate.of(2026, 10, 5)));

        // Employee2 is already on leave on Oct 5
        LeaveRequest existingLeave = createRequest(employee2, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 5));
        existingLeave.setStatus(LeaveStatus.APPROVED);
        when(leaveRequestRepository.findTeamLeavesExcluding(any(), any(), any(), any(), eq(2L)))
                .thenReturn(List.of(existingLeave));

        conflictService.checkAndSetConflict(request, employee1);

        // (1 teammate + 1 requester) / 3 = 2/3 = 0.67 >= 0.40
        assertThat(request.isConflictFlagged()).isTrue();
        assertThat(request.getConflictDetails()).isNotNull();
    }

    @Test
    void noConflict_whenNoManager() {
        User noManagerEmployee = new User("solo@co.com", "pass", "Solo", Role.EMPLOYEE, LocalDate.of(2024, 1, 1));
        noManagerEmployee.setId(99L);
        // No manager set

        LeaveRequest request = createRequest(noManagerEmployee, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 5));

        conflictService.checkAndSetConflict(request, noManagerEmployee);

        assertThat(request.isConflictFlagged()).isFalse();
    }

    @Test
    void noConflict_whenSoloTeamMember() {
        when(userRepository.findByManagerId(1L)).thenReturn(List.of(employee1)); // only 1 member

        LeaveRequest request = createRequest(employee1, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 5));
        conflictService.checkAndSetConflict(request, employee1);

        assertThat(request.isConflictFlagged()).isFalse();
    }

    @Test
    void previewConflict_returnsFlagAndDetails() {
        when(userRepository.findByManagerId(1L)).thenReturn(List.of(employee1, employee2));
        when(workingDayService.getWorkingDaysInRange(any(), any()))
                .thenReturn(List.of(LocalDate.of(2026, 10, 5)));

        LeaveRequest existingLeave = createRequest(employee2, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 5));
        existingLeave.setStatus(LeaveStatus.APPROVED);
        when(leaveRequestRepository.findTeamLeavesExcluding(any(), any(), any(), any(), eq(2L)))
                .thenReturn(List.of(existingLeave));

        ConflictService.ConflictPreviewResult result = conflictService.previewConflict(
                employee1, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 5));

        // (1 + 1) / 2 = 1.0 >= 0.40
        assertThat(result.flagged()).isTrue();
        assertThat(result.details()).hasSize(1);
        assertThat(result.details().get(0).pct()).isEqualTo(1.0);
    }

    @Test
    void conflict_evaluatesAgainstDynamicWorkloadThreshold() {
        WorkloadService mockWorkloadService = org.mockito.Mockito.mock(WorkloadService.class);
        ConflictService dynamicConflictService = new ConflictService(
                leaveRequestRepository, userRepository, workingDayService, mockWorkloadService, objectMapper);

        when(userRepository.findByManagerId(1L)).thenReturn(List.of(employee1, employee2, employee3)); // 3 members
        when(workingDayService.getWorkingDaysInRange(any(), any()))
                .thenReturn(List.of(LocalDate.of(2026, 10, 14)));

        // 1 teammate away -> (1+1)/3 = 67%
        LeaveRequest existingLeave = createRequest(employee2, LocalDate.of(2026, 10, 14), LocalDate.of(2026, 10, 14));
        existingLeave.setStatus(LeaveStatus.APPROVED);
        when(leaveRequestRepository.findTeamLeavesExcluding(any(), any(), any(), any(), eq(2L)))
                .thenReturn(List.of(existingLeave));

        // When week has CRITICAL workload with threshold 75% -> 67% < 75% -> NOT flagged
        when(mockWorkloadService.getEffectiveThresholdForDate(eq(team), eq(LocalDate.of(2026, 10, 14))))
                .thenReturn(new BigDecimal("0.75"));

        LeaveRequest request = createRequest(employee1, LocalDate.of(2026, 10, 14), LocalDate.of(2026, 10, 14));
        dynamicConflictService.checkAndSetConflict(request, employee1);
        assertThat(request.isConflictFlagged()).isFalse();

        // When week has HIGH workload with threshold 60% -> 67% >= 60% -> FLAGGED
        when(mockWorkloadService.getEffectiveThresholdForDate(eq(team), eq(LocalDate.of(2026, 10, 14))))
                .thenReturn(new BigDecimal("0.60"));

        dynamicConflictService.checkAndSetConflict(request, employee1);
        assertThat(request.isConflictFlagged()).isTrue();
    }

    private LeaveRequest createRequest(User requester, LocalDate start, LocalDate end) {
        LeaveRequest request = new LeaveRequest();
        request.setId(100L);
        request.setRequester(requester);
        request.setStartDate(start);
        request.setEndDate(end);
        request.setStatus(LeaveStatus.PENDING_MANAGER);
        request.setCreatedAt(Instant.now());
        request.setUpdatedAt(Instant.now());
        return request;
    }
}
