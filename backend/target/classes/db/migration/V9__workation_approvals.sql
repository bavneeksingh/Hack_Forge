-- V9: Add approval workflow and audit fields to workations

ALTER TABLE workations ADD COLUMN approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_MANAGER';
ALTER TABLE workations ADD COLUMN approved_by_id BIGINT;
ALTER TABLE workations ADD COLUMN approval_comment VARCHAR(255);
ALTER TABLE workations ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE workations ADD CONSTRAINT fk_workations_approved_by FOREIGN KEY (approved_by_id) REFERENCES users(id);

-- Maya Nomad (ID=9, Tokyo) -> APPROVED by Alice (Manager ID=1)
UPDATE workations 
SET approval_status = 'APPROVED', 
    approved_by_id = 1, 
    approval_comment = 'Approved for Tokyo hub workation (5.5h team overlap)', 
    reviewed_at = CURRENT_TIMESTAMP 
WHERE id = 1;

-- Leo Wanderer (ID=10, London) -> PENDING_MANAGER (Awaiting Alice's approval)
UPDATE workations 
SET approval_status = 'PENDING_MANAGER'
WHERE id = 2;
