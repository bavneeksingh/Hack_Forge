package com.leavemanager.service;

import com.leavemanager.domain.LeaveBalance;
import com.leavemanager.domain.LeaveType;
import com.leavemanager.domain.User;
import com.leavemanager.exception.InsufficientBalanceException;
import com.leavemanager.exception.ResourceNotFoundException;
import com.leavemanager.repository.LeaveBalanceRepository;
import com.leavemanager.repository.LeaveTypeRepository;
import com.leavemanager.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final Clock clock;

    public BalanceService(LeaveBalanceRepository balanceRepository, Clock clock) {
        this(balanceRepository, null, null, clock);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public BalanceService(LeaveBalanceRepository balanceRepository,
                          UserRepository userRepository,
                          LeaveTypeRepository leaveTypeRepository,
                          Clock clock) {
        this.balanceRepository = balanceRepository;
        this.userRepository = userRepository;
        this.leaveTypeRepository = leaveTypeRepository;
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
     * Auto-initializes balances if none exist (e.g., for HR/Manager users).
     */
    public List<LeaveBalance> getEmployeeBalances(Long employeeId) {
        int year = LocalDate.now(clock).getYear();
        List<LeaveBalance> balances = balanceRepository.findByEmployeeIdAndYear(employeeId, year);

        // Auto-initialize if no balances exist for this user/year
        if (balances.isEmpty() && userRepository != null && leaveTypeRepository != null) {
            User employee = userRepository.findById(employeeId).orElse(null);
            List<LeaveType> allTypes = leaveTypeRepository.findAll();
            if (employee != null && !allTypes.isEmpty()) {
                for (LeaveType lt : allTypes) {
                    getOrInitializeBalance(employee, lt, year);
                }
                balances = balanceRepository.findByEmployeeIdAndYear(employeeId, year);
            }
        }

        return balances;
    }

    /**
     * Get all balances for the current year (HR view).
     * Auto-initializes balances for all active users if missing.
     */
    public List<LeaveBalance> getAllBalances() {
        int year = LocalDate.now(clock).getYear();
        if (userRepository != null && leaveTypeRepository != null) {
            List<User> allUsers = userRepository.findAll();
            List<LeaveType> allTypes = leaveTypeRepository.findAll();
            for (User user : allUsers) {
                List<LeaveBalance> userBalances = balanceRepository.findByEmployeeIdAndYear(user.getId(), year);
                if (userBalances.isEmpty()) {
                    for (LeaveType lt : allTypes) {
                        getOrInitializeBalance(user, lt, year);
                    }
                }
            }
        }
        return balanceRepository.findByYear(year);
    }

    /**
     * Pro-rating formula:
     * entitled = round_to_half(annualEntitlement * remainingMonths / 12)
     * remainingMonths = 12 - (joinMonth - 1) = 13 - joinMonth (counting from joining month inclusive)
     */
    public BigDecimal calculateEntitlement(User employee, LeaveType leaveType, int year) {
        return calculateEntitlementForDate(employee.getJoinDate(), leaveType, year);
    }

    public BigDecimal calculateEntitlementForDate(LocalDate joinDate, LeaveType leaveType, int year) {
        BigDecimal annual = BigDecimal.valueOf(leaveType.getAnnualEntitlement());

        if (joinDate.getYear() == year) {
            int joinMonth = joinDate.getMonthValue();
            int remainingMonths = 13 - joinMonth; // inclusive of joining month
            BigDecimal proRated = annual.multiply(BigDecimal.valueOf(remainingMonths))
                    .divide(BigDecimal.valueOf(12), 1, RoundingMode.HALF_UP);
            return roundToHalf(proRated);
        } else if (joinDate.getYear() > year) {
            return BigDecimal.ZERO;
        }

        return annual;
    }

    /**
     * Rounds to nearest 0.5: e.g., 11.3 -> 11.5, 11.7 -> 11.5, 11.8 -> 12.0
     */
    public BigDecimal roundToHalf(BigDecimal value) {
        BigDecimal doubled = value.multiply(BigDecimal.valueOf(2));
        BigDecimal rounded = doubled.setScale(0, RoundingMode.HALF_UP);
        return rounded.divide(BigDecimal.valueOf(2), 1, RoundingMode.HALF_UP);
    }

    @org.springframework.transaction.annotation.Transactional
    public LeaveBalance setEntitlement(User user, LeaveType leaveType, int year, BigDecimal newEntitled) {
        LeaveBalance balance = balanceRepository.findByEmployeeIdAndLeaveTypeIdAndYear(
                user.getId(), leaveType.getId(), year
        ).orElseGet(() -> new LeaveBalance(user, leaveType, year, newEntitled));

        balance.setEntitled(newEntitled);
        return balanceRepository.save(balance);
    }
}

