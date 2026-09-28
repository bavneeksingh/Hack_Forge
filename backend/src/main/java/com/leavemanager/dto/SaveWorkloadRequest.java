package com.leavemanager.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SaveWorkloadRequest(
    Long teamId,
    LocalDate startDate,
    LocalDate endDate,
    String workloadLevel, // 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'
    Integer workloadScore, // 0 - 100
    BigDecimal threshold, // optional custom override
    String sprintName,
    String notes
) {}
