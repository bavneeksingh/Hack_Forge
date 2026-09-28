package com.leavemanager.service;

import com.leavemanager.domain.LeaveBalance;
import com.leavemanager.domain.LeaveType;
import com.leavemanager.domain.User;
import com.leavemanager.exception.InsufficientBalanceException;
import com.leavemanager.exception.ResourceNotFoundException;
import com.leavemanager.repository.LeaveBalanceRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

/**
 * Manages leave balances: initialization with pro-rating, reservation, confirmation, and restoration.
 */
@Service
public class BalanceService {

    private final LeaveBalanceRepository balanceRepository;
    private final Clock clock;

    public BalanceService(LeaveBalanceRepository balanceRepository, Clock clock) {
        this.balanceRepository = balanceRepository;
        this.clock = clock;
    }

    /**
     * Initialize or return existing balance for (employee, leaveType, year).
     * Pro-rates for employees who joined in the current year.
     */
    public LeaveBalance getOrInitializeBalance(User employee, LeaveType leaveType, int year) {
        return balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(
                employee.getId(), leaveType.getId(), year
        ).orElseGet(() -> {
            BigDecimal entitled = calculateEntitlement(employee, leaveType, year);
            LeaveBalance balance = new LeaveBalance(employee, leaveType, year, entitled);
            return balanceRepository.save(balance);
        });
    }

    /**
     * On submit: pending += days. Throws if insufficient available balance.
     */
    public void reservePending(User employee, LeaveType leaveType, int workingDays) {
        int year = LocalDate.now(clock).getYear();
        LeaveBalance balance = getOrInitializeBalance(employee, leaveType, year);
        BigDecimal days = BigDecimal.valueOf(workingDays);

        if (balance.getAvailable().compareTo(days) < 0) {
            throw new InsufficientBalanceException(
                    String.format("Insufficient %s balance. Available: %s, Requested: %d",
                            leaveType.getName(), balance.getAvailable(), workingDays));
        }

        balance.setPending(balance.getPending().add(days));
        balanceRepository.save(balance);
    }

    /**
     * On final approve: pending -= days, used += days.
     */
    public void confirmUsed(User employee, LeaveType leaveType, int workingDays) {
        int year = LocalDate.now(clock).getYear();
        LeaveBalance balance = balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(
                employee.getId(), leaveType.getId(), year
        ).orElseThrow(() -> new ResourceNotFoundException("Balance not found"));

        BigDecimal days = BigDecimal.valueOf(workingDays);
        balance.setPending(balance.getPending().subtract(days));
        balance.setUsed(balance.getUsed().add(days));
        balanceRepository.save(balance);
    }

    /**
     * On reject or cancel: restore days to pending or used accordingly.
     * @param fromUsed true if restoring from used (cancel after approval), false if from pending
     */
    public void restore(User employee, LeaveType leaveType, int workingDays, boolean fromUsed) {
        int year = LocalDate.now(clock).getYear();
        LeaveBalance balance = balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(
                employee.getId(), leaveType.getId(), year
        ).orElseThrow(() -> new ResourceNotFoundException("Balance not found"));

        BigDecimal days = BigDecimal.valueOf(workingDays);
        if (fromUsed) {
            balance.setUsed(balance.getUsed().subtract(days));
        } else {
            balance.setPending(balance.getPending().subtract(days));
        }
        balanceRepository.save(balance);
    }

    /**
     * Get all balances for an employee in the current year.
     */
    public List<LeaveBalance> getEmployeeBalances(Long employeeId) {
        int year = LocalDate.now(clock).getYear();
        return balanceRepository.findByEmployeeIdAndYear(employeeId, year);
    }

    /**
     * Get all balances for the current year (HR view).
     */
    public List<LeaveBalance> getAllBalances() {
        int year = LocalDate.now(clock).getYear();
        return balanceRepository.findByYear(year);
    }

    /**
     * Pro-rating formula:
     * entitled = round_to_half(annualEntitlement * remainingMonths / 12)
     * remainingMonths = 12 - (joinMonth - 1) = 13 - joinMonth (counting from joining month inclusive)
     */
    BigDecimal calculateEntitlement(User employee, LeaveType leaveType, int year) {
        BigDecimal annual = BigDecimal.valueOf(leaveType.getAnnualEntitlement());

        if (employee.getJoinDate().getYear() == year) {
            int joinMonth = employee.getJoinDate().getMonthValue();
            int remainingMonths = 13 - joinMonth; // inclusive of joining month
            BigDecimal proRated = annual.multiply(BigDecimal.valueOf(remainingMonths))
                    .divide(BigDecimal.valueOf(12), 1, RoundingMode.HALF_UP);
            return roundToHalf(proRated);
        }

        return annual;
    }

    /**
     * Rounds to nearest 0.5: e.g., 11.3 -> 11.5, 11.7 -> 11.5, 11.8 -> 12.0
     */
    private BigDecimal roundToHalf(BigDecimal value) {
        BigDecimal doubled = value.multiply(BigDecimal.valueOf(2));
        BigDecimal rounded = doubled.setScale(0, RoundingMode.HALF_UP);
        return rounded.divide(BigDecimal.valueOf(2), 1, RoundingMode.HALF_UP);
    }
}
