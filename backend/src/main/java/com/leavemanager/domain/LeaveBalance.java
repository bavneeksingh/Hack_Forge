package com.leavemanager.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "leave_balances", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"employee_id", "leave_type_id", "\"year\""})
})
public class LeaveBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Column(name = "\"year\"", nullable = false)
    private int year;

    @Column(nullable = false)
    private BigDecimal entitled = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal used = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal pending = BigDecimal.ZERO;

    public LeaveBalance() {}

    public LeaveBalance(User employee, LeaveType leaveType, int year, BigDecimal entitled) {
        this.employee = employee;
        this.leaveType = leaveType;
        this.year = year;
        this.entitled = entitled;
    }

    /**
     * available = entitled - used - pending
     */
    public BigDecimal getAvailable() {
        return entitled.subtract(used).subtract(pending);
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getEmployee() { return employee; }
    public void setEmployee(User employee) { this.employee = employee; }

    public LeaveType getLeaveType() { return leaveType; }
    public void setLeaveType(LeaveType leaveType) { this.leaveType = leaveType; }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public BigDecimal getEntitled() { return entitled; }
    public void setEntitled(BigDecimal entitled) { this.entitled = entitled; }

    public BigDecimal getUsed() { return used; }
    public void setUsed(BigDecimal used) { this.used = used; }

    public BigDecimal getPending() { return pending; }
    public void setPending(BigDecimal pending) { this.pending = pending; }
}
