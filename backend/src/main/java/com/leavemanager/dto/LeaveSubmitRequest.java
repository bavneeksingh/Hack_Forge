package com.leavemanager.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record LeaveSubmitRequest(
    @NotNull Long leaveTypeId,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    String reason
) {}
