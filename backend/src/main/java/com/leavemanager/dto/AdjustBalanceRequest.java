package com.leavemanager.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public record AdjustBalanceRequest(
        @NotNull(message = "userId is required")
        Long userId,
        LocalDate joinDate,
        Integer year,
        Map<Long, BigDecimal> leaveTypeEntitlements,
        String comment
) {}
