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
    List<WeeklyWorkloadDto> workloads
) {
    public TeamCalendarDto(LocalDate from, LocalDate to, List<TeamCalendarEntry> entries) {
        this(from, to, entries, List.of(), 0, 0.40, List.of());
    }

    public TeamCalendarDto(LocalDate from, LocalDate to, List<TeamCalendarEntry> entries,
                           List<PublicHolidayDto> holidays, int teamSize, double conflictThreshold) {
        this(from, to, entries, holidays, teamSize, conflictThreshold, List.of());
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
}
