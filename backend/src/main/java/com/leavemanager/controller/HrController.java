package com.leavemanager.controller;

import com.leavemanager.dto.*;
import com.leavemanager.security.CustomUserDetails;
import com.leavemanager.service.LeaveService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/hr")
public class HrController {

    private final LeaveService leaveService;

    public HrController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @GetMapping("/pending")
    public ResponseEntity<List<LeaveRequestDto>> getPending(
            @RequestParam(defaultValue = "ALL") String filter) {
        return ResponseEntity.ok(leaveService.getHrPending(filter));
    }

    @PostMapping("/leaves/{id}/approve")
    public ResponseEntity<LeaveRequestDto> approve(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody(required = false) ApprovalActionRequest request) {
        String comment = request != null ? request.comment() : null;
        return ResponseEntity.ok(leaveService.hrApprove(id, userDetails.getUserId(), comment));
    }

    @PostMapping("/leaves/{id}/reject")
    public ResponseEntity<LeaveRequestDto> reject(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody ApprovalActionRequest request) {
        return ResponseEntity.ok(leaveService.hrReject(id, userDetails.getUserId(), request.comment()));
    }

    @GetMapping("/balances")
    public ResponseEntity<List<BalanceDto>> allBalances() {
        return ResponseEntity.ok(leaveService.getAllBalances());
    }

    @GetMapping("/policies")
    public ResponseEntity<List<PolicyDto>> policies() {
        return ResponseEntity.ok(leaveService.getAllPolicies());
    }

    @PutMapping("/policies/{teamId}")
    public ResponseEntity<PolicyDto> updatePolicy(
            @PathVariable Long teamId,
            @RequestBody PolicyDto policyDto) {
        return ResponseEntity.ok(leaveService.updatePolicy(teamId, policyDto));
    }

    @GetMapping("/audit")
    public ResponseEntity<List<ApprovalHistoryDto>> audit() {
        return ResponseEntity.ok(leaveService.getAuditLog());
    }
}
