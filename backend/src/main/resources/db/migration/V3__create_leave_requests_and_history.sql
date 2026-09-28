-- V3: Leave Requests and Approval History

CREATE TABLE leave_requests (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    requester_id        BIGINT       NOT NULL,
    leave_type_id       BIGINT       NOT NULL,
    start_date          DATE         NOT NULL,
    end_date            DATE         NOT NULL,
    working_days        INT          NOT NULL,
    reason              TEXT,
    status              VARCHAR(30)  NOT NULL,
    current_assignee_id BIGINT,
    due_at              TIMESTAMP WITH TIME ZONE,
    escalated           BOOLEAN      NOT NULL DEFAULT FALSE,
    escalated_from      VARCHAR(255),
    stage_skipped       BOOLEAN      NOT NULL DEFAULT FALSE,
    conflict_flagged    BOOLEAN      NOT NULL DEFAULT FALSE,
    conflict_details    TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_lr_requester  FOREIGN KEY (requester_id)        REFERENCES users(id),
    CONSTRAINT fk_lr_leave_type FOREIGN KEY (leave_type_id)       REFERENCES leave_types(id),
    CONSTRAINT fk_lr_assignee   FOREIGN KEY (current_assignee_id) REFERENCES users(id)
);

CREATE TABLE approval_history (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leave_request_id BIGINT       NOT NULL,
    stage            VARCHAR(30)  NOT NULL,
    actor_id         BIGINT,
    action           VARCHAR(30)  NOT NULL,
    comment          TEXT,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_ah_leave_request FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id),
    CONSTRAINT fk_ah_actor         FOREIGN KEY (actor_id)         REFERENCES users(id)
);

CREATE INDEX idx_lr_requester ON leave_requests(requester_id);
CREATE INDEX idx_lr_status    ON leave_requests(status);
CREATE INDEX idx_lr_assignee  ON leave_requests(current_assignee_id);
CREATE INDEX idx_lr_dates     ON leave_requests(start_date, end_date);
CREATE INDEX idx_ah_request   ON approval_history(leave_request_id);
