-- User route status (ходил, хочу пройти, избранное)
CREATE TABLE user_route_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false,
  want_to_do boolean DEFAULT false,
  favorite boolean DEFAULT false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, route_id)
);

CREATE TRIGGER user_route_status_updated_at
  BEFORE UPDATE ON user_route_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_route_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own route status" ON user_route_status FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_user_route_status_user ON user_route_status(user_id);
CREATE INDEX idx_user_route_status_route ON user_route_status(route_id);
