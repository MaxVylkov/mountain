-- Alpine camps / base camps
CREATE TABLE IF NOT EXISTS alpine_camps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  full_name text,                   -- полное название (АУСБ «Безенги»)
  region text NOT NULL,
  sub_region text,                  -- Кабардино-Балкария, Карачаево-Черкесия и т.д.
  description text,
  rock_lab text,                    -- описание скальной лаборатории
  how_to_get text,                  -- как добраться
  website text,
  phone text,
  email text,
  latitude double precision,
  longitude double precision,
  season text,                      -- текстовое описание сезона
  altitude smallint,                -- высота лагеря в метрах
  facilities text[],                -- инфраструктура
  route_count smallint,             -- количество маршрутов в районе
  difficulty_range text,            -- диапазон сложности (1Б — 6А)
  founded smallint,                 -- год основания
  created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE alpine_camps ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can read camps"
  ON alpine_camps FOR SELECT
  USING (true);
