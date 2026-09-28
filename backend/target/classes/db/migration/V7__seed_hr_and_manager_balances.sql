-- V7: Seed leave balances for HR and Manager users for 2026

-- Alice Manager (id 1)
INSERT INTO leave_balances (employee_id, leave_type_id, "year", entitled, used, pending) VALUES
(1, 1, 2026, 24, 0, 0),
(1, 2, 2026, 12, 0, 0),
(1, 3, 2026, 5, 0, 0);

-- Bob Manager (id 2)
INSERT INTO leave_balances (employee_id, leave_type_id, "year", entitled, used, pending) VALUES
(2, 1, 2026, 24, 0, 0),
(2, 2, 2026, 12, 0, 0),
(2, 3, 2026, 5, 0, 0);

-- Helen HR (id 7)
INSERT INTO leave_balances (employee_id, leave_type_id, "year", entitled, used, pending) VALUES
(7, 1, 2026, 24, 0, 0),
(7, 2, 2026, 12, 0, 0),
(7, 3, 2026, 5, 0, 0);

-- Ivan HR (id 8)
INSERT INTO leave_balances (employee_id, leave_type_id, "year", entitled, used, pending) VALUES
(8, 1, 2026, 24, 0, 0),
(8, 2, 2026, 12, 0, 0),
(8, 3, 2026, 5, 0, 0);
