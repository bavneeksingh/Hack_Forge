package com.leavemanager.controller;

import com.leavemanager.dto.*;
import com.leavemanager.security.CustomUserDetails;
import com.leavemanager.service.LeaveService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/leaves")
public class LeaveController {

    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @PostMapping
    public ResponseEntity<LeaveRequestDto> submitLeave(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody LeaveSubmitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(leaveService.submitLeave(userDetails.getUserId(), request));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<LeaveRequestDto>> getMyLeaves(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(leaveService.getMyLeaves(userDetails.getUserId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaveRequestDto> getLeave(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(leaveService.getLeaveById(id, userDetails.getUserId()));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<LeaveRequestDto> cancelLeave(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(leaveService.cancelLeave(id, userDetails.getUserId()));
    }

    @GetMapping("/preview")
    public ResponseEntity<LeavePreviewDto> previewLeave(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam LocalDate start,
            @RequestParam LocalDate end,
            @RequestParam Long type) {
        return ResponseEntity.ok(leaveService.previewLeave(userDetails.getUserId(), start, end, type));
    }

    @GetMapping("/team-calendar")
    public ResponseEntity<TeamCalendarDto> getTeamCalendar(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to) {
        return ResponseEntity.ok(leaveService.getTeamCalendarForUser(userDetails.getUserId(), from, to));
    }
}
