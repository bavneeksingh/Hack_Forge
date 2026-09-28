package com.leavemanager.dto;

import java.math.BigDecimal;

public record BalanceDto(
    Long id,
    Long employeeId,
    String employeeName,
    String leaveType,
    int year,
    BigDecimal entitled,
    BigDecimal used,
    BigDecimal pending,
    BigDecimal available
) {}
