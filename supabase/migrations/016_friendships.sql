-- Personal invite token for each user (for friend invitations)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_token text UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex');

-- Friendships table
CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  addressee_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (requester_id, addressee_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can see friendships they're part of
CREATE POLICY "Users see own friendships" ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can create friend requests
CREATE POLICY "Users can send friend requests" ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Users can accept/reject requests directed to them
CREATE POLICY "Users can update received requests" ON friendships FOR UPDATE
  USING (auth.uid() = addressee_id);

-- Users can remove friendships they're part of
CREATE POLICY "Users can remove friendships" ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
