package com.leavemanager.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record LeaveRequestDto(
    Long id,
    UserSummaryDto requester,
    String type,
    LocalDate startDate,
    LocalDate endDate,
    int workingDays,
    String reason,
    String status,
    UserSummaryDto currentAssignee,
    Instant dueAt,
    boolean escalated,
    String escalatedFrom,
    boolean stageSkipped,
    boolean conflictFlagged,
    List<ConflictDetail> conflictDetails,
    List<ApprovalHistoryDto> history
) {}
