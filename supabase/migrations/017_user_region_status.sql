-- Per-user status for mountain regions (want_to_go, visited)
CREATE TABLE user_region_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  region text NOT NULL,
  want_to_go boolean DEFAULT false,
  visited boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, region)
);

ALTER TABLE user_region_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own region status" ON user_region_status
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER user_region_status_updated_at
  BEFORE UPDATE ON user_region_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
