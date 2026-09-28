package com.leavemanager.service;

import com.leavemanager.domain.User;
import com.leavemanager.domain.Workation;
import com.leavemanager.domain.enums.Role;
import com.leavemanager.dto.CreateWorkationRequest;
import com.leavemanager.dto.TimezonePreviewDto;
import com.leavemanager.dto.WorkationDto;
import com.leavemanager.exception.BadRequestException;
import com.leavemanager.exception.ResourceNotFoundException;
import com.leavemanager.repository.UserRepository;
import com.leavemanager.repository.WorkationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class WorkationService {

    public static final ZoneId TEAM_TIMEZONE = ZoneId.of("Asia/Kolkata");
    public static final String TEAM_TIMEZONE_LABEL = "IST (UTC+5:30)";
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("hh:mm a");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy");

    private final WorkationRepository workationRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    public WorkationService(WorkationRepository workationRepository,
                            UserRepository userRepository,
                            Clock clock) {
        this.workationRepository = workationRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    @Transactional
    public WorkationDto createWorkation(Long userId, CreateWorkationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (request.startDate().isAfter(request.endDate())) {
            throw new BadRequestException("Start date cannot be after end date");
        }

        TimeGapResult timeGap = calculateLeaveTimeGap(request.timezone(), request.startDate(), request.endDate());

        // Determine initial approval status
        String initialStatus;
        User autoApprover = null;
        String autoComment = null;
        Instant reviewedAt = null;

        if (user.getRole() == Role.HR || user.getManager() == null) {
            initialStatus = "APPROVED";
            autoApprover = user;
            autoComment = "Auto-approved for leadership / HR";
            reviewedAt = Instant.now(clock);
        } else if (user.getRole() == Role.MANAGER) {
            initialStatus = "PENDING_HR";
        } else {
            initialStatus = "PENDING_MANAGER";
        }

        Workation workation = new Workation(
                user,
                request.city(),
                request.country(),
                request.timezone(),
                timeGap.offsetMinutes(),
                request.startDate(),
                request.endDate(),
                timeGap.baseStartDate(),
                timeGap.baseEndDate(),
                timeGap.baseStartTime(),
                timeGap.baseEndTime(),
                timeGap.timeGapDescription(),
                timeGap.timeDiffHours(),
                request.statusMessage(),
                request.statusIcon() != null && !request.statusIcon().isBlank() ? request.statusIcon() : "🌴",
                initialStatus
        );

        if (autoApprover != null) {
            workation.setApprovedBy(autoApprover);
            workation.setApprovalComment(autoComment);
            workation.setReviewedAt(reviewedAt);
            workation.setHrApprovedBy(autoApprover);
            workation.setHrApprovalComment(autoComment);
            workation.setHrReviewedAt(reviewedAt);
        }

        Workation saved = workationRepository.save(workation);
        return toDto(saved);
    }

    @Transactional
    public WorkationDto approveWorkation(Long actorId, Long workationId, String comment) {
        Workation workation = workationRepository.findById(workationId)
                .orElseThrow(() -> new ResourceNotFoundException("Workation request not found: " + workationId));

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new ResourceNotFoundException("Actor not found: " + actorId));

        String currentStatus = workation.getApprovalStatus();
        boolean isManagerOfUser = workation.getUser().getManager() != null &&
                workation.getUser().getManager().getId().equals(actorId);
        boolean isHr = actor.getRole() == Role.HR;

        if ("PENDING_MANAGER".equalsIgnoreCase(currentStatus)) {
            if (isManagerOfUser) {
                // Manager approved -> move to PENDING_HR stage
                workation.setApprovalStatus("PENDING_HR");
                workation.setManagerApprovedBy(actor);
                workation.setManagerApprovalComment(comment != null && !comment.isBlank() ? comment : "Manager Approved");
                workation.setManagerReviewedAt(Instant.now(clock));
                workation.setApprovedBy(actor);
                workation.setApprovalComment("Manager Approved • Awaiting HR review");
                workation.setReviewedAt(Instant.now(clock));
            } else if (isHr) {
                // HR directly approves -> final APPROVED
                workation.setApprovalStatus("APPROVED");
                workation.setHrApprovedBy(actor);
                workation.setHrApprovalComment(comment != null && !comment.isBlank() ? comment : "HR Direct Approved");
                workation.setHrReviewedAt(Instant.now(clock));
                workation.setApprovedBy(actor);
                workation.setApprovalComment("HR Direct Approved");
                workation.setReviewedAt(Instant.now(clock));
                workation.setActive(true);
            } else {
                throw new BadRequestException("Only the assigned manager or HR can approve this request.");
            }
        } else if ("PENDING_HR".equalsIgnoreCase(currentStatus)) {
            if (!isHr) {
                throw new BadRequestException("Only HR can perform final approval for requests in PENDING_HR status.");
            }
            // HR final approval -> APPROVED
            workation.setApprovalStatus("APPROVED");
            workation.setHrApprovedBy(actor);
            workation.setHrApprovalComment(comment != null && !comment.isBlank() ? comment : "HR Final Approved");
            workation.setHrReviewedAt(Instant.now(clock));
            workation.setApprovedBy(actor);
            workation.setApprovalComment(comment != null && !comment.isBlank() ? comment : "HR Final Approved");
            workation.setReviewedAt(Instant.now(clock));
            workation.setActive(true);
        } else {
            throw new BadRequestException("Cannot approve workation with status: " + currentStatus);
        }

        Workation saved = workationRepository.save(workation);
        return toDto(saved);
    }

    @Transactional
    public WorkationDto rejectWorkation(Long actorId, Long workationId, String comment) {
        Workation workation = workationRepository.findById(workationId)
                .orElseThrow(() -> new ResourceNotFoundException("Workation request not found: " + workationId));

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new ResourceNotFoundException("Actor not found: " + actorId));

        boolean isManagerOfUser = workation.getUser().getManager() != null &&
                workation.getUser().getManager().getId().equals(actorId);
        boolean isHr = actor.getRole() == Role.HR;

        if (!isManagerOfUser && !isHr) {
            throw new BadRequestException("Only the assigned manager or HR can reject this workation request.");
        }

        workation.setApprovalStatus("REJECTED");
        workation.setApprovedBy(actor);
        workation.setApprovalComment(comment != null && !comment.isBlank() ? comment : "Rejected");
        workation.setReviewedAt(Instant.now(clock));
        workation.setActive(false);

        Workation saved = workationRepository.save(workation);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<WorkationDto> getManagerPending(Long managerId) {
        return workationRepository.findPendingForManager(managerId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkationDto> getHrPending() {
        return workationRepository.findPendingForHr()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkationDto> getMyWorkations(Long userId) {
        return workationRepository.findByUserIdOrderByStartDateDesc(userId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<WorkationDto> getActiveWorkation(Long userId) {
        LocalDate today = LocalDate.now(clock);
        return workationRepository.findActiveForUserOnDate(userId, today)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public List<WorkationDto> getTeamWorkations(Long userId, LocalDate from, LocalDate to) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        List<Workation> workations;
        if (user.getRole() == Role.HR) {
            workations = workationRepository.findAllApprovedWorkationsInRange(from, to);
        } else {
            Long managerId;
            if (user.getRole() == Role.MANAGER) {
                managerId = user.getId();
            } else if (user.getManager() != null) {
                managerId = user.getManager().getId();
            } else if (user.getTeam() != null && user.getTeam().getManager() != null) {
                managerId = user.getTeam().getManager().getId();
            } else {
                managerId = user.getId();
            }
            workations = workationRepository.findApprovedTeamWorkations(managerId, from, to);
        }

        return workations.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public void deleteWorkation(Long userId, Long workationId) {
        Workation workation = workationRepository.findById(workationId)
                .orElseThrow(() -> new ResourceNotFoundException("Workation not found: " + workationId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        boolean isOwner = workation.getUser().getId().equals(userId);
        boolean isManager = user.getRole() == Role.MANAGER || user.getRole() == Role.HR;

        if (!isOwner && !isManager) {
            throw new BadRequestException("You do not have permission to delete this workation trip.");
        }

        workationRepository.delete(workation);
    }

    @Transactional(readOnly = true)
    public TimezonePreviewDto previewTimezone(String timezoneStr, LocalDate startD, LocalDate endD, String localStartStr, String localEndStr) {
        LocalDate startDate = startD != null ? startD : LocalDate.now(clock);
        LocalDate endDate = endD != null ? endD : startDate.plusDays(7);

        TimeGapResult timeGap = calculateLeaveTimeGap(timezoneStr, startDate, endDate);

        String summary = String.format("%s leave from %s to %s converts to %s in Base HQ (%s) calendar.",
                timezoneStr, timeGap.localLeaveWindow(), timeGap.baseLeaveWindow(), timeGap.timeGapDescription(), TEAM_TIMEZONE_LABEL);

        return new TimezonePreviewDto(
                timezoneStr,
                TEAM_TIMEZONE_LABEL,
                timeGap.timeDiffHours(),
                timeGap.timeGapDescription(),
                startDate,
                endDate,
                timeGap.baseStartDate(),
                timeGap.baseEndDate(),
                timeGap.baseStartTime(),
                timeGap.baseEndTime(),
                timeGap.localLeaveWindow(),
                timeGap.baseLeaveWindow(),
                "Leave (Full Day)",
                timeGap.baseStartTime() + " - " + timeGap.baseEndTime() + " IST",
                0.0,
                "0.0 hrs",
                summary
        );
    }

    // ─── Timezone Leave Gap Math ────────────────────────────────────────

    public TimeGapResult calculateLeaveTimeGap(String remoteZoneStr, LocalDate startDate, LocalDate endDate) {
        ZoneId remoteZone;
        try {
            remoteZone = ZoneId.of(remoteZoneStr);
        } catch (Exception e) {
            remoteZone = ZoneId.of("UTC");
        }

        ZonedDateTime remoteStart = ZonedDateTime.of(startDate, LocalTime.MIN, remoteZone);
        ZonedDateTime remoteEnd = ZonedDateTime.of(endDate, LocalTime.of(23, 59, 59), remoteZone);

        ZonedDateTime baseStart = remoteStart.withZoneSameInstant(TEAM_TIMEZONE);
        ZonedDateTime baseEnd = remoteEnd.withZoneSameInstant(TEAM_TIMEZONE);

        LocalDate baseStartDate = baseStart.toLocalDate();
        LocalDate baseEndDate = baseEnd.toLocalDate();

        String baseStartTime = baseStart.format(TIME_FORMATTER) + " IST";
        String baseEndTime = baseEnd.format(TIME_FORMATTER) + " IST";

        int remoteOffsetSec = remoteStart.getOffset().getTotalSeconds();
        int teamOffsetSec = baseStart.getOffset().getTotalSeconds();
        int offsetMinutes = remoteOffsetSec / 60;
        double timeDiffHours = (remoteOffsetSec - teamOffsetSec) / 3600.0;

        String shortTz = remoteZone.getId().contains("/")
                ? remoteZone.getId().substring(remoteZone.getId().lastIndexOf('/') + 1).replace('_', ' ')
                : remoteZone.getId();

        String diffSign = timeDiffHours > 0 ? "+" : "";
        String diffWord = timeDiffHours > 0 ? "ahead of" : (timeDiffHours < 0 ? "behind" : "same as");
        String timeGapDescription = String.format("%s (%s) is %s%.1fh %s Base HQ (%s)",
                shortTz, remoteZone.getId(), diffSign, Math.abs(timeDiffHours), diffWord, TEAM_TIMEZONE_LABEL);

        String localLeaveWindow = startDate.format(DATE_FORMATTER) + " (00:00) → " +
                endDate.format(DATE_FORMATTER) + " (23:59) [" + shortTz + "]";

        String baseLeaveWindow = baseStartDate.format(DATE_FORMATTER) + " (" + baseStartTime + ") → " +
                baseEndDate.format(DATE_FORMATTER) + " (" + baseEndTime + ") [Base HQ IST]";

        return new TimeGapResult(
                offsetMinutes,
                timeDiffHours,
                baseStartDate,
                baseEndDate,
                baseStartTime,
                baseEndTime,
                timeGapDescription,
                localLeaveWindow,
                baseLeaveWindow
        );
    }

    public record TimeGapResult(
            int offsetMinutes,
            double timeDiffHours,
            LocalDate baseStartDate,
            LocalDate baseEndDate,
            String baseStartTime,
            String baseEndTime,
            String timeGapDescription,
            String localLeaveWindow,
            String baseLeaveWindow
    ) {}

    public WorkationDto toDto(Workation w) {
        LocalDate today = LocalDate.now(clock);
        boolean isApproved = "APPROVED".equalsIgnoreCase(w.getApprovalStatus());
        LocalDate bStart = w.getBaseStartDate() != null ? w.getBaseStartDate() : w.getStartDate();
        LocalDate bEnd = w.getBaseEndDate() != null ? w.getBaseEndDate() : w.getEndDate();
        boolean isCurrentlyActive = w.isActive() && isApproved && !today.isBefore(bStart) && !today.isAfter(bEnd);

        TimeGapResult timeGap = calculateLeaveTimeGap(w.getTimezone(), w.getStartDate(), w.getEndDate());

        String shortTz = w.getTimezone().contains("/")
                ? w.getTimezone().substring(w.getTimezone().lastIndexOf('/') + 1).replace('_', ' ')
                : w.getTimezone();

        String localDatesDisplay = w.getStartDate().format(DATE_FORMATTER) + " → " + w.getEndDate().format(DATE_FORMATTER) + " (" + w.getCity() + " Time)";
        String baseStartTime = w.getBaseStartTime() != null ? w.getBaseStartTime() : timeGap.baseStartTime();
        String baseEndTime = w.getBaseEndTime() != null ? w.getBaseEndTime() : timeGap.baseEndTime();
        String teamDatesDisplay = bStart.format(DATE_FORMATTER) + " (" + baseStartTime + ") → " + bEnd.format(DATE_FORMATTER) + " (" + baseEndTime + ") (Base HQ IST)";

        String approverName = w.getApprovedBy() != null ? w.getApprovedBy().getName() : null;
        String mgrName = w.getManagerApprovedBy() != null ? w.getManagerApprovedBy().getName() : null;
        String hrName = w.getHrApprovedBy() != null ? w.getHrApprovedBy().getName() : null;

        return new WorkationDto(
                w.getId(),
                w.getUser().getId(),
                w.getUser().getName(),
                w.getUser().getEmail(),
                w.getCity(),
                w.getCountry(),
                w.getTimezone(),
                w.getTimezoneOffsetMinutes(),
                w.getStartDate(),
                w.getEndDate(),
                bStart,
                bEnd,
                baseStartTime,
                baseEndTime,
                w.getTimeGapDescription() != null ? w.getTimeGapDescription() : timeGap.timeGapDescription(),
                localDatesDisplay,
                teamDatesDisplay,
                timeGap.localLeaveWindow(),
                timeGap.baseLeaveWindow(),
                "00:00",
                "23:59",
                "Full Day Leave (" + shortTz + ")",
                baseStartTime + " - " + baseEndTime,
                0.0,
                w.getStatusMessage(),
                w.getStatusIcon(),
                w.isActive(),
                isCurrentlyActive,
                timeGap.timeDiffHours(),
                w.getApprovalStatus(),
                approverName,
                w.getApprovalComment(),
                w.getReviewedAt(),
                mgrName,
                w.getManagerApprovalComment(),
                w.getManagerReviewedAt(),
                hrName,
                w.getHrApprovalComment(),
                w.getHrReviewedAt()
        );
    }
}
