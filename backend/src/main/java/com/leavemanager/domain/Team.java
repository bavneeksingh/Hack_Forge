package com.leavemanager.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "teams")
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    private User manager;

    @Column(name = "conflict_threshold", nullable = false)
    private BigDecimal conflictThreshold = new BigDecimal("0.40");

    @Column(name = "escalation_timeout_hours", nullable = false)
    private int escalationTimeoutHours = 48;

    public Team() {}

    public Team(String name, User manager) {
        this.name = name;
        this.manager = manager;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public User getManager() { return manager; }
    public void setManager(User manager) { this.manager = manager; }

    public BigDecimal getConflictThreshold() { return conflictThreshold; }
    public void setConflictThreshold(BigDecimal conflictThreshold) { this.conflictThreshold = conflictThreshold; }

    public int getEscalationTimeoutHours() { return escalationTimeoutHours; }
    public void setEscalationTimeoutHours(int escalationTimeoutHours) { this.escalationTimeoutHours = escalationTimeoutHours; }
}
