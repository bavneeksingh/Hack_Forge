package com.leavemanager.domain;

import com.leavemanager.domain.enums.LeaveAction;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "approval_history")
public class ApprovalHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "leave_request_id", nullable = false)
    private LeaveRequest leaveRequest;

    @Column(nullable = false)
    private String stage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeaveAction action;

    private String comment;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public ApprovalHistory() {}

    public ApprovalHistory(LeaveRequest leaveRequest, String stage, User actor,
                           LeaveAction action, String comment, Instant createdAt) {
        this.leaveRequest = leaveRequest;
        this.stage = stage;
        this.actor = actor;
        this.action = action;
        this.comment = comment;
        this.createdAt = createdAt;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LeaveRequest getLeaveRequest() { return leaveRequest; }
    public void setLeaveRequest(LeaveRequest leaveRequest) { this.leaveRequest = leaveRequest; }

    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }

    public User getActor() { return actor; }
    public void setActor(User actor) { this.actor = actor; }

    public LeaveAction getAction() { return action; }
    public void setAction(LeaveAction action) { this.action = action; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
