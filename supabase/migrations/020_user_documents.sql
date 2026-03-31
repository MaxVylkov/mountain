-- Bucket for private user documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-documents', 'user-documents', false, 10485760, NULL);

-- Storage RLS: users can only access files in their own folder (path starts with their user_id)
CREATE POLICY "Users upload own documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-documents'
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "Users read own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "Users delete own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND name LIKE (auth.uid()::text || '/%')
  );

-- Table: metadata for uploaded documents
-- Note: profiles.id = auth.uid() — confirmed by existing profile queries
CREATE TABLE user_documents (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name    text NOT NULL,
  category     text NOT NULL CHECK (category IN ('grade_book', 'medical', 'other')),
  storage_path text NOT NULL UNIQUE,
  file_size    bigint NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents"
  ON user_documents FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
