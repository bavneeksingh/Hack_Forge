-- V2: Leave Types and Balances

CREATE TABLE leave_types (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name               VARCHAR(100) NOT NULL UNIQUE,
    annual_entitlement INT          NOT NULL,
    carry_forward      BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE leave_balances (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id   BIGINT       NOT NULL,
    leave_type_id BIGINT       NOT NULL,
    "year"        INT          NOT NULL,
    entitled      DECIMAL(5,1) NOT NULL DEFAULT 0,
    used          DECIMAL(5,1) NOT NULL DEFAULT 0,
    pending       DECIMAL(5,1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_balances_employee   FOREIGN KEY (employee_id)   REFERENCES users(id),
    CONSTRAINT fk_balances_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
    CONSTRAINT uq_balance UNIQUE (employee_id, leave_type_id, "year")
);
