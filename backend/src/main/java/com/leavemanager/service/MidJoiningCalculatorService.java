package com.leavemanager.service;

import com.leavemanager.domain.LeaveBalance;
import com.leavemanager.domain.LeaveType;
import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.Role;
import com.leavemanager.dto.*;
import com.leavemanager.exception.ResourceNotFoundException;
import com.leavemanager.exception.UnauthorizedActionException;
import com.leavemanager.repository.LeaveBalanceRepository;
import com.leavemanager.repository.LeaveTypeRepository;
import com.leavemanager.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for calculating, simulating, and adjusting mid-joining leave entitlements
 * for employees, managers, and HR across the organisation.
 */
@Service
public class MidJoiningCalculatorService {

    private final UserRepository userRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository balanceRepository;
    private final BalanceService balanceService;
    private final Clock clock;

    public MidJoiningCalculatorService(UserRepository userRepository,
                                       LeaveTypeRepository leaveTypeRepository,
                                       LeaveBalanceRepository balanceRepository,
                                       BalanceService balanceService,
                                       Clock clock) {
        this.userRepository = userRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.balanceRepository = balanceRepository;
        this.balanceService = balanceService;
        this.clock = clock;
    }

    /**
     * Preview mid-joining leave calculations for any arbitrary join date and year.
     */
    public MidJoiningPreviewResponse previewCalculation(LocalDate joinDate, Integer year) {
        int targetYear = (year != null) ? year : LocalDate.now(clock).getYear();
        LocalDate targetJoinDate = (joinDate != null) ? joinDate : LocalDate.now(clock);

        List<LeaveType> leaveTypes = new ArrayList<>(leaveTypeRepository.findAll());
        leaveTypes.sort(Comparator.comparing(LeaveType::getId));

        List<MidJoiningCalculationDto> calculations = new ArrayList<>();
        BigDecimal totalAnnual = BigDecimal.ZERO;
        BigDecimal totalProRated = BigDecimal.ZERO;

        int remainingMonths = calculateRemainingMonths(targetJoinDate, targetYear);

        for (LeaveType lt : leaveTypes) {
            MidJoiningCalculationDto calc = buildCalculation(lt, targetJoinDate, targetYear, remainingMonths);
            calculations.add(calc);
            totalAnnual = totalAnnual.add(calc.annualEntitlement());
            totalProRated = totalProRated.add(calc.proRatedEntitlement());
        }

        BigDecimal totalAdjusted = totalProRated.subtract(totalAnnual);

        return new MidJoiningPreviewResponse(
                targetJoinDate,
                targetYear,
                remainingMonths,
                totalAnnual,
                totalProRated,
                totalAdjusted,
                calculations
        );
    }

    /**
     * Get organization users (employees, managers, HR) with their current balances and calculated mid-joining entitlements.
     * Filtered based on caller's role (HR sees all, Manager sees team/reports, Employee sees self).
     */
    @Transactional(readOnly = true)
    public List<UserAdjustmentDto> getOrganizationUsersForMidJoining(Integer year, Long currentUserId) {
        int targetYear = (year != null) ? year : LocalDate.now(clock).getYear();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<User> targetUsers;
        if (currentUser.getRole() == Role.HR) {
            targetUsers = new ArrayList<>(userRepository.findAll());
        } else if (currentUser.getRole() == Role.MANAGER) {
            targetUsers = new ArrayList<>(userRepository.findByManagerId(currentUser.getId()));
            if (!targetUsers.contains(currentUser)) {
                targetUsers.add(currentUser);
            }
        } else {
            targetUsers = new ArrayList<>(List.of(currentUser));
        }

        targetUsers.sort(Comparator.comparing(User::getName));

        List<LeaveType> allTypes = new ArrayList<>(leaveTypeRepository.findAll());
        allTypes.sort(Comparator.comparing(LeaveType::getId));

        List<UserAdjustmentDto> result = new ArrayList<>();
        for (User u : targetUsers) {
            boolean joinedInTargetYear = (u.getJoinDate().getYear() == targetYear);
            List<BalanceDto> currentBalances = balanceService.getEmployeeBalances(u.getId()).stream()
                    .map(this::toBalanceDto)
                    .collect(Collectors.toList());

            int remMonths = calculateRemainingMonths(u.getJoinDate(), targetYear);
            List<MidJoiningCalculationDto> calcs = allTypes.stream()
                    .map(lt -> buildCalculation(lt, u.getJoinDate(), targetYear, remMonths))
                    .collect(Collectors.toList());

            result.add(new UserAdjustmentDto(
                    u.getId(),
                    u.getName(),
                    u.getEmail(),
                    u.getRole().name(),
                    u.getTeam() != null ? u.getTeam().getName() : "Organization Wide",
                    u.getManager() != null ? u.getManager().getName() : "None",
                    u.getJoinDate(),
                    joinedInTargetYear,
                    currentBalances,
                    calcs
            ));
        }

        return result;
    }

    /**
     * Adjust leave balances for an employee, manager, or HR member based on mid-joining calculation.
     */
    @Transactional
    public UserAdjustmentDto adjustUserBalances(Long actorId, AdjustBalanceRequest request) {
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new ResourceNotFoundException("Actor not found"));
        User targetUser = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found"));

        // Authorization check: HR can adjust anyone; Manager can adjust direct reports and self
        if (actor.getRole() != Role.HR) {
            boolean isDirectReport = targetUser.getManager() != null && targetUser.getManager().getId().equals(actor.getId());
            boolean isSelf = targetUser.getId().equals(actor.getId());
            if (actor.getRole() != Role.MANAGER || (!isDirectReport && !isSelf)) {
                throw new UnauthorizedActionException("You are not authorized to adjust leave balances for this user");
            }
        }

        int targetYear = (request.year() != null) ? request.year() : LocalDate.now(clock).getYear();

        // Update join date if modified
        if (request.joinDate() != null && !request.joinDate().equals(targetUser.getJoinDate())) {
            targetUser.setJoinDate(request.joinDate());
            userRepository.save(targetUser);
        }

        List<LeaveType> allTypes = new ArrayList<>(leaveTypeRepository.findAll());
        allTypes.sort(Comparator.comparing(LeaveType::getId));

        int remMonths = calculateRemainingMonths(targetUser.getJoinDate(), targetYear);

        for (LeaveType lt : allTypes) {
            BigDecimal newEntitled;
            if (request.leaveTypeEntitlements() != null && request.leaveTypeEntitlements().containsKey(lt.getId())) {
                newEntitled = request.leaveTypeEntitlements().get(lt.getId());
            } else {
                newEntitled = balanceService.calculateEntitlement(targetUser, lt, targetYear);
            }
            balanceService.setEntitlement(targetUser, lt, targetYear, newEntitled);
        }

        List<BalanceDto> updatedBalances = balanceService.getEmployeeBalances(targetUser.getId()).stream()
                .map(this::toBalanceDto)
                .collect(Collectors.toList());

        List<MidJoiningCalculationDto> calcs = allTypes.stream()
                .map(lt -> buildCalculation(lt, targetUser.getJoinDate(), targetYear, remMonths))
                .collect(Collectors.toList());

        boolean joinedInTargetYear = (targetUser.getJoinDate().getYear() == targetYear);

        return new UserAdjustmentDto(
                targetUser.getId(),
                targetUser.getName(),
                targetUser.getEmail(),
                targetUser.getRole().name(),
                targetUser.getTeam() != null ? targetUser.getTeam().getName() : "Organization Wide",
                targetUser.getManager() != null ? targetUser.getManager().getName() : "None",
                targetUser.getJoinDate(),
                joinedInTargetYear,
                updatedBalances,
                calcs
        );
    }

    /**
     * Batch recalibrate leave balances for all mid-year joiners across the organization (HR only).
     */
    @Transactional
    public BatchRecalibrateResponse recalibrateAllForYear(Long actorId, Integer year) {
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new ResourceNotFoundException("Actor not found"));

        if (actor.getRole() != Role.HR) {
            throw new UnauthorizedActionException("Only HR can recalibrate mid-joining leaves for the organization");
        }

        int targetYear = (year != null) ? year : LocalDate.now(clock).getYear();
        List<User> allUsers = new ArrayList<>(userRepository.findAll());
        List<LeaveType> allTypes = new ArrayList<>(leaveTypeRepository.findAll());
        allTypes.sort(Comparator.comparing(LeaveType::getId));

        List<UserAdjustmentDto> adjustedList = new ArrayList<>();

        for (User user : allUsers) {
            if (user.getJoinDate().getYear() == targetYear) {
                int remMonths = calculateRemainingMonths(user.getJoinDate(), targetYear);
                for (LeaveType lt : allTypes) {
                    BigDecimal entitled = balanceService.calculateEntitlement(user, lt, targetYear);
                    balanceService.setEntitlement(user, lt, targetYear, entitled);
                }

                List<BalanceDto> balances = balanceService.getEmployeeBalances(user.getId()).stream()
                        .map(this::toBalanceDto)
                        .collect(Collectors.toList());

                List<MidJoiningCalculationDto> calcs = allTypes.stream()
                        .map(lt -> buildCalculation(lt, user.getJoinDate(), targetYear, remMonths))
                        .collect(Collectors.toList());

                adjustedList.add(new UserAdjustmentDto(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        user.getRole().name(),
                        user.getTeam() != null ? user.getTeam().getName() : "Organization Wide",
                        user.getManager() != null ? user.getManager().getName() : "None",
                        user.getJoinDate(),
                        true,
                        balances,
                        calcs
                ));
            }
        }

        String msg = String.format("Successfully calibrated mid-joining leave balances for %d member(s) who joined in %d",
                adjustedList.size(), targetYear);

        return new BatchRecalibrateResponse(
                targetYear,
                allUsers.size(),
                adjustedList.size(),
                adjustedList,
                msg
        );
    }

    private int calculateRemainingMonths(LocalDate joinDate, int targetYear) {
        if (joinDate.getYear() < targetYear) {
            return 12;
        } else if (joinDate.getYear() > targetYear) {
            return 0;
        } else {
            return 13 - joinDate.getMonthValue();
        }
    }

    private MidJoiningCalculationDto buildCalculation(LeaveType lt, LocalDate joinDate, int targetYear, int remainingMonths) {
        BigDecimal annual = BigDecimal.valueOf(lt.getAnnualEntitlement()).setScale(1, RoundingMode.HALF_UP);
        BigDecimal proRated = balanceService.calculateEntitlementForDate(joinDate, lt, targetYear);
        if (proRated == null) {
            proRated = annual;
        }
        BigDecimal adjustedDays = proRated.subtract(annual);
        int joinMonth = joinDate.getMonthValue();

        BigDecimal monthlyRate = annual.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
        String formula = String.format("round_to_half(%.1f × %d / 12) = %.1f days",
                annual.doubleValue(), remainingMonths, proRated.doubleValue());

        List<MonthAccrualDto> monthlyBreakdown = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            boolean isActive;
            if (joinDate.getYear() < targetYear) {
                isActive = true;
            } else if (joinDate.getYear() > targetYear) {
                isActive = false;
            } else {
                isActive = (m >= joinMonth);
            }

            BigDecimal monthAccrued = isActive ? monthlyRate : BigDecimal.ZERO;
            String monthName = Month.of(m).getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            monthlyBreakdown.add(new MonthAccrualDto(m, monthName, isActive, monthAccrued));
        }

        return new MidJoiningCalculationDto(
                lt.getId(),
                lt.getName(),
                annual,
                proRated,
                adjustedDays,
                remainingMonths,
                joinMonth,
                monthlyRate,
                formula,
                monthlyBreakdown
        );
    }

    private BalanceDto toBalanceDto(LeaveBalance lb) {
        return new BalanceDto(
                lb.getId(),
                lb.getEmployee().getId(),
                lb.getEmployee().getName(),
                lb.getLeaveType().getName(),
                lb.getYear(),
                lb.getEntitled(),
                lb.getUsed(),
                lb.getPending(),
                lb.getAvailable()
        );
    }
}
