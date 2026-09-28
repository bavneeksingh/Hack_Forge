package com.leavemanager.controller;

import com.leavemanager.dto.ApprovalActionRequest;
import com.leavemanager.dto.CreateWorkationRequest;
import com.leavemanager.dto.TimezonePreviewDto;
import com.leavemanager.dto.WorkationDto;
import com.leavemanager.security.CustomUserDetails;
import com.leavemanager.service.WorkationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/workations")
public class WorkationController {

    private final WorkationService workationService;

    public WorkationController(WorkationService workationService) {
        this.workationService = workationService;
    }

    @PostMapping
    public ResponseEntity<WorkationDto> createWorkation(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateWorkationRequest request) {
        return ResponseEntity.ok(workationService.createWorkation(userDetails.getUserId(), request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<WorkationDto>> getMyWorkations(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(workationService.getMyWorkations(userDetails.getUserId()));
    }

    @GetMapping("/active")
    public ResponseEntity<WorkationDto> getActiveWorkation(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return workationService.getActiveWorkation(userDetails.getUserId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/team")
    public ResponseEntity<List<WorkationDto>> getTeamWorkations(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        LocalDate startDate = from != null ? from : LocalDate.now().minusMonths(1);
        LocalDate endDate = to != null ? to : LocalDate.now().plusMonths(3);
        return ResponseEntity.ok(workationService.getTeamWorkations(userDetails.getUserId(), startDate, endDate));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<WorkationDto>> getPendingWorkations(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_HR"))) {
            return ResponseEntity.ok(workationService.getHrPending());
        }
        return ResponseEntity.ok(workationService.getManagerPending(userDetails.getUserId()));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<WorkationDto> approveWorkation(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody(required = false) ApprovalActionRequest request) {
        String comment = request != null ? request.comment() : "Approved";
        return ResponseEntity.ok(workationService.approveWorkation(userDetails.getUserId(), id, comment));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<WorkationDto> rejectWorkation(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody(required = false) ApprovalActionRequest request) {
        String comment = request != null ? request.comment() : "Rejected";
        return ResponseEntity.ok(workationService.rejectWorkation(userDetails.getUserId(), id, comment));
    }

    @GetMapping("/preview")
    public ResponseEntity<TimezonePreviewDto> previewTimezone(
            @RequestParam String timezone,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(defaultValue = "09:00") String start,
            @RequestParam(defaultValue = "18:00") String end) {
        return ResponseEntity.ok(workationService.previewTimezone(timezone, startDate, endDate, start, end));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkation(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        workationService.deleteWorkation(userDetails.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
