-- Team gear templates: reusable group gear lists saved by leaders
CREATE TABLE IF NOT EXISTS team_gear_templates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES profiles ON DELETE CASCADE NOT NULL,
  name       text        NOT NULL,
  items      jsonb       NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_gear_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own gear templates" ON team_gear_templates;
CREATE POLICY "Users manage own gear templates"
  ON team_gear_templates FOR ALL
  USING (auth.uid() = user_id);
