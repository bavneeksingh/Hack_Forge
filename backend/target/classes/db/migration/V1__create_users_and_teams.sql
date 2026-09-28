-- V1: Users and Teams

CREATE TABLE users (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL,
    manager_id  BIGINT,
    team_id     BIGINT,
    join_date   DATE         NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users(id)
);

CREATE TABLE teams (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                     VARCHAR(255) NOT NULL,
    manager_id               BIGINT       NOT NULL,
    conflict_threshold       DECIMAL(4,2) NOT NULL DEFAULT 0.40,
    escalation_timeout_hours INT          NOT NULL DEFAULT 48,
    CONSTRAINT fk_teams_manager FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- Add team FK after teams table exists
ALTER TABLE users ADD CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams(id);
