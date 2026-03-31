-- Allow authenticated users to read any profile (display_name, experience_level).
-- The existing "own profile" policy only allowed reading your own row,
-- which caused member names to appear as null in team/friend views.
CREATE POLICY "Authenticated users can view any profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);
