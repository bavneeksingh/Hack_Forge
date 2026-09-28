-- V8: Weekly Workloads and Dynamic Thresholds

CREATE TABLE team_weekly_workloads (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id           BIGINT                   NOT NULL,
    start_date        DATE                     NOT NULL,
    end_date          DATE                     NOT NULL,
    workload_level    VARCHAR(20)              NOT NULL, -- 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'
    workload_score    INT                      NOT NULL DEFAULT 50, -- 0-100 score
    threshold         DECIMAL(4,2)             NOT NULL, -- dynamic conflict threshold e.g. 0.60
    sprint_name       VARCHAR(255),
    notes             TEXT,
    created_by_id     BIGINT                   NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tww_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_tww_user FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT uq_team_week UNIQUE (team_id, start_date)
);

CREATE INDEX idx_tww_team_dates ON team_weekly_workloads(team_id, start_date, end_date);

-- Seed initial weekly workloads for demo
-- Alice Manager (Engineering, team 1):
-- 1. Oct 12 - Oct 18, 2026: HIGH Workload (Sprint 24: Core Platform Release), Threshold = 0.60 (60%)
INSERT INTO team_weekly_workloads (
    team_id, start_date, end_date, workload_level, workload_score,
    threshold, sprint_name, notes, created_by_id, created_at, updated_at
) VALUES (
    1, '2026-10-12', '2026-10-18', 'HIGH', 80,
    0.60, 'Sprint 24: Core Platform Release', 'High delivery pressure for Q4 milestone. Stricter team coverage required.',
    1, '2026-09-20 10:00:00+00', '2026-09-20 10:00:00+00'
);

-- 2. Oct 19 - Oct 25, 2026: CRITICAL Workload (Production Launch & Security Audit), Threshold = 0.75 (75%)
INSERT INTO team_weekly_workloads (
    team_id, start_date, end_date, workload_level, workload_score,
    threshold, sprint_name, notes, created_by_id, created_at, updated_at
) VALUES (
    1, '2026-10-19', '2026-10-25', 'CRITICAL', 95,
    0.75, 'Production Launch & Security Audit', 'All-hands deployment week. Overlap threshold set to 75%.',
    1, '2026-09-20 10:00:00+00', '2026-09-20 10:00:00+00'
);

-- 3. Nov 16 - Nov 22, 2026: HIGH Workload (Sprint 26: Performance Hardening), Threshold = 0.60 (60%)
INSERT INTO team_weekly_workloads (
    team_id, start_date, end_date, workload_level, workload_score,
    threshold, sprint_name, notes, created_by_id, created_at, updated_at
) VALUES (
    1, '2026-11-16', '2026-11-22', 'HIGH', 75,
    0.60, 'Sprint 26: Performance Hardening', 'Key deliverables before Thanksgiving freeze.',
    1, '2026-09-22 09:00:00+00', '2026-09-22 09:00:00+00'
);

-- Bob Manager (Design, team 2):
-- 4. Oct 12 - Oct 18, 2026: LOW Workload (Design Exploration & Buffer), Threshold = 0.30 (30%)
INSERT INTO team_weekly_workloads (
    team_id, start_date, end_date, workload_level, workload_score,
    threshold, sprint_name, notes, created_by_id, created_at, updated_at
) VALUES (
    2, '2026-10-12', '2026-10-18', 'LOW', 25,
    0.30, 'Design Exploration & Buffer Week', 'Low workload period. Relaxed capacity for leaves.',
    2, '2026-09-20 10:00:00+00', '2026-09-20 10:00:00+00'
);
