package com.leavemanager.dto;

import java.time.LocalDate;

public record UserDto(
    Long id,
    String email,
    String name,
    String role,
    Long managerId,
    String managerName,
    Long teamId,
    String teamName,
    LocalDate joinDate
) {
    public UserDto(Long id, String email, String name, String role, Long managerId, String managerName, Long teamId, String teamName) {
        this(id, email, name, role, managerId, managerName, teamId, teamName, null);
    }
}
