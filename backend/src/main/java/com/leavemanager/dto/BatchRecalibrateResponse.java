package com.leavemanager.dto;

import java.util.List;

public record BatchRecalibrateResponse(
        int year,
        int totalUsersChecked,
        int usersAdjusted,
        List<UserAdjustmentDto> adjustedUsers,
        String message
) {}
