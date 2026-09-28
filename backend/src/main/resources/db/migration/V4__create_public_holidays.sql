-- V4: Public Holidays

CREATE TABLE public_holidays (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date DATE         NOT NULL,
    name VARCHAR(255) NOT NULL,
    "year" INT          NOT NULL
);

CREATE INDEX idx_ph_year ON public_holidays("year");
CREATE INDEX idx_ph_date ON public_holidays(date);
