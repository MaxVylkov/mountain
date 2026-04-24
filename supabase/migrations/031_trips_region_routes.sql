-- Add region and camp to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS camp_id uuid REFERENCES alpine_camps ON DELETE SET NULL;

-- Update trip status constraint to include in_camp
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE trips ADD CONSTRAINT trips_status_check
  CHECK (status IN ('planning', 'packing', 'in_camp', 'active', 'completed'));

-- Many-to-many: routes within a trip (added on the go, not just at creation)
CREATE TABLE IF NOT EXISTS trip_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips ON DELETE CASCADE NOT NULL,
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(trip_id, route_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_routes_trip ON trip_routes(trip_id);

-- RLS
ALTER TABLE trip_routes ENABLE ROW LEVEL SECURITY;

-- Trip owner can manage trip_routes
CREATE POLICY "Trip owner can view trip routes"
  ON trip_routes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_routes.trip_id AND trips.user_id = auth.uid())
  );

CREATE POLICY "Trip owner can insert trip routes"
  ON trip_routes FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_routes.trip_id AND trips.user_id = auth.uid())
  );

CREATE POLICY "Trip owner can update trip routes"
  ON trip_routes FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_routes.trip_id AND trips.user_id = auth.uid())
  );

CREATE POLICY "Trip owner can delete trip routes"
  ON trip_routes FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_routes.trip_id AND trips.user_id = auth.uid())
  );
