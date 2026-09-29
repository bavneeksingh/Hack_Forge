package com.leavemanager.service;

import com.leavemanager.domain.LeaveRequest;
import com.leavemanager.domain.enums.LeaveStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import org.springframework.scheduling.annotation.Async;

@Service
public class EmailService {

    private final JavaMailSender emailSender;

    @Autowired
    public EmailService(JavaMailSender emailSender) {
        this.emailSender = emailSender;
    }

    @Async
    public void sendStatusChangeEmail(LeaveRequest request) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("bavneeksingh8174@gmail.com"); // Matches the authenticated SMTP sender
            message.setTo(request.getRequester().getEmail());
            message.setSubject("Leave Request Update - " + request.getStatus().name());
            
            String text = String.format("Hello %s,\n\nYour leave request for %s (from %s to %s) has been updated to %s.\n",
                    request.getRequester().getName(),
                    request.getLeaveType().getName(),
                    request.getStartDate().toString(),
                    request.getEndDate().toString(),
                    request.getStatus().name());
                    
            message.setText(text);
            emailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email notification: " + e.getMessage());
            // Logging failure, but not throwing an exception to avoid blocking the approval flow
        }
    }
}
