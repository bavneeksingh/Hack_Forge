package com.leavemanager.dto;

import java.time.LocalDate;
import java.util.List;

public record LeavePreviewDto(
    int workingDays,
    boolean conflictFlagged,
    List<ConflictDetail> conflictDetails,
    List<LocalDate> holidays,
    LocalDate startDate,
    LocalDate endDate
) {}
