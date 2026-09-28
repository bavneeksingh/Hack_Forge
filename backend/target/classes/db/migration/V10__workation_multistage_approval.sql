-- V10: Multi-stage approvals (Manager -> HR) for Workations / Nomad Mode

ALTER TABLE workations ADD COLUMN manager_approved_by_id BIGINT;
ALTER TABLE workations ADD COLUMN manager_approval_comment VARCHAR(255);
ALTER TABLE workations ADD COLUMN manager_reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE workations ADD COLUMN hr_approved_by_id BIGINT;
ALTER TABLE workations ADD COLUMN hr_approval_comment VARCHAR(255);
ALTER TABLE workations ADD COLUMN hr_reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE workations ADD CONSTRAINT fk_workations_mgr_approver FOREIGN KEY (manager_approved_by_id) REFERENCES users(id);
ALTER TABLE workations ADD CONSTRAINT fk_workations_hr_approver FOREIGN KEY (hr_approved_by_id) REFERENCES users(id);

-- 1. Maya Nomad (Tokyo, ID = 1): Fully Approved by Manager Alice (ID = 1) and Helen HR (ID = 7)
UPDATE workations 
SET approval_status = 'APPROVED', 
    manager_approved_by_id = 1,
    manager_approval_comment = 'Approved by Engineering Manager (Alice)',
    manager_reviewed_at = CURRENT_TIMESTAMP,
    hr_approved_by_id = 7,
    hr_approval_comment = 'Final HR approval granted for Tokyo Nomad workation (5.5h overlap)',
    hr_reviewed_at = CURRENT_TIMESTAMP,
    approved_by_id = 7,
    approval_comment = 'Final HR approval granted for Tokyo Nomad workation'
WHERE id = 1;

-- 2. Leo Wanderer (London, ID = 2): Starts in PENDING_MANAGER (Awaiting Alice's review)
UPDATE workations 
SET approval_status = 'PENDING_MANAGER',
    manager_approved_by_id = NULL,
    manager_approval_comment = NULL,
    manager_reviewed_at = NULL,
    hr_approved_by_id = NULL,
    hr_approval_comment = NULL,
    hr_reviewed_at = NULL
WHERE id = 2;
