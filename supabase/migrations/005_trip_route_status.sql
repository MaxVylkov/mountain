-- Add status and packing to trip_routes for per-route assault tracking
ALTER TABLE trip_routes ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('planned', 'preparing', 'active', 'summit', 'failed')) DEFAULT 'planned';
ALTER TABLE trip_routes ADD COLUMN IF NOT EXISTS summit_reached boolean DEFAULT false;
ALTER TABLE trip_routes ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE trip_routes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trip route backpack items (what goes in the backpack for this specific route)
CREATE TABLE IF NOT EXISTS trip_route_gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_route_id uuid REFERENCES trip_routes ON DELETE CASCADE NOT NULL,
  gear_id uuid REFERENCES gear ON DELETE CASCADE NOT NULL,
  packed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE trip_route_gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own trip route gear" ON trip_route_gear FOR ALL
  USING (trip_route_id IN (
    SELECT tr.id FROM trip_routes tr
    JOIN trips t ON tr.trip_id = t.id
    WHERE t.user_id = auth.uid()
  ));
CREATE INDEX idx_trip_route_gear_trip_route ON trip_route_gear(trip_route_id);
