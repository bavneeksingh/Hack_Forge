-- V8: Seed new mid-joining entries for Employee, Manager, and HR
-- Passwords are BCrypt-hashed "password123"

-- George Dev (Employee joining mid-year on May 15, 2026 under Alice Manager)
INSERT INTO users (email, password, name, role, manager_id, team_id, join_date, active) VALUES
('george.dev@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'George Dev', 'EMPLOYEE', 1, 1, '2026-05-15', TRUE);

-- Marcus Manager (Manager joining mid-year on August 1, 2026 under Bob Manager)
INSERT INTO users (email, password, name, role, manager_id, team_id, join_date, active) VALUES
('marcus.manager@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Marcus Manager', 'MANAGER', 2, 2, '2026-08-01', TRUE);

-- Harper HR (HR team member joining mid-year on September 1, 2026)
INSERT INTO users (email, password, name, role, join_date, active) VALUES
('harper.hr@company.com', '$2b$10$LZn8yyfjLvySaYxW6Unre.CaqIcl1Hfneu/QNzIDB9yh69BNCy09C', 'Harper HR', 'HR', '2026-09-01', TRUE);
