package com.leavemanager.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WeeklyWorkloadDto(
    Long id,
    Long teamId,
    String teamName,
    LocalDate startDate,
    LocalDate endDate,
    String workloadLevel,
    int workloadScore,
    BigDecimal threshold,
    String sprintName,
    String notes,
    String createdByName
) {}
