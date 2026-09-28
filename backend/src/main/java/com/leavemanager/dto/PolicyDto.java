package com.leavemanager.dto;

import java.math.BigDecimal;

public record PolicyDto(
    Long teamId,
    String teamName,
    BigDecimal conflictThreshold,
    int escalationTimeoutHours
) {}
