package com.leavemanager.dto;

import java.time.Instant;

public record ApprovalHistoryDto(
    String stage,
    UserSummaryDto actor,
    String action,
    String comment,
    Instant at
) {}
