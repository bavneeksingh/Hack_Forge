-- V8: Workations (Nomad Mode) and Seed Team Members under Alice

-- 1. Create workations table
CREATE TABLE workations (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id                 BIGINT NOT NULL,
    city                    VARCHAR(100) NOT NULL,
    country                 VARCHAR(100) NOT NULL,
    timezone                VARCHAR(100) NOT NULL,
    timezone_offset_minutes INT NOT NULL,
    start_date              DATE NOT NULL,
    end_date                DATE NOT NULL,
    local_start_time        VARCHAR(10) NOT NULL DEFAULT '09:00',
    local_end_time          VARCHAR(10) NOT NULL DEFAULT '18:00',
    team_converted_hours    VARCHAR(100) NOT NULL,
    overlap_hours           DOUBLE PRECISION NOT NULL,
    status_message          VARCHAR(255),
    status_icon             VARCHAR(20) NOT NULL DEFAULT '🌴',
    active                  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workations_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 2. Seed 2 new team members under Alice (Manager ID = 1, Team ID = 1)
-- Password: "password123"
INSERT INTO users (email, password, name, role, manager_id, team_id, join_date, active) VALUES
('maya.nomad@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Maya Nomad', 'EMPLOYEE', 1, 1, '2024-04-01', TRUE);

INSERT INTO users (email, password, name, role, manager_id, team_id, join_date, active) VALUES
('leo.wanderer@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Leo Wanderer', 'EMPLOYEE', 1, 1, '2024-05-15', TRUE);

-- 3. Seed leave balances for Maya (ID = 9) and Leo (ID = 10)
INSERT INTO leave_balances (employee_id, leave_type_id, "year", entitled, used, pending) VALUES
(9, 1, 2026, 24, 2, 0),
(9, 2, 2026, 12, 0, 0),
(9, 3, 2026, 5, 0, 0);

INSERT INTO leave_balances (employee_id, leave_type_id, "year", entitled, used, pending) VALUES
(10, 1, 2026, 24, 4, 0),
(10, 2, 2026, 12, 1, 0),
(10, 3, 2026, 5, 0, 0);

-- 4. Seed Nomad / Workation Trips
-- Maya: Tokyo, Japan (Active / Current & Upcoming: Sep 20 - Oct 31, 2026)
INSERT INTO workations (
    user_id, city, country, timezone, timezone_offset_minutes,
    start_date, end_date, local_start_time, local_end_time,
    team_converted_hours, overlap_hours, status_message, status_icon, active
) VALUES (
    9, 'Tokyo', 'Japan', 'Asia/Tokyo', 540,
    '2026-09-20', '2026-10-31', '09:00', '18:00',
    '05:30 AM - 02:30 PM IST', 5.5,
    'Working remotely from Tokyo hub! Reachable on Slack during overlap hours.',
    '🌴', TRUE
);

-- Leo: London, United Kingdom (Oct 15 - Nov 15, 2026)
INSERT INTO workations (
    user_id, city, country, timezone, timezone_offset_minutes,
    start_date, end_date, local_start_time, local_end_time,
    team_converted_hours, overlap_hours, status_message, status_icon, active
) VALUES (
    10, 'London', 'United Kingdom', 'Europe/London', 60,
    '2026-10-15', '2026-11-15', '08:00', '17:00',
    '12:30 PM - 09:30 PM IST', 5.5,
    'London co-working space! Available for team syncs from 12:30 PM team time.',
    '✈️', TRUE
);
