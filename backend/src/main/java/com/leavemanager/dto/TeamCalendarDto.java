package com.leavemanager.dto;

import java.time.LocalDate;
import java.util.List;

public record TeamCalendarDto(
    LocalDate from,
    LocalDate to,
    List<TeamCalendarEntry> entries,
    List<PublicHolidayDto> holidays,
    int teamSize,
    double conflictThreshold,
    List<WorkationCalendarEntry> workations
) {
    public TeamCalendarDto(LocalDate from, LocalDate to, List<TeamCalendarEntry> entries, List<PublicHolidayDto> holidays, int teamSize, double conflictThreshold) {
        this(from, to, entries, holidays, teamSize, conflictThreshold, List.of());
    }

    public TeamCalendarDto(LocalDate from, LocalDate to, List<TeamCalendarEntry> entries) {
        this(from, to, entries, List.of(), 0, 0.40, List.of());
    }

    public record TeamCalendarEntry(
        Long employeeId,
        String employeeName,
        Long leaveRequestId,
        String leaveType,
        LocalDate startDate,
        LocalDate endDate,
        String status
    ) {}

    public record PublicHolidayDto(
        LocalDate date,
        String name
    ) {}

    public record WorkationCalendarEntry(
        Long id,
        Long employeeId,
        String employeeName,
        String city,
        String country,
        String timezone,
        String statusIcon,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate destinationStartDate,
        LocalDate destinationEndDate,
        String baseStartTime,
        String baseEndTime,
        String timeGapDescription,
        double timeDiffHours,
        String localDatesDisplay,
        String teamDatesDisplay,
        String localStartTime,
        String localEndTime,
        String localTiming,
        String teamConvertedHours,
        double overlapHours,
        String statusMessage,
        String approvalStatus
    ) {}
}
