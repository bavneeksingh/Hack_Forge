package com.leavemanager.dto;

import java.time.LocalDate;
import java.util.List;

public record ConflictDetail(
    LocalDate date,
    List<String> awayNames,
    double pct
) {}
