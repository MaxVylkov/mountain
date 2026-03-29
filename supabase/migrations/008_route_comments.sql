-- Route comments with hashtag support
CREATE TABLE route_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER route_comments_updated_at
  BEFORE UPDATE ON route_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Likes/dislikes on comments
CREATE TABLE comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES route_comments ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- Adopted alternative descriptions
CREATE TABLE adopted_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  comment_id uuid REFERENCES route_comments ON DELETE CASCADE NOT NULL,
  adopted_by uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE route_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are public to read" ON route_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can create comments" ON route_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON route_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON route_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are public to read" ON comment_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can manage own likes" ON comment_likes FOR ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE adopted_descriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Adopted descriptions are public" ON adopted_descriptions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can adopt descriptions" ON adopted_descriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = adopted_by);

-- Indexes
CREATE INDEX idx_route_comments_route ON route_comments(route_id);
CREATE INDEX idx_route_comments_user ON route_comments(user_id);
CREATE INDEX idx_route_comments_tags ON route_comments USING GIN(tags);
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_adopted_descriptions_author ON adopted_descriptions(author_id);
