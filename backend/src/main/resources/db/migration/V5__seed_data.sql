-- V5: Seed demo data
-- Passwords are BCrypt-hashed "password123"

-- Users (managers first, then employees, then HR)
INSERT INTO users (email, password, name, role, join_date, active) VALUES
('alice.manager@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Alice Manager', 'MANAGER', '2024-01-15', TRUE);

INSERT INTO users (email, password, name, role, join_date, active) VALUES
('bob.manager@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Bob Manager', 'MANAGER', '2024-02-01', TRUE);

-- Teams
INSERT INTO teams (name, manager_id, conflict_threshold, escalation_timeout_hours) VALUES
('Engineering', 1, 0.40, 48);

INSERT INTO teams (name, manager_id, conflict_threshold, escalation_timeout_hours) VALUES
('Design', 2, 0.50, 48);

-- Set manager relationships: Alice reports to Bob (for escalation chain)
UPDATE users SET manager_id = 2, team_id = 1 WHERE id = 1;
UPDATE users SET team_id = 2 WHERE id = 2;

-- Employees
INSERT INTO users (email, password, name, role, manager_id, team_id, join_date, active) VALUES
('charlie@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Charlie Dev', 'EMPLOYEE', 1, 1, '2024-03-01', TRUE);

INSERT INTO users (email, password, name, role, manager_id, team_id, join_date, active) VALUES
('diana@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Diana Dev', 'EMPLOYEE', 1, 1, '2024-06-15', TRUE);

INSERT INTO users (email, password, name, role, manager_id, team_id, join_date, active) VALUES
('eve@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Eve Designer', 'EMPLOYEE', 2, 2, '2025-07-01', TRUE);

INSERT INTO users (email, password, name, role, manager_id, team_id, join_date, active) VALUES
('frank@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Frank Dev', 'EMPLOYEE', 1, 1, '2026-07-01', TRUE);

-- HR users
INSERT INTO users (email, password, name, role, join_date, active) VALUES
('hr.helen@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Helen HR', 'HR', '2024-01-01', TRUE);

INSERT INTO users (email, password, name, role, join_date, active) VALUES
('hr.ivan@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Ivan HR', 'HR', '2024-01-01', TRUE);

-- Leave Types
INSERT INTO leave_types (name, annual_entitlement, carry_forward) VALUES
('Annual Leave', 24, TRUE);

INSERT INTO leave_types (name, annual_entitlement, carry_forward) VALUES
('Sick Leave', 12, FALSE);

INSERT INTO leave_types (name, annual_entitlement, carry_forward) VALUES
('Personal Leave', 5, FALSE);

-- Leave Balances for 2026 (employees get full entitlement unless pro-rated)
-- Charlie (joined 2024) - full entitlement
INSERT INTO leave_balances (employee_id, leave_type_id, "year", entitled, used, pending) VALUES
(3, 1, 2026, 24, 3, 0),
(3, 2, 2026, 12, 1, 0),
(3, 3, 2026, 5, 0, 0);

-- Diana (joined 2024) - full entitlement
INSERT INTO leave_balances (employee_id, leave_type_id, "year", entitled, used, pending) VALUES
(4, 1, 2026, 24, 5, 2),
(4, 2, 2026, 12, 0, 0),
(4, 3, 2026, 5, 1, 0);

-- Eve (joined Jul 2025) - full entitlement in 2026
INSERT INTO leave_balances (employee_id, leave_type_id, "year", entitled, used, pending) VALUES
(5, 1, 2026, 24, 0, 0),
(5, 2, 2026, 12, 2, 0),
(5, 3, 2026, 5, 0, 0);

-- Frank (joined Jul 2026) - pro-rated: 24 * 6/12 = 12 for annual
INSERT INTO leave_balances (employee_id, leave_type_id, "year", entitled, used, pending) VALUES
(6, 1, 2026, 12, 0, 0),
(6, 2, 2026, 6, 0, 0),
(6, 3, 2026, 2.5, 0, 0);

-- Public Holidays 2026
INSERT INTO public_holidays (date, name, "year") VALUES
('2026-01-01', 'New Year''s Day', 2026),
('2026-01-26', 'Republic Day', 2026),
('2026-03-30', 'Holi', 2026),
('2026-04-03', 'Good Friday', 2026),
('2026-05-01', 'May Day', 2026),
('2026-08-15', 'Independence Day', 2026),
('2026-10-02', 'Gandhi Jayanti', 2026),
('2026-10-20', 'Dussehra', 2026),
('2026-11-09', 'Diwali', 2026),
('2026-12-25', 'Christmas Day', 2026);
