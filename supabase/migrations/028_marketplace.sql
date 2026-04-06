-- supabase/migrations/028_marketplace.sql

CREATE TABLE marketplace_listings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  gear_id          uuid references user_gear(id) on delete set null,

  title            text not null,
  description      text,
  category         text not null,
  condition        text not null,
  transaction_type text not null CHECK (transaction_type in ('sell', 'swap', 'free')),
  price            integer,

  city             text not null default '',
  contact_telegram text,
  contact_phone    text,
  show_contact     boolean not null default false,

  images           text[] not null default '{}',
  status           text not null default 'active'
                     CHECK (status in ('active', 'sold', 'archived')),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-update updated_at (function already exists in migration 002)
CREATE TRIGGER marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_marketplace_listings_user ON marketplace_listings(user_id);
CREATE INDEX idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_created ON marketplace_listings(created_at DESC);

-- RLS
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can read active listings
CREATE POLICY "Public read active listings"
  ON marketplace_listings FOR SELECT
  USING (status = 'active');

-- Owner can read all their own listings (including sold/archived)
CREATE POLICY "Owner reads own listings"
  ON marketplace_listings FOR SELECT
  USING (auth.uid() = user_id);

-- Owner can insert
CREATE POLICY "Owner inserts listings"
  ON marketplace_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owner can update
CREATE POLICY "Owner updates listings"
  ON marketplace_listings FOR UPDATE
  USING (auth.uid() = user_id);

-- Owner can delete
CREATE POLICY "Owner deletes listings"
  ON marketplace_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for marketplace photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace', 'marketplace', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Public read marketplace images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace');

CREATE POLICY "Authenticated upload marketplace images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marketplace' and auth.role() = 'authenticated');

CREATE POLICY "Owner delete marketplace images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'marketplace' and auth.uid()::text = (storage.foldername(name))[1]);
