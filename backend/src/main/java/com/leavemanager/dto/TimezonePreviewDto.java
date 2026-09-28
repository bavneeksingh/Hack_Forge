package com.leavemanager.dto;

import java.time.LocalDate;

public record TimezonePreviewDto(
    String timezone,
    String teamTimezone,
    double timeDiffHours,
    String timeGapDescription,
    LocalDate startDate,
    LocalDate endDate,
    LocalDate baseStartDate,
    LocalDate baseEndDate,
    String baseStartTime,
    String baseEndTime,
    String localLeaveWindow,
    String baseLeaveWindow,
    String localHours,
    String teamConvertedHours,
    double overlapHours,
    String overlapWindow,
    String summary
) {}
