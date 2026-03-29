-- Teams (Отделения)
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  route_id uuid REFERENCES routes ON DELETE SET NULL,
  mountain_id uuid REFERENCES mountains ON DELETE SET NULL,
  start_date date,
  end_date date,
  leader_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  invite_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Team members
CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('leader', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Team gear assignments
CREATE TABLE team_gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams ON DELETE CASCADE NOT NULL,
  gear_name text NOT NULL,
  category text CHECK (category IN ('ropes', 'hardware', 'clothing', 'footwear', 'bivouac', 'electronics', 'group', 'other')) DEFAULT 'other',
  weight integer,
  quantity integer DEFAULT 1,
  assigned_to uuid REFERENCES profiles ON DELETE SET NULL,
  is_group_gear boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Team readiness checklist
CREATE TABLE team_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  item text NOT NULL,
  checked boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(team_id, user_id, item)
);

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read teams" ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create teams" ON teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Leaders can update their teams" ON teams FOR UPDATE TO authenticated USING (auth.uid() = leader_id);
CREATE POLICY "Leaders can delete their teams" ON teams FOR DELETE TO authenticated USING (auth.uid() = leader_id);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members visible to authenticated" ON team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join teams" ON team_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave teams" ON team_members FOR DELETE TO authenticated USING (auth.uid() = user_id OR team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid()));
CREATE POLICY "Leaders can update members" ON team_members FOR UPDATE TO authenticated USING (team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid()));

ALTER TABLE team_gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team gear visible to members" ON team_gear FOR SELECT TO authenticated USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can manage team gear" ON team_gear FOR INSERT TO authenticated WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update team gear" ON team_gear FOR UPDATE TO authenticated USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete team gear" ON team_gear FOR DELETE TO authenticated USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

ALTER TABLE team_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Readiness visible to team members" ON team_readiness FOR SELECT TO authenticated USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own readiness" ON team_readiness FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own readiness" ON team_readiness FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Leaders can manage all readiness" ON team_readiness FOR DELETE TO authenticated USING (team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid()));

-- Indexes
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_gear_team ON team_gear(team_id);
CREATE INDEX idx_team_readiness_team ON team_readiness(team_id);
CREATE INDEX idx_teams_leader ON teams(leader_id);
CREATE INDEX idx_teams_invite ON teams(invite_token);
