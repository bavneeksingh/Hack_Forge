package com.leavemanager.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leavemanager.domain.*;
import com.leavemanager.domain.enums.LeaveAction;
import com.leavemanager.domain.enums.LeaveStatus;
import com.leavemanager.dto.*;
import com.leavemanager.exception.ResourceNotFoundException;
import com.leavemanager.exception.UnauthorizedActionException;
import com.leavemanager.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Main orchestrator service for leave operations.
 * Delegates to WorkingDayService, BalanceService, LeaveStateMachine, ConflictService.
 * Controllers call this service — no business logic in controllers.
 */
@Service
public class LeaveService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final UserRepository userRepository;
    private final ApprovalHistoryRepository approvalHistoryRepository;
    private final TeamRepository teamRepository;
    private final LeaveStateMachine stateMachine;
    private final BalanceService balanceService;
    private final WorkingDayService workingDayService;
    private final ConflictService conflictService;
    private final WorkloadService workloadService;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public LeaveService(LeaveRequestRepository leaveRequestRepository,
                        LeaveTypeRepository leaveTypeRepository,
                        UserRepository userRepository,
                        ApprovalHistoryRepository approvalHistoryRepository,
                        TeamRepository teamRepository,
                        LeaveStateMachine stateMachine,
                        BalanceService balanceService,
                        WorkingDayService workingDayService,
                        ConflictService conflictService,
                        WorkloadService workloadService,
                        ObjectMapper objectMapper,
                        Clock clock) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.userRepository = userRepository;
        this.approvalHistoryRepository = approvalHistoryRepository;
        this.teamRepository = teamRepository;
        this.stateMachine = stateMachine;
        this.balanceService = balanceService;
        this.workingDayService = workingDayService;
        this.conflictService = conflictService;
        this.workloadService = workloadService;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    // ─── Employee Operations ───────────────────────────────────────────

    @Transactional
    public LeaveRequestDto submitLeave(Long requesterId, LeaveSubmitRequest submitRequest) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        LeaveType leaveType = leaveTypeRepository.findById(submitRequest.leaveTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found"));

        // Calculate working days
        int workingDays = workingDayService.countWorkingDays(submitRequest.startDate(), submitRequest.endDate());
        if (workingDays == 0) {
            throw new IllegalArgumentException("No working days in the selected date range");
        }

        // Reserve balance (throws if insufficient)
        balanceService.reservePending(requester, leaveType, workingDays);

        // Build the request
        LeaveRequest request = new LeaveRequest();
        request.setRequester(requester);
        request.setLeaveType(leaveType);
        request.setStartDate(submitRequest.startDate());
        request.setEndDate(submitRequest.endDate());
        request.setWorkingDays(workingDays);
        request.setReason(submitRequest.reason());
        request.setCreatedAt(Instant.now(clock));
        request.setUpdatedAt(Instant.now(clock));

        // Set initial assignee (requester's manager)
        User manager = requester.getManager();
        request.setCurrentAssignee(manager);

        // Set due date
        int timeoutHours = 48;
        if (requester.getTeam() != null) {
            timeoutHours = requester.getTeam().getEscalationTimeoutHours();
        }
        request.setDueAt(Instant.now(clock).plus(timeoutHours, ChronoUnit.HOURS));

        // Check conflict (informational only)
        conflictService.checkAndSetConflict(request, requester);

        // Transition via state machine (status: null -> PENDING_MANAGER)
        stateMachine.transition(request, LeaveAction.SUBMIT, requester, null);

        LeaveRequest saved = leaveRequestRepository.save(request);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestDto> getMyLeaves(Long requesterId) {
        return leaveRequestRepository.findByRequesterIdOrderByCreatedAtDesc(requesterId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LeaveRequestDto getLeaveById(Long leaveId, Long userId) {
        LeaveRequest request = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));

        // Employees can only see their own; managers/HR can see based on role
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        switch (user.getRole()) {
            case EMPLOYEE -> {
                if (!request.getRequester().getId().equals(userId)) {
                    throw new UnauthorizedActionException("You can only view your own requests");
                }
            }
            case MANAGER -> {
                boolean isOwn = request.getRequester().getId().equals(userId);
                boolean isAssigned = request.getCurrentAssignee() != null
                        && request.getCurrentAssignee().getId().equals(userId);
                boolean isTeamMember = request.getRequester().getManager() != null
                        && request.getRequester().getManager().getId().equals(userId);
                if (!isOwn && !isAssigned && !isTeamMember) {
                    throw new UnauthorizedActionException("Not authorized to view this request");
                }
            }
            case HR -> { /* HR can see any request */ }
        }

        return toDto(request);
    }

    @Transactional
    public LeaveRequestDto cancelLeave(Long leaveId, Long userId) {
        LeaveRequest request = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        LeaveStatus previousStatus = request.getStatus();
        stateMachine.transition(request, LeaveAction.CANCEL, user, "Cancelled by requester");

        // Restore balance
        boolean fromUsed = previousStatus == LeaveStatus.APPROVED;
        balanceService.restore(request.getRequester(), request.getLeaveType(),
                request.getWorkingDays(), fromUsed);

        request.setCurrentAssignee(null);
        request.setDueAt(null);
        leaveRequestRepository.save(request);

        return toDto(request);
    }

    @Transactional(readOnly = true)
    public LeavePreviewDto previewLeave(Long userId, LocalDate startDate, LocalDate endDate, Long leaveTypeId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        int workingDays = workingDayService.countWorkingDays(startDate, endDate);
        List<LocalDate> holidays = workingDayService.getHolidaysInRange(startDate, endDate);
        ConflictService.ConflictPreviewResult conflict = conflictService.previewConflict(user, startDate, endDate);

        return new LeavePreviewDto(workingDays, conflict.flagged(), conflict.details(), holidays, startDate, endDate);
    }

    // ─── Manager Operations ───────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LeaveRequestDto> getManagerPending(Long managerId) {
        // Get requests assigned to this manager or from their team members
        List<LeaveRequest> assigned = leaveRequestRepository
                .findManagerPending(managerId, LeaveStatus.PENDING_MANAGER);

        return assigned.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public LeaveRequestDto managerApprove(Long leaveId, Long managerId, String comment) {
        LeaveRequest request = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        stateMachine.transition(request, LeaveAction.MANAGER_APPROVE, manager, comment);

        // Move to HR stage: find first HR user as assignee
        List<User> hrUsers = userRepository.findByRole(com.leavemanager.domain.enums.Role.HR);
        if (!hrUsers.isEmpty()) {
            request.setCurrentAssignee(hrUsers.get(0));
        }

        // Reset due date for HR stage
        int timeoutHours = 48;
        if (request.getRequester().getTeam() != null) {
            timeoutHours = request.getRequester().getTeam().getEscalationTimeoutHours();
        }
        request.setDueAt(Instant.now(clock).plus(timeoutHours, ChronoUnit.HOURS));

        leaveRequestRepository.save(request);
        return toDto(request);
    }

    @Transactional
    public LeaveRequestDto managerReject(Long leaveId, Long managerId, String comment) {
        LeaveRequest request = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        stateMachine.transition(request, LeaveAction.MANAGER_REJECT, manager, comment);

        // Restore pending balance
        balanceService.restore(request.getRequester(), request.getLeaveType(),
                request.getWorkingDays(), false);

        request.setCurrentAssignee(null);
        request.setDueAt(null);
        leaveRequestRepository.save(request);

        return toDto(request);
    }

    @Transactional(readOnly = true)
    public TeamCalendarDto getTeamCalendar(Long managerId, LocalDate from, LocalDate to) {
        return getTeamCalendarForUser(managerId, from, to);
    }

    @Transactional(readOnly = true)
    public TeamCalendarDto getTeamCalendarForUser(Long userId, LocalDate from, LocalDate to) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        List<LeaveStatus> statuses = List.of(
                LeaveStatus.APPROVED, LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_HR);
        List<LeaveRequest> leaves;
        int teamSize;
        double threshold;
        List<com.leavemanager.dto.WeeklyWorkloadDto> workloads;

        if (user.getRole() == com.leavemanager.domain.enums.Role.HR) {
            leaves = leaveRequestRepository.findAllLeavesInRange(from, to, statuses);
            long activeCount = userRepository.findAll().stream().filter(User::isActive).count();
            teamSize = Math.max((int) activeCount, 1);
            threshold = 0.40;
            workloads = workloadService != null ? workloadService.getAllWorkloadsInRange(from, to) : List.of();
        } else {
            Long managerId;
            Team team = user.getTeam();
            if (user.getRole() == com.leavemanager.domain.enums.Role.MANAGER) {
                managerId = user.getId();
            } else if (user.getManager() != null) {
                managerId = user.getManager().getId();
            } else if (team != null && team.getManager() != null) {
                managerId = team.getManager().getId();
            } else {
                managerId = user.getId();
            }

            leaves = leaveRequestRepository.findTeamLeaves(managerId, from, to, statuses);
            List<User> teammates = userRepository.findByManagerId(managerId);
            teamSize = Math.max(teammates.size(), 1);
            threshold = team != null && team.getConflictThreshold() != null
                    ? team.getConflictThreshold().doubleValue()
                    : 0.40;
            workloads = (team != null && workloadService != null)
                    ? workloadService.getWorkloadsForTeam(team.getId(), from, to)
                    : List.of();
        }

        List<TeamCalendarDto.TeamCalendarEntry> entries = leaves.stream()
                .map(lr -> new TeamCalendarDto.TeamCalendarEntry(
                        lr.getRequester().getId(),
                        lr.getRequester().getName(),
                        lr.getId(),
                        lr.getLeaveType().getName(),
                        lr.getStartDate(),
                        lr.getEndDate(),
                        lr.getStatus().name()
                ))
                .collect(Collectors.toList());

        List<TeamCalendarDto.PublicHolidayDto> holidays = workingDayService.getPublicHolidaysInRange(from, to)
                .stream()
                .map(ph -> new TeamCalendarDto.PublicHolidayDto(ph.getDate(), ph.getName()))
                .collect(Collectors.toList());

        return new TeamCalendarDto(from, to, entries, holidays, teamSize, threshold, workloads);
    }

    // ─── HR Operations ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LeaveRequestDto> getHrPending(String filter) {
        List<LeaveRequest> requests;

        if ("FLAGGED".equalsIgnoreCase(filter)) {
            requests = leaveRequestRepository.findByStatusOrderByCreatedAtAsc(LeaveStatus.PENDING_HR)
                    .stream()
                    .filter(LeaveRequest::isConflictFlagged)
                    .collect(Collectors.toList());
        } else if ("ESCALATED".equalsIgnoreCase(filter)) {
            requests = leaveRequestRepository.findByStatusOrderByCreatedAtAsc(LeaveStatus.PENDING_HR)
                    .stream()
                    .filter(LeaveRequest::isEscalated)
                    .collect(Collectors.toList());
        } else {
            requests = leaveRequestRepository.findByStatusOrderByCreatedAtAsc(LeaveStatus.PENDING_HR);
        }

        return requests.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public LeaveRequestDto hrApprove(Long leaveId, Long hrUserId, String comment) {
        LeaveRequest request = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));
        User hrUser = userRepository.findById(hrUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        stateMachine.transition(request, LeaveAction.HR_APPROVE, hrUser, comment);

        // Final approval: move pending to used
        balanceService.confirmUsed(request.getRequester(), request.getLeaveType(),
                request.getWorkingDays());

        request.setCurrentAssignee(null);
        request.setDueAt(null);
        leaveRequestRepository.save(request);

        return toDto(request);
    }

    @Transactional
    public LeaveRequestDto hrReject(Long leaveId, Long hrUserId, String comment) {
        LeaveRequest request = leaveRequestRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));
        User hrUser = userRepository.findById(hrUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        stateMachine.transition(request, LeaveAction.HR_REJECT, hrUser, comment);

        // Restore pending balance
        balanceService.restore(request.getRequester(), request.getLeaveType(),
                request.getWorkingDays(), false);

        request.setCurrentAssignee(null);
        request.setDueAt(null);
        leaveRequestRepository.save(request);

        return toDto(request);
    }

    @Transactional(readOnly = true)
    public List<BalanceDto> getAllBalances() {
        return balanceService.getAllBalances().stream()
                .map(this::toBalanceDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BalanceDto> getEmployeeBalances(Long employeeId) {
        return balanceService.getEmployeeBalances(employeeId).stream()
                .map(this::toBalanceDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PolicyDto> getAllPolicies() {
        return teamRepository.findAll().stream()
                .map(team -> new PolicyDto(
                        team.getId(),
                        team.getName(),
                        team.getConflictThreshold(),
                        team.getEscalationTimeoutHours()
                ))
                .collect(Collectors.toList());
    }

    @Transactional
    public PolicyDto updatePolicy(Long teamId, PolicyDto policyDto) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));

        if (policyDto.conflictThreshold() != null) {
            team.setConflictThreshold(policyDto.conflictThreshold());
        }
        if (policyDto.escalationTimeoutHours() > 0) {
            team.setEscalationTimeoutHours(policyDto.escalationTimeoutHours());
        }

        teamRepository.save(team);
        return new PolicyDto(team.getId(), team.getName(),
                team.getConflictThreshold(), team.getEscalationTimeoutHours());
    }

    @Transactional(readOnly = true)
    public List<ApprovalHistoryDto> getAuditLog() {
        return approvalHistoryRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(ah -> new ApprovalHistoryDto(
                        ah.getStage(),
                        ah.getActor() != null
                                ? new UserSummaryDto(ah.getActor().getId(), ah.getActor().getName())
                                : new UserSummaryDto(0L, "System"),
                        ah.getAction().name(),
                        ah.getComment(),
                        ah.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    // ─── DTO Mappers ──────────────────────────────────────────────────

    private LeaveRequestDto toDto(LeaveRequest lr) {
        List<ApprovalHistory> historyList = approvalHistoryRepository
                .findByLeaveRequestIdOrderByCreatedAtAsc(lr.getId());

        List<ApprovalHistoryDto> history = historyList.stream()
                .map(ah -> new ApprovalHistoryDto(
                        ah.getStage(),
                        ah.getActor() != null
                                ? new UserSummaryDto(ah.getActor().getId(), ah.getActor().getName())
                                : new UserSummaryDto(0L, "System"),
                        ah.getAction().name(),
                        ah.getComment(),
                        ah.getCreatedAt()
                ))
                .collect(Collectors.toList());

        List<ConflictDetail> conflictDetails = parseConflictDetails(lr.getConflictDetails());

        return new LeaveRequestDto(
                lr.getId(),
                new UserSummaryDto(lr.getRequester().getId(), lr.getRequester().getName()),
                lr.getLeaveType().getName(),
                lr.getStartDate(),
                lr.getEndDate(),
                lr.getWorkingDays(),
                lr.getReason(),
                lr.getStatus().name(),
                lr.getCurrentAssignee() != null
                        ? new UserSummaryDto(lr.getCurrentAssignee().getId(), lr.getCurrentAssignee().getName())
                        : null,
                lr.getDueAt(),
                lr.isEscalated(),
                lr.getEscalatedFrom(),
                lr.isStageSkipped(),
                lr.isConflictFlagged(),
                conflictDetails,
                history
        );
    }

    private BalanceDto toBalanceDto(LeaveBalance lb) {
        return new BalanceDto(
                lb.getId(),
                lb.getEmployee().getId(),
                lb.getEmployee().getName(),
                lb.getLeaveType().getName(),
                lb.getYear(),
                lb.getEntitled(),
                lb.getUsed(),
                lb.getPending(),
                lb.getAvailable()
        );
    }

    private List<ConflictDetail> parseConflictDetails(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<ConflictDetail>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }
}
