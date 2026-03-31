-- Public bucket for forum file attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-attachments',
  'forum-attachments',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
);

-- Storage RLS: users upload/delete only their own folder (prefixed with user_id)
CREATE POLICY "Users upload forum files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'forum-attachments'
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "Users delete forum files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'forum-attachments'
    AND name LIKE (auth.uid()::text || '/%')
  );

-- Table: file attachment metadata
-- user_id is denormalized from forum_posts for fast RLS (avoids subquery per row)
CREATE TABLE forum_file_attachments (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id      uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name    text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  file_size    bigint NOT NULL,
  mime_type    text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX forum_file_attachments_post_id_idx ON forum_file_attachments(post_id);

ALTER TABLE forum_file_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads forum file attachments"
  ON forum_file_attachments FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Authors insert forum file attachments"
  ON forum_file_attachments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authors delete forum file attachments"
  ON forum_file_attachments FOR DELETE TO authenticated
  USING (user_id = auth.uid());
