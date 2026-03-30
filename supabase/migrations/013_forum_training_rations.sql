-- Add ration_template_id to forum_posts (if not already applied)
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS ration_template_id text;

-- Extend forum_posts.category to include training and rations
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_category_check;
ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_category_check
  CHECK (category IN ('routes', 'gear', 'learning', 'training', 'rations'));

-- User-created workouts
CREATE TABLE IF NOT EXISTS user_workouts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  title       text NOT NULL,
  category    text NOT NULL,
  duration    text NOT NULL DEFAULT '',
  goal        text NOT NULL DEFAULT '',
  description text,
  exercises   jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE user_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_workouts_select" ON user_workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_workouts_insert" ON user_workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_workouts_update" ON user_workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_workouts_delete" ON user_workouts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX user_workouts_user ON user_workouts (user_id, created_at DESC);
