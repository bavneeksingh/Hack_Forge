package com.leavemanager.controller;

import com.leavemanager.dto.*;
import com.leavemanager.security.CustomUserDetails;
import com.leavemanager.service.LeaveService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/manager")
public class ManagerController {

    private final LeaveService leaveService;

    public ManagerController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @GetMapping("/pending")
    public ResponseEntity<List<LeaveRequestDto>> getPending(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(leaveService.getManagerPending(userDetails.getUserId()));
    }

    @PostMapping("/leaves/{id}/approve")
    public ResponseEntity<LeaveRequestDto> approve(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody(required = false) ApprovalActionRequest request) {
        String comment = request != null ? request.comment() : null;
        return ResponseEntity.ok(leaveService.managerApprove(id, userDetails.getUserId(), comment));
    }

    @PostMapping("/leaves/{id}/reject")
    public ResponseEntity<LeaveRequestDto> reject(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody ApprovalActionRequest request) {
        return ResponseEntity.ok(leaveService.managerReject(id, userDetails.getUserId(), request.comment()));
    }

    @GetMapping("/team-calendar")
    public ResponseEntity<TeamCalendarDto> teamCalendar(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to) {
        return ResponseEntity.ok(leaveService.getTeamCalendar(userDetails.getUserId(), from, to));
    }
}
