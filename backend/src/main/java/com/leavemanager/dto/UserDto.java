package com.leavemanager.dto;

public record UserDto(
    Long id,
    String email,
    String name,
    String role,
    Long managerId,
    String managerName,
    Long teamId,
    String teamName
) {}
