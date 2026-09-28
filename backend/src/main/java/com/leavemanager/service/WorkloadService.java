package com.leavemanager.service;

import com.leavemanager.domain.Team;
import com.leavemanager.domain.TeamWeeklyWorkload;
import com.leavemanager.domain.User;
import com.leavemanager.domain.enums.Role;
import com.leavemanager.dto.SaveWorkloadRequest;
import com.leavemanager.dto.WeeklyWorkloadDto;
import com.leavemanager.exception.ResourceNotFoundException;
import com.leavemanager.repository.TeamRepository;
import com.leavemanager.repository.TeamWeeklyWorkloadRepository;
import com.leavemanager.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class WorkloadService {

    private final TeamWeeklyWorkloadRepository workloadRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    public WorkloadService(TeamWeeklyWorkloadRepository workloadRepository,
                           TeamRepository teamRepository,
                           UserRepository userRepository) {
        this.workloadRepository = workloadRepository;
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<WeeklyWorkloadDto> getWorkloadsForManager(Long managerId) {
        User user = userRepository.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<TeamWeeklyWorkload> workloads;
        if (user.getRole() == Role.HR) {
            workloads = workloadRepository.findAll();
        } else {
            List<Long> teamIds = new ArrayList<>();
            teamRepository.findByManagerId(managerId).ifPresent(t -> teamIds.add(t.getId()));
            if (teamIds.isEmpty() && user.getTeam() != null) {
                teamIds.add(user.getTeam().getId());
            }
            if (teamIds.isEmpty()) {
                workloads = List.of();
            } else {
                workloads = workloadRepository.findByTeamIdInOrderByStartDateAsc(teamIds);
            }
        }

        return workloads.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WeeklyWorkloadDto> getWorkloadsForTeam(Long teamId, LocalDate from, LocalDate to) {
        return workloadRepository.findByTeamIdAndDateRange(teamId, from, to)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WeeklyWorkloadDto> getAllWorkloadsInRange(LocalDate from, LocalDate to) {
        return workloadRepository.findAllByDateRange(from, to)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public WeeklyWorkloadDto saveWorkload(Long actorId, SaveWorkloadRequest req) {
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (req.startDate() == null || req.endDate() == null) {
            throw new IllegalArgumentException("Start date and end date are required");
        }
        if (req.startDate().isAfter(req.endDate())) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }

        Long teamId = req.teamId();
        Team team;
        if (teamId != null) {
            team = teamRepository.findById(teamId)
                    .orElseThrow(() -> new ResourceNotFoundException("Team not found"));
        } else if (actor.getTeam() != null) {
            team = actor.getTeam();
        } else {
            team = teamRepository.findByManagerId(actorId)
                    .orElseThrow(() -> new IllegalArgumentException("No associated team found for workload"));
        }

        String level = req.workloadLevel() != null ? req.workloadLevel().toUpperCase() : "NORMAL";
        int score = req.workloadScore() != null ? req.workloadScore() : defaultScoreForLevel(level);
        BigDecimal threshold = req.threshold() != null ? req.threshold() : defaultThresholdForLevel(level);

        Optional<TeamWeeklyWorkload> existing = workloadRepository.findByTeamIdAndStartDate(team.getId(), req.startDate());
        TeamWeeklyWorkload workload;
        if (existing.isPresent()) {
            workload = existing.get();
            workload.setEndDate(req.endDate());
            workload.setWorkloadLevel(level);
            workload.setWorkloadScore(score);
            workload.setThreshold(threshold);
            workload.setSprintName(req.sprintName());
            workload.setNotes(req.notes());
        } else {
            workload = new TeamWeeklyWorkload(
                    team, req.startDate(), req.endDate(), level, score, threshold,
                    req.sprintName(), req.notes(), actor
            );
        }

        workload = workloadRepository.save(workload);
        return toDto(workload);
    }

    @Transactional
    public void deleteWorkload(Long actorId, Long workloadId) {
        TeamWeeklyWorkload workload = workloadRepository.findById(workloadId)
                .orElseThrow(() -> new ResourceNotFoundException("Workload not found"));
        workloadRepository.delete(workload);
    }

    /**
     * Get the dynamic threshold effective for a given team on a specific date.
     * If a weekly workload is configured, its threshold is used; otherwise returns team base threshold.
     */
    @Transactional(readOnly = true)
    public BigDecimal getEffectiveThresholdForDate(Team team, LocalDate date) {
        if (team == null) {
            return new BigDecimal("0.40");
        }
        return workloadRepository.findByTeamIdAndDate(team.getId(), date)
                .map(TeamWeeklyWorkload::getThreshold)
                .orElseGet(() -> team.getConflictThreshold() != null
                        ? team.getConflictThreshold()
                        : new BigDecimal("0.40"));
    }

    /**
     * Get the workload metadata (if any) for a given team on a specific date.
     */
    @Transactional(readOnly = true)
    public Optional<TeamWeeklyWorkload> getWorkloadForDate(Team team, LocalDate date) {
        if (team == null) return Optional.empty();
        return workloadRepository.findByTeamIdAndDate(team.getId(), date);
    }

    private BigDecimal defaultThresholdForLevel(String level) {
        return switch (level) {
            case "LOW" -> new BigDecimal("0.25");
            case "HIGH" -> new BigDecimal("0.60");
            case "CRITICAL" -> new BigDecimal("0.75");
            default -> new BigDecimal("0.40"); // NORMAL
        };
    }

    private int defaultScoreForLevel(String level) {
        return switch (level) {
            case "LOW" -> 25;
            case "HIGH" -> 80;
            case "CRITICAL" -> 95;
            default -> 50; // NORMAL
        };
    }

    private WeeklyWorkloadDto toDto(TeamWeeklyWorkload w) {
        return new WeeklyWorkloadDto(
                w.getId(),
                w.getTeam().getId(),
                w.getTeam().getName(),
                w.getStartDate(),
                w.getEndDate(),
                w.getWorkloadLevel(),
                w.getWorkloadScore(),
                w.getThreshold(),
                w.getSprintName(),
                w.getNotes(),
                w.getCreatedBy() != null ? w.getCreatedBy().getName() : "System"
        );
    }
}
