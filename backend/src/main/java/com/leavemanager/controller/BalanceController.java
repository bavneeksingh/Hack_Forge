package com.leavemanager.controller;

import com.leavemanager.dto.BalanceDto;
import com.leavemanager.security.CustomUserDetails;
import com.leavemanager.service.LeaveService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/balance")
public class BalanceController {

    private final LeaveService leaveService;

    public BalanceController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @GetMapping("/me")
    public ResponseEntity<List<BalanceDto>> myBalance(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(leaveService.getEmployeeBalances(userDetails.getUserId()));
    }
}
