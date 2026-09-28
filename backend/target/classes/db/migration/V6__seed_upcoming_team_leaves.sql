-- V6: Seed upcoming team leaves and conflicts for demonstration

-- 1. Diana Dev: Annual Leave (Oct 12 - Oct 16, 2026), 5 working days, APPROVED
INSERT INTO leave_requests (
    requester_id, leave_type_id, start_date, end_date, working_days,
    reason, status, current_assignee_id, due_at, escalated, stage_skipped,
    conflict_flagged, conflict_details, created_at, updated_at
) VALUES (
    4, 1, '2026-10-12', '2026-10-16', 5,
    'Family autumn trip', 'APPROVED', NULL, NULL, FALSE, FALSE,
    FALSE, NULL, '2026-09-01 10:00:00+00', '2026-09-02 11:00:00+00'
);

-- 2. Frank Dev: Sick Leave (Oct 14 - Oct 15, 2026), 2 working days, APPROVED
-- Overlaps with Diana on Oct 14 & 15 (2/3 = 67% team away -> Overlap conflict!)
INSERT INTO leave_requests (
    requester_id, leave_type_id, start_date, end_date, working_days,
    reason, status, current_assignee_id, due_at, escalated, stage_skipped,
    conflict_flagged, conflict_details, created_at, updated_at
) VALUES (
    6, 2, '2026-10-14', '2026-10-15', 2,
    'Medical procedure & recovery', 'APPROVED', NULL, NULL, FALSE, FALSE,
    TRUE, '[{"date":"2026-10-14","awayMembers":["Diana Dev"],"awayPercentage":0.67},{"date":"2026-10-15","awayMembers":["Diana Dev"],"awayPercentage":0.67}]',
    '2026-09-05 09:30:00+00', '2026-09-06 14:00:00+00'
);

-- 3. Alice Manager: Annual Leave (Nov 4 - Nov 6, 2026), 3 working days, APPROVED
INSERT INTO leave_requests (
    requester_id, leave_type_id, start_date, end_date, working_days,
    reason, status, current_assignee_id, due_at, escalated, stage_skipped,
    conflict_flagged, conflict_details, created_at, updated_at
) VALUES (
    1, 1, '2026-11-04', '2026-11-06', 3,
    'Leadership conference', 'APPROVED', NULL, NULL, FALSE, FALSE,
    FALSE, NULL, '2026-09-10 10:00:00+00', '2026-09-11 10:00:00+00'
);

-- 4. Diana Dev: Personal Leave (Nov 17 - Nov 18, 2026), 2 working days, APPROVED
INSERT INTO leave_requests (
    requester_id, leave_type_id, start_date, end_date, working_days,
    reason, status, current_assignee_id, due_at, escalated, stage_skipped,
    conflict_flagged, conflict_details, created_at, updated_at
) VALUES (
    4, 3, '2026-11-17', '2026-11-18', 2,
    'Personal errands', 'APPROVED', NULL, NULL, FALSE, FALSE,
    FALSE, NULL, '2026-09-15 08:00:00+00', '2026-09-16 09:00:00+00'
);

-- 5. Frank Dev: Annual Leave (Nov 18 - Nov 20, 2026), 3 working days, PENDING_MANAGER
-- Overlaps with Diana on Nov 18!
INSERT INTO leave_requests (
    requester_id, leave_type_id, start_date, end_date, working_days,
    reason, status, current_assignee_id, due_at, escalated, stage_skipped,
    conflict_flagged, conflict_details, created_at, updated_at
) VALUES (
    6, 1, '2026-11-18', '2026-11-20', 3,
    'Long weekend getaway', 'PENDING_MANAGER', 1, '2026-11-01 18:00:00+00', FALSE, FALSE,
    TRUE, '[{"date":"2026-11-18","awayMembers":["Diana Dev"],"awayPercentage":0.67}]',
    '2026-09-20 12:00:00+00', '2026-09-20 12:00:00+00'
);
