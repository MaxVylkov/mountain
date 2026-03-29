-- Team required gear (set by leader)
CREATE TABLE team_required_gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  section text CHECK (section IN ('personal', 'group', 'personal_items', 'clothing')) DEFAULT 'personal',
  sort_order integer DEFAULT 0,
  norm_per_person integer,
  norm_per_team integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Member's actual gear quantities
CREATE TABLE team_member_gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams ON DELETE CASCADE NOT NULL,
  required_gear_id uuid REFERENCES team_required_gear ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  UNIQUE(required_gear_id, user_id)
);

-- RLS
ALTER TABLE team_required_gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view required gear" ON team_required_gear FOR SELECT TO authenticated
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "Leaders can insert required gear" ON team_required_gear FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid()));
CREATE POLICY "Leaders can update required gear" ON team_required_gear FOR UPDATE TO authenticated
  USING (team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid()));
CREATE POLICY "Leaders can delete required gear" ON team_required_gear FOR DELETE TO authenticated
  USING (team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid()));

ALTER TABLE team_member_gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view all member gear" ON team_member_gear FOR SELECT TO authenticated
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert own gear" ON team_member_gear FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can update own gear" ON team_member_gear FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Members can delete own gear" ON team_member_gear FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_team_required_gear_team ON team_required_gear(team_id, section, sort_order);
CREATE INDEX idx_team_member_gear_required ON team_member_gear(required_gear_id);
CREATE INDEX idx_team_member_gear_user ON team_member_gear(user_id);
CREATE INDEX idx_team_member_gear_team ON team_member_gear(team_id);
