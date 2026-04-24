-- Add extra columns to alpine_camps (enriching from JSON data)
ALTER TABLE alpine_camps ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE alpine_camps ADD COLUMN IF NOT EXISTS sub_region text;
ALTER TABLE alpine_camps ADD COLUMN IF NOT EXISTS facilities text[];
ALTER TABLE alpine_camps ADD COLUMN IF NOT EXISTS route_count smallint;
ALTER TABLE alpine_camps ADD COLUMN IF NOT EXISTS difficulty_range text;
ALTER TABLE alpine_camps ADD COLUMN IF NOT EXISTS founded smallint;
ALTER TABLE alpine_camps ADD COLUMN IF NOT EXISTS season text;

-- Drop old season columns (replaced by text field)
ALTER TABLE alpine_camps DROP COLUMN IF EXISTS season_start;
ALTER TABLE alpine_camps DROP COLUMN IF EXISTS season_end;
