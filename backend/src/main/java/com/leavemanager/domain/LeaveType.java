package com.leavemanager.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "leave_types")
public class LeaveType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "annual_entitlement", nullable = false)
    private int annualEntitlement;

    @Column(name = "carry_forward")
    private boolean carryForward = false;

    public LeaveType() {}

    public LeaveType(String name, int annualEntitlement) {
        this.name = name;
        this.annualEntitlement = annualEntitlement;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getAnnualEntitlement() { return annualEntitlement; }
    public void setAnnualEntitlement(int annualEntitlement) { this.annualEntitlement = annualEntitlement; }

    public boolean isCarryForward() { return carryForward; }
    public void setCarryForward(boolean carryForward) { this.carryForward = carryForward; }
}
