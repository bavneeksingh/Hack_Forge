-- V11: Nomad Mode Leave Time Gap Calculation (Remove Working Hours, Support True Leave across Timezones)

ALTER TABLE workations ADD COLUMN IF NOT EXISTS base_start_date DATE;
ALTER TABLE workations ADD COLUMN IF NOT EXISTS base_end_date DATE;
ALTER TABLE workations ADD COLUMN IF NOT EXISTS base_start_time VARCHAR(20);
ALTER TABLE workations ADD COLUMN IF NOT EXISTS base_end_time VARCHAR(20);
ALTER TABLE workations ADD COLUMN IF NOT EXISTS time_gap_description VARCHAR(255);
ALTER TABLE workations ADD COLUMN IF NOT EXISTS time_gap_hours DOUBLE PRECISION;

-- Populate Maya Nomad (Tokyo: UTC+9:00, +3.5h vs Base HQ IST UTC+5:30)
-- Tokyo Sep 20 00:00 JST -> Sep 19 08:30 PM IST
-- Tokyo Oct 31 23:59 JST -> Oct 31 08:30 PM IST
UPDATE workations
SET base_start_date = '2026-09-19',
    base_end_date = '2026-10-31',
    base_start_time = '08:30 PM IST',
    base_end_time = '08:30 PM IST',
    time_gap_description = 'Tokyo (Asia/Tokyo) is +3.5h ahead of Base HQ (IST)',
    time_gap_hours = 3.5
WHERE id = 1;

-- Populate Leo Wanderer (London: UTC+1:00 BST, -4.5h vs Base HQ IST UTC+5:30)
-- London Oct 15 00:00 BST -> Oct 15 04:30 AM IST
-- London Nov 15 23:59 BST -> Nov 16 04:30 AM IST
UPDATE workations
SET base_start_date = '2026-10-15',
    base_end_date = '2026-11-16',
    base_start_time = '04:30 AM IST',
    base_end_time = '04:30 AM IST',
    time_gap_description = 'London (Europe/London) is -4.5h behind Base HQ (IST)',
    time_gap_hours = -4.5
WHERE id = 2;
