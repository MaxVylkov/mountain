-- Let team leaders manage readiness marks for any member of their team.
CREATE POLICY "Leaders can insert readiness"
  ON team_readiness FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid()));

CREATE POLICY "Leaders can update readiness"
  ON team_readiness FOR UPDATE TO authenticated
  USING (team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid()))
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE leader_id = auth.uid()));
