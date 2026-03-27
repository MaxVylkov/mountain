-- ============================================
-- Mountaine MVP — Initial Schema
-- ============================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Profiles
-- ============================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Mountains
-- ============================================
CREATE TABLE mountains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  region text,
  height integer NOT NULL,
  latitude decimal,
  longitude decimal,
  description text,
  image_url text,
  difficulty integer CHECK (difficulty BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER mountains_updated_at
  BEFORE UPDATE ON mountains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Routes
-- ============================================
CREATE TABLE routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mountain_id uuid REFERENCES mountains ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  difficulty integer CHECK (difficulty BETWEEN 1 AND 5),
  duration_days integer,
  description text,
  season text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Gear (catalog)
-- ============================================
CREATE TABLE gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text CHECK (category IN ('ropes', 'hardware', 'clothing', 'footwear', 'bivouac', 'electronics', 'other')) NOT NULL,
  description text,
  image_url text,
  weight integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER gear_updated_at
  BEFORE UPDATE ON gear
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- User Gear (inventory)
-- ============================================
CREATE TABLE user_gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  gear_id uuid REFERENCES gear ON DELETE CASCADE NOT NULL,
  condition text CHECK (condition IN ('new', 'good', 'worn', 'needs_repair')) DEFAULT 'good',
  notes text,
  photo_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER user_gear_updated_at
  BEFORE UPDATE ON user_gear
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Route Gear (required gear per route)
-- ============================================
CREATE TABLE route_gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes ON DELETE CASCADE NOT NULL,
  gear_id uuid REFERENCES gear ON DELETE CASCADE NOT NULL,
  required boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- Packing Sets
-- ============================================
CREATE TABLE packing_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  route_id uuid REFERENCES routes ON DELETE SET NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER packing_sets_updated_at
  BEFORE UPDATE ON packing_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Packing Backpacks
-- ============================================
CREATE TABLE packing_backpacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_set_id uuid REFERENCES packing_sets ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  volume_liters integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- Packing Items
-- ============================================
CREATE TABLE packing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_set_id uuid REFERENCES packing_sets ON DELETE CASCADE NOT NULL,
  gear_id uuid REFERENCES gear ON DELETE CASCADE NOT NULL,
  backpack_id uuid REFERENCES packing_backpacks ON DELETE SET NULL,
  packed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- Knowledge Graph Nodes
-- ============================================
CREATE TABLE kg_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  category text,
  level integer DEFAULT 0,
  parent_id uuid REFERENCES kg_nodes ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER kg_nodes_updated_at
  BEFORE UPDATE ON kg_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Knowledge Graph Edges
-- ============================================
CREATE TABLE kg_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id uuid REFERENCES kg_nodes ON DELETE CASCADE NOT NULL,
  target_node_id uuid REFERENCES kg_nodes ON DELETE CASCADE NOT NULL,
  relationship_type text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- KG Progress
-- ============================================
CREATE TABLE kg_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  node_id uuid REFERENCES kg_nodes ON DELETE CASCADE NOT NULL,
  studied boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, node_id)
);

-- ============================================
-- Knots
-- ============================================
CREATE TABLE knots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  difficulty_level integer NOT NULL,
  category text,
  description text,
  steps_json jsonb,
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER knots_updated_at
  BEFORE UPDATE ON knots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Knot Progress
-- ============================================
CREATE TABLE knot_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  knot_id uuid REFERENCES knots ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('locked', 'available', 'learning', 'mastered')) DEFAULT 'locked',
  score integer DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, knot_id)
);

CREATE TRIGGER knot_progress_updated_at
  BEFORE UPDATE ON knot_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Training Exercises
-- ============================================
CREATE TABLE training_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text CHECK (category IN ('cardio', 'strength', 'endurance', 'specific')) NOT NULL,
  description text,
  purpose text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER training_exercises_updated_at
  BEFORE UPDATE ON training_exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Training Log
-- ============================================
CREATE TABLE training_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES training_exercises ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now() NOT NULL,
  duration_min integer,
  sets integer,
  reps integer,
  distance_km decimal,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE mountains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mountains are public" ON mountains FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Routes are public" ON routes FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gear catalog is public" ON gear FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE route_gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Route gear is public" ON route_gear FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE kg_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KG nodes are public" ON kg_nodes FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE kg_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KG edges are public" ON kg_edges FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE knots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Knots are public" ON knots FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE training_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercises are public" ON training_exercises FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE user_gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gear" ON user_gear FOR ALL USING (auth.uid() = user_id);

ALTER TABLE packing_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own packing sets" ON packing_sets FOR ALL USING (auth.uid() = user_id);

ALTER TABLE packing_backpacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own backpacks" ON packing_backpacks FOR ALL
  USING (packing_set_id IN (SELECT id FROM packing_sets WHERE user_id = auth.uid()));

ALTER TABLE packing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own packing items" ON packing_items FOR ALL
  USING (packing_set_id IN (SELECT id FROM packing_sets WHERE user_id = auth.uid()));

ALTER TABLE kg_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own KG progress" ON kg_progress FOR ALL USING (auth.uid() = user_id);

ALTER TABLE knot_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own knot progress" ON knot_progress FOR ALL USING (auth.uid() = user_id);

ALTER TABLE training_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own training log" ON training_log FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_routes_mountain ON routes(mountain_id);
CREATE INDEX idx_user_gear_user ON user_gear(user_id);
CREATE INDEX idx_route_gear_route ON route_gear(route_id);
CREATE INDEX idx_packing_sets_user ON packing_sets(user_id);
CREATE INDEX idx_packing_items_set ON packing_items(packing_set_id);
CREATE INDEX idx_packing_backpacks_set ON packing_backpacks(packing_set_id);
CREATE INDEX idx_kg_nodes_parent ON kg_nodes(parent_id);
CREATE INDEX idx_kg_edges_source ON kg_edges(source_node_id);
CREATE INDEX idx_kg_edges_target ON kg_edges(target_node_id);
CREATE INDEX idx_kg_progress_user ON kg_progress(user_id);
CREATE INDEX idx_knot_progress_user ON knot_progress(user_id);
CREATE INDEX idx_training_log_user ON training_log(user_id);
CREATE INDEX idx_mountains_difficulty ON mountains(difficulty);
CREATE INDEX idx_mountains_region ON mountains(region);
