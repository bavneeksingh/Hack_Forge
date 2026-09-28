package com.leavemanager.service;

import com.leavemanager.domain.LeaveBalance;
import com.leavemanager.domain.LeaveType;
import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.Role;
import com.leavemanager.exception.InsufficientBalanceException;
import com.leavemanager.repository.LeaveBalanceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BalanceServiceTest {

    @Mock
    private LeaveBalanceRepository balanceRepository;

    private Clock fixedClock;
    private BalanceService balanceService;

    private User employee;
    private LeaveType annualLeave;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneId.of("UTC"));
        balanceService = new BalanceService(balanceRepository, fixedClock);

        employee = new User("charlie@co.com", "pass", "Charlie", Role.EMPLOYEE, LocalDate.of(2024, 3, 1));
        employee.setId(3L);

        annualLeave = new LeaveType("Annual Leave", 24);
        annualLeave.setId(1L);
    }

    // ─── Pro-rating ───────────────────────────────────────────────

    @Test
    void calculateEntitlement_joinedBeforeCurrentYear_fullEntitlement() {
        BigDecimal entitled = balanceService.calculateEntitlement(employee, annualLeave, 2026);
        assertThat(entitled).isEqualByComparingTo("24");
    }

    @Test
    void calculateEntitlement_joinedJuly_proRated() {
        // joined Jul 2026: remainingMonths = 13 - 7 = 6
        // entitled = round_to_half(24 * 6 / 12) = round_to_half(12.0) = 12.0
        User newEmployee = new User("frank@co.com", "pass", "Frank", Role.EMPLOYEE, LocalDate.of(2026, 7, 1));
        newEmployee.setId(6L);

        BigDecimal entitled = balanceService.calculateEntitlement(newEmployee, annualLeave, 2026);
        assertThat(entitled).isEqualByComparingTo("12.0");
    }

    @Test
    void calculateEntitlement_joinedOctober_proRated() {
        // joined Oct 2026: remainingMonths = 13 - 10 = 3
        // entitled = round_to_half(24 * 3 / 12) = round_to_half(6.0) = 6.0
        User octEmployee = new User("oct@co.com", "pass", "Oct", Role.EMPLOYEE, LocalDate.of(2026, 10, 1));
        octEmployee.setId(10L);

        BigDecimal entitled = balanceService.calculateEntitlement(octEmployee, annualLeave, 2026);
        assertThat(entitled).isEqualByComparingTo("6.0");
    }

    @Test
    void calculateEntitlement_joinedJanuary_fullYear() {
        // joined Jan 2026: remainingMonths = 13 - 1 = 12 -> 24 * 12/12 = 24
        User janEmployee = new User("jan@co.com", "pass", "Jan", Role.EMPLOYEE, LocalDate.of(2026, 1, 1));
        janEmployee.setId(11L);

        BigDecimal entitled = balanceService.calculateEntitlement(janEmployee, annualLeave, 2026);
        assertThat(entitled).isEqualByComparingTo("24.0");
    }

    @Test
    void calculateEntitlement_oddEntitlement_roundsToHalf() {
        // Leave type with 15 annual, joined May: remainingMonths = 13 - 5 = 8
        // 15 * 8 / 12 = 10.0 -> round_to_half = 10.0
        LeaveType sickLeave = new LeaveType("Sick Leave", 15);
        sickLeave.setId(2L);
        User mayEmployee = new User("may@co.com", "pass", "May", Role.EMPLOYEE, LocalDate.of(2026, 5, 1));
        mayEmployee.setId(12L);

        BigDecimal entitled = balanceService.calculateEntitlement(mayEmployee, sickLeave, 2026);
        assertThat(entitled).isEqualByComparingTo("10.0");
    }

    // ─── Reserve / Confirm / Restore ──────────────────────────────

    @Test
    void reservePending_sufficientBalance_increasesPending() {
        LeaveBalance balance = new LeaveBalance(employee, annualLeave, 2026, new BigDecimal("24"));
        when(balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(3L, 1L, 2026))
                .thenReturn(Optional.of(balance));
        when(balanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        balanceService.reservePending(employee, annualLeave, 5);

        assertThat(balance.getPending()).isEqualByComparingTo("5");
        assertThat(balance.getAvailable()).isEqualByComparingTo("19");
    }

    @Test
    void reservePending_insufficientBalance_throws() {
        LeaveBalance balance = new LeaveBalance(employee, annualLeave, 2026, new BigDecimal("3"));
        when(balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(3L, 1L, 2026))
                .thenReturn(Optional.of(balance));

        assertThatThrownBy(() -> balanceService.reservePending(employee, annualLeave, 5))
                .isInstanceOf(InsufficientBalanceException.class);
    }

    @Test
    void confirmUsed_movesPendingToUsed() {
        LeaveBalance balance = new LeaveBalance(employee, annualLeave, 2026, new BigDecimal("24"));
        balance.setPending(new BigDecimal("5"));
        when(balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(3L, 1L, 2026))
                .thenReturn(Optional.of(balance));
        when(balanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        balanceService.confirmUsed(employee, annualLeave, 5);

        assertThat(balance.getPending()).isEqualByComparingTo("0");
        assertThat(balance.getUsed()).isEqualByComparingTo("5");
        assertThat(balance.getAvailable()).isEqualByComparingTo("19");
    }

    @Test
    void restore_fromPending_decreasesPending() {
        LeaveBalance balance = new LeaveBalance(employee, annualLeave, 2026, new BigDecimal("24"));
        balance.setPending(new BigDecimal("5"));
        when(balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(3L, 1L, 2026))
                .thenReturn(Optional.of(balance));
        when(balanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        balanceService.restore(employee, annualLeave, 5, false);

        assertThat(balance.getPending()).isEqualByComparingTo("0");
        assertThat(balance.getAvailable()).isEqualByComparingTo("24");
    }

    @Test
    void restore_fromUsed_decreasesUsed() {
        LeaveBalance balance = new LeaveBalance(employee, annualLeave, 2026, new BigDecimal("24"));
        balance.setUsed(new BigDecimal("5"));
        when(balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(3L, 1L, 2026))
                .thenReturn(Optional.of(balance));
        when(balanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        balanceService.restore(employee, annualLeave, 5, true);

        assertThat(balance.getUsed()).isEqualByComparingTo("0");
        assertThat(balance.getAvailable()).isEqualByComparingTo("24");
    }
}
