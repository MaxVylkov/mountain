-- Add team_id to trips so a trip can be linked to a team
ALTER TABLE trips ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_trips_team ON trips(team_id);
