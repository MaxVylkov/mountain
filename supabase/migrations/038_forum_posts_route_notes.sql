-- Let users save useful forum posts as personal route notes.
ALTER TABLE adopted_descriptions
  ALTER COLUMN comment_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS source_post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_adopted_descriptions_adopted_by_route
  ON adopted_descriptions(adopted_by, route_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_adopted_descriptions_source_post
  ON adopted_descriptions(source_post_id);
