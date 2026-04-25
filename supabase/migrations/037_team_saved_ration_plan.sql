-- Save the ration plan selected for a team preparation workflow.
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS ration_template_id text,
  ADD COLUMN IF NOT EXISTS ration_people integer CHECK (ration_people IS NULL OR ration_people > 0),
  ADD COLUMN IF NOT EXISTS ration_days integer CHECK (ration_days IS NULL OR ration_days > 0);
