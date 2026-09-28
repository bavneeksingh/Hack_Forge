package com.leavemanager.controller;

import com.leavemanager.dto.*;
import com.leavemanager.security.CustomUserDetails;
import com.leavemanager.service.MidJoiningCalculatorService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/calculator")
public class MidJoiningCalculatorController {

    private final MidJoiningCalculatorService calculatorService;

    public MidJoiningCalculatorController(MidJoiningCalculatorService calculatorService) {
        this.calculatorService = calculatorService;
    }

    /**
     * Preview pro-rated leave calculations for any joining date and year.
     * Accessible to all authenticated users (Employee, Manager, HR).
     */
    @GetMapping("/preview")
    public ResponseEntity<MidJoiningPreviewResponse> previewCalculation(
            @RequestParam(required = false) LocalDate joinDate,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(calculatorService.previewCalculation(joinDate, year));
    }

    /**
     * Get organization users with current balances and calculated mid-joining entitlements.
     * Scope is role-filtered (HR sees all, Manager sees direct reports & self, Employee sees self).
     */
    @GetMapping("/users")
    public ResponseEntity<List<UserAdjustmentDto>> getOrganizationUsers(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(calculatorService.getOrganizationUsersForMidJoining(year, userDetails.getUserId()));
    }

    /**
     * Adjust leave balances for an employee, manager, or HR member based on mid-joining date.
     * Accessible to HR (for any user) and Managers (for their direct reports & self).
     */
    @PostMapping({"/adjust", "/push-balance"})
    public ResponseEntity<UserAdjustmentDto> adjustUserBalances(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody AdjustBalanceRequest request) {
        return ResponseEntity.ok(calculatorService.adjustUserBalances(userDetails.getUserId(), request));
    }

    /**
     * Batch recalibrate leave balances for all mid-year joiners across the organization.
     * Accessible to HR only.
     */
    @PostMapping("/recalibrate-all")
    public ResponseEntity<BatchRecalibrateResponse> recalibrateAll(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(calculatorService.recalibrateAllForYear(userDetails.getUserId(), year));
    }
}
