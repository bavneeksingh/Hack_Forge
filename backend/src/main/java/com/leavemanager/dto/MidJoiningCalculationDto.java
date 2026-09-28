package com.leavemanager.dto;

import java.math.BigDecimal;
import java.util.List;

public record MidJoiningCalculationDto(
        Long leaveTypeId,
        String leaveTypeName,
        BigDecimal annualEntitlement,
        BigDecimal proRatedEntitlement,
        BigDecimal adjustedDays,
        int remainingMonths,
        int joinMonth,
        BigDecimal monthlyAccrualRate,
        String formula,
        List<MonthAccrualDto> monthlyBreakdown
) {}
