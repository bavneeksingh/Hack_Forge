package com.leavemanager.dto;

public record LoginResponse(
    String token,
    UserDto user
) {}
