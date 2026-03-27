-- Add favorite and notes to kg_progress
ALTER TABLE kg_progress ADD COLUMN IF NOT EXISTS favorite boolean DEFAULT false;
ALTER TABLE kg_progress ADD COLUMN IF NOT EXISTS notes text;

-- User custom knowledge nodes
CREATE TABLE IF NOT EXISTS user_kg_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  node_id uuid REFERENCES kg_nodes ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER user_kg_notes_updated_at
  BEFORE UPDATE ON user_kg_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_kg_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own kg notes" ON user_kg_notes FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_user_kg_notes_user ON user_kg_notes(user_id);
