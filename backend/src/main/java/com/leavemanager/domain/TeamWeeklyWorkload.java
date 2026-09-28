package com.leavemanager.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "team_weekly_workloads")
public class TeamWeeklyWorkload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "workload_level", nullable = false, length = 20)
    private String workloadLevel; // 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'

    @Column(name = "workload_score", nullable = false)
    private int workloadScore = 50; // 0 to 100

    @Column(name = "threshold", nullable = false)
    private BigDecimal threshold = new BigDecimal("0.40");

    @Column(name = "sprint_name")
    private String sprintName;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public TeamWeeklyWorkload() {}

    public TeamWeeklyWorkload(Team team, LocalDate startDate, LocalDate endDate,
                              String workloadLevel, int workloadScore, BigDecimal threshold,
                              String sprintName, String notes, User createdBy) {
        this.team = team;
        this.startDate = startDate;
        this.endDate = endDate;
        this.workloadLevel = workloadLevel;
        this.workloadScore = workloadScore;
        this.threshold = threshold;
        this.sprintName = sprintName;
        this.notes = notes;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Team getTeam() { return team; }
    public void setTeam(Team team) { this.team = team; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getWorkloadLevel() { return workloadLevel; }
    public void setWorkloadLevel(String workloadLevel) { this.workloadLevel = workloadLevel; }

    public int getWorkloadScore() { return workloadScore; }
    public void setWorkloadScore(int workloadScore) { this.workloadScore = workloadScore; }

    public BigDecimal getThreshold() { return threshold; }
    public void setThreshold(BigDecimal threshold) { this.threshold = threshold; }

    public String getSprintName() { return sprintName; }
    public void setSprintName(String sprintName) { this.sprintName = sprintName; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
