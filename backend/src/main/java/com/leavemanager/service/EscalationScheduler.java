package com.leavemanager.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job that checks for overdue leave requests and triggers escalation.
 * Runs every 15 minutes.
 */
@Component
public class EscalationScheduler {

    private final EscalationService escalationService;

    public EscalationScheduler(EscalationService escalationService) {
        this.escalationService = escalationService;
    }

    @Scheduled(fixedRate = 900000) // 15 minutes
    public void checkEscalations() {
        escalationService.processEscalations();
    }
}
