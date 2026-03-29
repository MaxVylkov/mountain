-- Forum: posts, replies, likes, attachments

CREATE TABLE forum_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  category    text NOT NULL CHECK (category IN ('routes', 'gear', 'learning')),
  type        text NOT NULL CHECK (type IN ('thread', 'report')),
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE forum_replies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid REFERENCES forum_posts ON DELETE CASCADE NOT NULL,
  parent_reply_id uuid REFERENCES forum_replies ON DELETE CASCADE,
  author_id       uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  body            text NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE forum_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  post_id    uuid REFERENCES forum_posts ON DELETE CASCADE,
  reply_id   uuid REFERENCES forum_replies ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- Partial unique indexes for nullable FK columns
CREATE UNIQUE INDEX forum_likes_user_post ON forum_likes (user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX forum_likes_user_reply ON forum_likes (user_id, reply_id) WHERE reply_id IS NOT NULL;

CREATE TABLE forum_attachments (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id  uuid REFERENCES forum_posts ON DELETE CASCADE NOT NULL,
  type     text NOT NULL CHECK (type IN ('route', 'packing_set', 'gear_item')),
  ref_id   uuid NOT NULL,
  position smallint NOT NULL DEFAULT 0,
  UNIQUE (post_id, type, ref_id)
);

-- SECURITY DEFINER function for copying packing sets across users
CREATE OR REPLACE FUNCTION copy_packing_set_for_user(source_set_id uuid, target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_set_id   uuid;
  source_name  text;
  old_bp_id    uuid;
  new_bp_id    uuid;
BEGIN
  SELECT name INTO source_name FROM packing_sets WHERE id = source_set_id;

  INSERT INTO packing_sets (user_id, name)
    VALUES (target_user_id, source_name || ' (копия)')
    RETURNING id INTO new_set_id;

  CREATE TEMP TABLE _bp_map (old_id uuid, new_id uuid) ON COMMIT DROP;

  FOR old_bp_id IN
    SELECT id FROM packing_backpacks WHERE packing_set_id = source_set_id
  LOOP
    INSERT INTO packing_backpacks (packing_set_id, name, volume_liters)
      SELECT new_set_id, name, volume_liters
      FROM packing_backpacks WHERE id = old_bp_id
      RETURNING id INTO new_bp_id;
    INSERT INTO _bp_map VALUES (old_bp_id, new_bp_id);
  END LOOP;

  INSERT INTO packing_items (packing_set_id, gear_id, packed, backpack_id)
    SELECT new_set_id, gear_id, false,
           (SELECT new_id FROM _bp_map WHERE old_id = pi.backpack_id)
    FROM packing_items pi
    WHERE packing_set_id = source_set_id;

  RETURN new_set_id;
END;
$$;

-- RLS policies
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_posts_select" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "forum_posts_insert" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_posts_update" ON forum_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "forum_posts_delete" ON forum_posts FOR DELETE USING (auth.uid() = author_id);

ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_replies_select" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "forum_replies_insert" ON forum_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_replies_update" ON forum_replies FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "forum_replies_delete" ON forum_replies FOR DELETE USING (auth.uid() = author_id);

ALTER TABLE forum_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_likes_select" ON forum_likes FOR SELECT USING (true);
CREATE POLICY "forum_likes_insert" ON forum_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_likes_delete" ON forum_likes FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE forum_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_attachments_select" ON forum_attachments FOR SELECT USING (true);
CREATE POLICY "forum_attachments_insert" ON forum_attachments FOR INSERT WITH CHECK (
  auth.uid() = (SELECT author_id FROM forum_posts WHERE id = post_id)
);
CREATE POLICY "forum_attachments_delete" ON forum_attachments FOR DELETE USING (
  auth.uid() = (SELECT author_id FROM forum_posts WHERE id = post_id)
);

-- Indexes
CREATE INDEX forum_posts_category_created ON forum_posts (category, created_at DESC);
CREATE INDEX forum_attachments_type_ref ON forum_attachments (type, ref_id);
CREATE INDEX forum_posts_author ON forum_posts (author_id);
CREATE INDEX forum_replies_post ON forum_replies (post_id);
