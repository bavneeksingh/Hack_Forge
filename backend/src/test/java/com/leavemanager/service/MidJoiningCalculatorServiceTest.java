package com.leavemanager.service;

import com.leavemanager.domain.LeaveBalance;
import com.leavemanager.domain.LeaveType;
import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.Role;
import com.leavemanager.dto.*;
import com.leavemanager.exception.UnauthorizedActionException;
import com.leavemanager.repository.LeaveBalanceRepository;
import com.leavemanager.repository.LeaveTypeRepository;
import com.leavemanager.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MidJoiningCalculatorServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private LeaveTypeRepository leaveTypeRepository;
    @Mock
    private LeaveBalanceRepository balanceRepository;
    @Mock
    private BalanceService balanceService;

    private Clock fixedClock;
    private MidJoiningCalculatorService calculatorService;

    private LeaveType annualLeave;
    private LeaveType sickLeave;
    private LeaveType personalLeave;
    private User hrUser;
    private User managerUser;
    private User employeeUser;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-07-15T10:00:00Z"), ZoneId.of("UTC"));
        calculatorService = new MidJoiningCalculatorService(
                userRepository, leaveTypeRepository, balanceRepository, balanceService, fixedClock
        );

        annualLeave = new LeaveType("Annual Leave", 24);
        annualLeave.setId(1L);

        sickLeave = new LeaveType("Sick Leave", 12);
        sickLeave.setId(2L);

        personalLeave = new LeaveType("Personal Leave", 5);
        personalLeave.setId(3L);

        hrUser = new User("hr@company.com", "pass", "Helen HR", Role.HR, LocalDate.of(2024, 1, 1));
        hrUser.setId(7L);

        managerUser = new User("manager@company.com", "pass", "Alice Manager", Role.MANAGER, LocalDate.of(2024, 1, 15));
        managerUser.setId(1L);

        employeeUser = new User("frank@company.com", "pass", "Frank Dev", Role.EMPLOYEE, LocalDate.of(2026, 7, 1));
        employeeUser.setId(6L);
        employeeUser.setManager(managerUser);
    }

    @Test
    void previewCalculation_joinedJuly_proRatesCorrectly() {
        when(leaveTypeRepository.findAll()).thenReturn(List.of(annualLeave, sickLeave, personalLeave));
        when(balanceService.calculateEntitlementForDate(eq(LocalDate.of(2026, 7, 1)), eq(annualLeave), eq(2026)))
                .thenReturn(new BigDecimal("12.0"));
        when(balanceService.calculateEntitlementForDate(eq(LocalDate.of(2026, 7, 1)), eq(sickLeave), eq(2026)))
                .thenReturn(new BigDecimal("6.0"));
        when(balanceService.calculateEntitlementForDate(eq(LocalDate.of(2026, 7, 1)), eq(personalLeave), eq(2026)))
                .thenReturn(new BigDecimal("2.5"));

        MidJoiningPreviewResponse response = calculatorService.previewCalculation(LocalDate.of(2026, 7, 1), 2026);

        assertThat(response.year()).isEqualTo(2026);
        assertThat(response.remainingMonths()).isEqualTo(6);
        assertThat(response.totalAnnualDays()).isEqualByComparingTo("41.0");
        assertThat(response.totalProRatedDays()).isEqualByComparingTo("20.5");
        assertThat(response.totalAdjustedDays()).isEqualByComparingTo("-20.5");
        assertThat(response.calculations()).hasSize(3);

        MidJoiningCalculationDto annualCalc = response.calculations().get(0);
        assertThat(annualCalc.leaveTypeName()).isEqualTo("Annual Leave");
        assertThat(annualCalc.proRatedEntitlement()).isEqualByComparingTo("12.0");
        assertThat(annualCalc.monthlyBreakdown()).hasSize(12);
        // Months 1-6 inactive, months 7-12 active
        assertThat(annualCalc.monthlyBreakdown().get(0).active()).isFalse();
        assertThat(annualCalc.monthlyBreakdown().get(6).active()).isTrue();
    }

    @Test
    void getOrganizationUsersForMidJoining_hrUser_seesAllUsers() {
        when(userRepository.findById(7L)).thenReturn(Optional.of(hrUser));
        when(userRepository.findAll()).thenReturn(List.of(hrUser, managerUser, employeeUser));
        when(leaveTypeRepository.findAll()).thenReturn(List.of(annualLeave));
        when(balanceService.getEmployeeBalances(any())).thenReturn(Collections.emptyList());
        when(balanceService.calculateEntitlementForDate(any(), any(), eq(2026))).thenReturn(new BigDecimal("24.0"));

        List<UserAdjustmentDto> users = calculatorService.getOrganizationUsersForMidJoining(2026, 7L);

        assertThat(users).hasSize(3);
    }

    @Test
    void adjustUserBalances_hrCanAdjustManagerAndEmployee() {
        when(userRepository.findById(7L)).thenReturn(Optional.of(hrUser));
        when(userRepository.findById(1L)).thenReturn(Optional.of(managerUser));
        when(leaveTypeRepository.findAll()).thenReturn(List.of(annualLeave));
        when(balanceService.calculateEntitlement(eq(managerUser), eq(annualLeave), eq(2026)))
                .thenReturn(new BigDecimal("12.0"));
        when(balanceService.getEmployeeBalances(1L)).thenReturn(List.of(
                new LeaveBalance(managerUser, annualLeave, 2026, new BigDecimal("12.0"))
        ));

        AdjustBalanceRequest req = new AdjustBalanceRequest(1L, LocalDate.of(2026, 7, 1), 2026, null, "Mid-joining manager adjustment");
        UserAdjustmentDto updated = calculatorService.adjustUserBalances(7L, req);

        assertThat(updated.id()).isEqualTo(1L);
        assertThat(updated.joinDate()).isEqualTo(LocalDate.of(2026, 7, 1));
        verify(balanceService).setEntitlement(eq(managerUser), eq(annualLeave), eq(2026), eq(new BigDecimal("12.0")));
    }

    @Test
    void adjustUserBalances_employeeActor_throwsUnauthorized() {
        when(userRepository.findById(6L)).thenReturn(Optional.of(employeeUser));
        when(userRepository.findById(1L)).thenReturn(Optional.of(managerUser));

        AdjustBalanceRequest req = new AdjustBalanceRequest(1L, LocalDate.of(2026, 7, 1), 2026, null, "Unauthorized attempt");

        assertThatThrownBy(() -> calculatorService.adjustUserBalances(6L, req))
                .isInstanceOf(UnauthorizedActionException.class);
    }

    @Test
    void recalibrateAllForYear_hrOnly() {
        when(userRepository.findById(7L)).thenReturn(Optional.of(hrUser));
        when(userRepository.findAll()).thenReturn(List.of(hrUser, managerUser, employeeUser));
        when(leaveTypeRepository.findAll()).thenReturn(List.of(annualLeave));
        when(balanceService.calculateEntitlement(eq(employeeUser), eq(annualLeave), eq(2026)))
                .thenReturn(new BigDecimal("12.0"));
        when(balanceService.getEmployeeBalances(6L)).thenReturn(List.of(
                new LeaveBalance(employeeUser, annualLeave, 2026, new BigDecimal("12.0"))
        ));

        BatchRecalibrateResponse response = calculatorService.recalibrateAllForYear(7L, 2026);

        assertThat(response.year()).isEqualTo(2026);
        assertThat(response.usersAdjusted()).isEqualTo(1); // Frank joined in 2026
        assertThat(response.adjustedUsers().get(0).id()).isEqualTo(6L);
        verify(balanceService).setEntitlement(eq(employeeUser), eq(annualLeave), eq(2026), eq(new BigDecimal("12.0")));
    }
}
