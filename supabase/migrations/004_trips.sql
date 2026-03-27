-- Trips table
CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  mountain_id uuid REFERENCES mountains ON DELETE SET NULL,
  status text CHECK (status IN ('planning', 'packing', 'active', 'completed')) DEFAULT 'planning',
  template text CHECK (template IN ('light_trek', 'np', 'sp3', 'sp2')),
  packing_set_id uuid REFERENCES packing_sets ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own trips" ON trips FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_trips_user ON trips(user_id);

-- Trip routes (many-to-many)
CREATE TABLE trip_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips ON DELETE CASCADE NOT NULL,
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(trip_id, route_id)
);

ALTER TABLE trip_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own trip routes" ON trip_routes FOR ALL
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
CREATE INDEX idx_trip_routes_trip ON trip_routes(trip_id);
