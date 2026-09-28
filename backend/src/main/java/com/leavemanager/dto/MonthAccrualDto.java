package com.leavemanager.dto;

import java.math.BigDecimal;

public record MonthAccrualDto(
        int month,
        String monthName,
        boolean active,
        BigDecimal accruedDays
) {}
