package com.leavemanager.service;

import com.leavemanager.domain.Team;
import com.leavemanager.domain.TeamWeeklyWorkload;
import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.Role;
import com.leavemanager.dto.SaveWorkloadRequest;
import com.leavemanager.dto.WeeklyWorkloadDto;
import com.leavemanager.repository.TeamRepository;
import com.leavemanager.repository.TeamWeeklyWorkloadRepository;
import com.leavemanager.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkloadServiceTest {

    @Mock
    private TeamWeeklyWorkloadRepository workloadRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private UserRepository userRepository;

    private WorkloadService workloadService;

    private User manager;
    private Team team;

    @BeforeEach
    void setUp() {
        workloadService = new WorkloadService(workloadRepository, teamRepository, userRepository);

        manager = new User("alice@co.com", "pass", "Alice Manager", Role.MANAGER, LocalDate.of(2024, 1, 1));
        manager.setId(1L);

        team = new Team("Engineering", manager);
        team.setId(1L);
        team.setConflictThreshold(new BigDecimal("0.40"));
        manager.setTeam(team);
    }

    @Test
    void saveWorkload_createsNewWorkloadWithHighLevelDynamicThreshold() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(manager));
        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        when(workloadRepository.findByTeamIdAndStartDate(1L, LocalDate.of(2026, 10, 12)))
                .thenReturn(Optional.empty());

        when(workloadRepository.save(any(TeamWeeklyWorkload.class))).thenAnswer(i -> {
            TeamWeeklyWorkload saved = i.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        SaveWorkloadRequest req = new SaveWorkloadRequest(
                1L,
                LocalDate.of(2026, 10, 12),
                LocalDate.of(2026, 10, 18),
                "HIGH",
                null,
                null,
                "Sprint 24 Release",
                "High demand week"
        );

        WeeklyWorkloadDto result = workloadService.saveWorkload(1L, req);

        assertNotNull(result);
        assertEquals("HIGH", result.workloadLevel());
        assertEquals(new BigDecimal("0.60"), result.threshold());
        assertEquals(80, result.workloadScore());
        assertEquals("Sprint 24 Release", result.sprintName());
    }

    @Test
    void getEffectiveThresholdForDate_returnsDynamicThresholdWhenConfigured() {
        TeamWeeklyWorkload workload = new TeamWeeklyWorkload(
                team,
                LocalDate.of(2026, 10, 12),
                LocalDate.of(2026, 10, 18),
                "CRITICAL",
                95,
                new BigDecimal("0.75"),
                "Launch Week",
                "All hands needed",
                manager
        );

        when(workloadRepository.findByTeamIdAndDate(1L, LocalDate.of(2026, 10, 14)))
                .thenReturn(Optional.of(workload));

        BigDecimal threshold = workloadService.getEffectiveThresholdForDate(team, LocalDate.of(2026, 10, 14));
        assertEquals(new BigDecimal("0.75"), threshold);
    }

    @Test
    void getEffectiveThresholdForDate_fallsBackToTeamBaseThresholdWhenNotConfigured() {
        when(workloadRepository.findByTeamIdAndDate(1L, LocalDate.of(2026, 10, 28)))
                .thenReturn(Optional.empty());

        BigDecimal threshold = workloadService.getEffectiveThresholdForDate(team, LocalDate.of(2026, 10, 28));
        assertEquals(new BigDecimal("0.40"), threshold);
    }
}
