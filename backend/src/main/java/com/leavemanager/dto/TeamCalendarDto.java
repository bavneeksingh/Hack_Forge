package com.leavemanager.dto;

import java.time.LocalDate;
import java.util.List;

public record TeamCalendarDto(
    LocalDate from,
    LocalDate to,
    List<TeamCalendarEntry> entries
) {
    public record TeamCalendarEntry(
        Long employeeId,
        String employeeName,
        Long leaveRequestId,
        String leaveType,
        LocalDate startDate,
        LocalDate endDate,
        String status
    ) {}
}
