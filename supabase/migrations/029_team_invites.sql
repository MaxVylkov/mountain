-- Team invitations with pending/accepted/declined status
CREATE TABLE IF NOT EXISTS team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams ON DELETE CASCADE NOT NULL,
  inviter_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  invitee_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(team_id, invitee_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_invites_invitee ON team_invites(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id);

-- RLS
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Invitee can see their own invites
CREATE POLICY "Users can view their own invites"
  ON team_invites FOR SELECT
  USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

-- Team leader (inviter) can create invites
CREATE POLICY "Team leaders can create invites"
  ON team_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- Invitee can update (accept/decline) their own invites
CREATE POLICY "Invitees can update their invites"
  ON team_invites FOR UPDATE
  USING (auth.uid() = invitee_id);

-- Inviter or invitee can delete
CREATE POLICY "Users can delete their invites"
  ON team_invites FOR DELETE
  USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);
