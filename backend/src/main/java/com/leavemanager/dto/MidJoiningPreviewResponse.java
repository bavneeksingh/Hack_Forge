package com.leavemanager.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record MidJoiningPreviewResponse(
        LocalDate joinDate,
        int year,
        int remainingMonths,
        BigDecimal totalAnnualDays,
        BigDecimal totalProRatedDays,
        BigDecimal totalAdjustedDays,
        List<MidJoiningCalculationDto> calculations
) {}
