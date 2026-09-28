-- V12: Set USA as the only country for Nomad Mode seed data and trips

-- Update Maya Nomad (ID = 1) -> New York, USA
UPDATE workations
SET city = 'New York',
    country = 'USA',
    timezone = 'America/New_York',
    timezone_offset_minutes = -240,
    start_date = '2026-09-25',
    end_date = '2026-10-31',
    base_start_date = '2026-09-25',
    base_end_date = '2026-11-01',
    base_start_time = '09:30 AM IST',
    base_end_time = '09:30 AM IST',
    time_gap_description = 'New York (America/New_York) is -9.5h behind Base HQ (IST)',
    time_gap_hours = -9.5,
    status_icon = '🗽',
    status_message = 'Taking nomad leave in New York, USA! Reachable for urgent matters.',
    approval_status = 'APPROVED',
    manager_approval_comment = 'Approved by Engineering Manager (Alice)',
    hr_approval_comment = 'Final HR approval granted for New York, USA Nomad leave'
WHERE id = 1;

-- Update Leo Wanderer (ID = 2) -> San Francisco, USA
UPDATE workations
SET city = 'San Francisco',
    country = 'USA',
    timezone = 'America/Los_Angeles',
    timezone_offset_minutes = -420,
    start_date = '2026-10-15',
    end_date = '2026-11-15',
    base_start_date = '2026-10-15',
    base_end_date = '2026-11-16',
    base_start_time = '12:30 PM IST',
    base_end_time = '12:30 PM IST',
    time_gap_description = 'San Francisco (America/Los_Angeles) is -12.5h behind Base HQ (IST)',
    time_gap_hours = -12.5,
    status_icon = '🌉',
    status_message = 'Taking nomad leave in San Francisco, USA! Reachable for urgent syncs.',
    approval_status = 'PENDING_MANAGER'
WHERE id = 2;
