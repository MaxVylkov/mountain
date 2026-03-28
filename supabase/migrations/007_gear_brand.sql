-- Add brand column to gear
ALTER TABLE gear ADD COLUMN IF NOT EXISTS brand text;
