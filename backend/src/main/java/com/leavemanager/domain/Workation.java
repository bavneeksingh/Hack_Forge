package com.leavemanager.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "workations")
public class Workation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false, length = 100)
    private String country;

    @Column(nullable = false, length = 100)
    private String timezone;

    @Column(name = "timezone_offset_minutes", nullable = false)
    private int timezoneOffsetMinutes;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "base_start_date")
    private LocalDate baseStartDate;

    @Column(name = "base_end_date")
    private LocalDate baseEndDate;

    @Column(name = "base_start_time", length = 20)
    private String baseStartTime;

    @Column(name = "base_end_time", length = 20)
    private String baseEndTime;

    @Column(name = "time_gap_description", length = 255)
    private String timeGapDescription;

    @Column(name = "time_gap_hours")
    private Double timeGapHours = 0.0;

    @Column(name = "local_start_time", length = 10)
    private String localStartTime = "00:00";

    @Column(name = "local_end_time", length = 10)
    private String localEndTime = "23:59";

    @Column(name = "team_converted_hours", length = 100)
    private String teamConvertedHours = "Base HQ IST";

    @Column(name = "overlap_hours")
    private Double overlapHours = 0.0;

    @Column(name = "status_message", length = 255)
    private String statusMessage;

    @Column(name = "status_icon", nullable = false, length = 20)
    private String statusIcon = "🌴";

    @Column(name = "approval_status", nullable = false, length = 30)
    private String approvalStatus = "PENDING_MANAGER";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    private User approvedBy;

    @Column(name = "approval_comment", length = 255)
    private String approvalComment;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_approved_by_id")
    private User managerApprovedBy;

    @Column(name = "manager_approval_comment", length = 255)
    private String managerApprovalComment;

    @Column(name = "manager_reviewed_at")
    private Instant managerReviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_approved_by_id")
    private User hrApprovedBy;

    @Column(name = "hr_approval_comment", length = 255)
    private String hrApprovalComment;

    @Column(name = "hr_reviewed_at")
    private Instant hrReviewedAt;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Workation() {}

    public Workation(User user, String city, String country, String timezone, int timezoneOffsetMinutes,
                     LocalDate startDate, LocalDate endDate, LocalDate baseStartDate, LocalDate baseEndDate,
                     String baseStartTime, String baseEndTime, String timeGapDescription, Double timeGapHours,
                     String statusMessage, String statusIcon, String approvalStatus) {
        this.user = user;
        this.city = city;
        this.country = country;
        this.timezone = timezone;
        this.timezoneOffsetMinutes = timezoneOffsetMinutes;
        this.startDate = startDate;
        this.endDate = endDate;
        this.baseStartDate = baseStartDate;
        this.baseEndDate = baseEndDate;
        this.baseStartTime = baseStartTime;
        this.baseEndTime = baseEndTime;
        this.timeGapDescription = timeGapDescription;
        this.timeGapHours = timeGapHours != null ? timeGapHours : 0.0;
        this.localStartTime = "00:00";
        this.localEndTime = "23:59";
        this.teamConvertedHours = (baseStartTime != null && baseEndTime != null) ? baseStartTime + " - " + baseEndTime : "Base HQ IST";
        this.overlapHours = 0.0;
        this.statusMessage = statusMessage;
        this.statusIcon = statusIcon != null ? statusIcon : "🌴";
        this.approvalStatus = approvalStatus != null ? approvalStatus : "PENDING_MANAGER";
        this.active = true;
        this.createdAt = Instant.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public int getTimezoneOffsetMinutes() { return timezoneOffsetMinutes; }
    public void setTimezoneOffsetMinutes(int timezoneOffsetMinutes) { this.timezoneOffsetMinutes = timezoneOffsetMinutes; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public LocalDate getBaseStartDate() { return baseStartDate != null ? baseStartDate : startDate; }
    public void setBaseStartDate(LocalDate baseStartDate) { this.baseStartDate = baseStartDate; }

    public LocalDate getBaseEndDate() { return baseEndDate != null ? baseEndDate : endDate; }
    public void setBaseEndDate(LocalDate baseEndDate) { this.baseEndDate = baseEndDate; }

    public String getBaseStartTime() { return baseStartTime; }
    public void setBaseStartTime(String baseStartTime) { this.baseStartTime = baseStartTime; }

    public String getBaseEndTime() { return baseEndTime; }
    public void setBaseEndTime(String baseEndTime) { this.baseEndTime = baseEndTime; }

    public String getTimeGapDescription() { return timeGapDescription; }
    public void setTimeGapDescription(String timeGapDescription) { this.timeGapDescription = timeGapDescription; }

    public Double getTimeGapHours() { return timeGapHours != null ? timeGapHours : 0.0; }
    public void setTimeGapHours(Double timeGapHours) { this.timeGapHours = timeGapHours; }

    public String getLocalStartTime() { return localStartTime; }
    public void setLocalStartTime(String localStartTime) { this.localStartTime = localStartTime; }

    public String getLocalEndTime() { return localEndTime; }
    public void setLocalEndTime(String localEndTime) { this.localEndTime = localEndTime; }

    public String getTeamConvertedHours() { return teamConvertedHours; }
    public void setTeamConvertedHours(String teamConvertedHours) { this.teamConvertedHours = teamConvertedHours; }

    public Double getOverlapHours() { return overlapHours != null ? overlapHours : 0.0; }
    public void setOverlapHours(Double overlapHours) { this.overlapHours = overlapHours; }

    public String getStatusMessage() { return statusMessage; }
    public void setStatusMessage(String statusMessage) { this.statusMessage = statusMessage; }

    public String getStatusIcon() { return statusIcon; }
    public void setStatusIcon(String statusIcon) { this.statusIcon = statusIcon; }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

    public User getApprovedBy() { return approvedBy; }
    public void setApprovedBy(User approvedBy) { this.approvedBy = approvedBy; }

    public String getApprovalComment() { return approvalComment; }
    public void setApprovalComment(String approvalComment) { this.approvalComment = approvalComment; }

    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }

    public User getManagerApprovedBy() { return managerApprovedBy; }
    public void setManagerApprovedBy(User managerApprovedBy) { this.managerApprovedBy = managerApprovedBy; }

    public String getManagerApprovalComment() { return managerApprovalComment; }
    public void setManagerApprovalComment(String managerApprovalComment) { this.managerApprovalComment = managerApprovalComment; }

    public Instant getManagerReviewedAt() { return managerReviewedAt; }
    public void setManagerReviewedAt(Instant managerReviewedAt) { this.managerReviewedAt = managerReviewedAt; }

    public User getHrApprovedBy() { return hrApprovedBy; }
    public void setHrApprovedBy(User hrApprovedBy) { this.hrApprovedBy = hrApprovedBy; }

    public String getHrApprovalComment() { return hrApprovalComment; }
    public void setHrApprovalComment(String hrApprovalComment) { this.hrApprovalComment = hrApprovalComment; }

    public Instant getHrReviewedAt() { return hrReviewedAt; }
    public void setHrReviewedAt(Instant hrReviewedAt) { this.hrReviewedAt = hrReviewedAt; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
