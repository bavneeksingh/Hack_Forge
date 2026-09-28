package com.leavemanager.dto;

import java.time.LocalDate;
import java.util.List;

public record UserAdjustmentDto(
        Long id,
        String name,
        String email,
        String role,
        String teamName,
        String managerName,
        LocalDate joinDate,
        boolean joinedInTargetYear,
        List<BalanceDto> currentBalances,
        List<MidJoiningCalculationDto> calculatedEntitlements
) {}
