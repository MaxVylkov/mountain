-- supabase/migrations/028_marketplace.sql

create table marketplace_listings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  gear_id          uuid references user_gear(id) on delete set null,

  title            text not null,
  description      text,
  category         text not null,
  condition        text not null,
  transaction_type text not null check (transaction_type in ('sell', 'swap', 'free')),
  price            integer,

  city             text not null default '',
  contact_telegram text,
  contact_phone    text,
  show_contact     boolean not null default false,

  images           text[] not null default '{}',
  status           text not null default 'active'
                     check (status in ('active', 'sold', 'archived')),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-update updated_at (function already exists in migration 002)
create trigger marketplace_listings_updated_at
  before update on marketplace_listings
  for each row execute function update_updated_at();

-- Indexes
create index idx_marketplace_listings_user on marketplace_listings(user_id);
create index idx_marketplace_listings_status on marketplace_listings(status);
create index idx_marketplace_listings_created on marketplace_listings(created_at desc);

-- RLS
alter table marketplace_listings enable row level security;

-- Anyone can read active listings
create policy "Public read active listings"
  on marketplace_listings for select
  using (status = 'active');

-- Owner can read all their own listings (including sold/archived)
create policy "Owner reads own listings"
  on marketplace_listings for select
  using (auth.uid() = user_id);

-- Owner can insert
create policy "Owner inserts listings"
  on marketplace_listings for insert
  with check (auth.uid() = user_id);

-- Owner can update
create policy "Owner updates listings"
  on marketplace_listings for update
  using (auth.uid() = user_id);

-- Owner can delete
create policy "Owner deletes listings"
  on marketplace_listings for delete
  using (auth.uid() = user_id);

-- Storage bucket for marketplace photos
insert into storage.buckets (id, name, public)
values ('marketplace', 'marketplace', true)
on conflict do nothing;

create policy "Public read marketplace images"
  on storage.objects for select
  using (bucket_id = 'marketplace');

create policy "Authenticated upload marketplace images"
  on storage.objects for insert
  with check (bucket_id = 'marketplace' and auth.role() = 'authenticated');

create policy "Owner delete marketplace images"
  on storage.objects for delete
  using (bucket_id = 'marketplace' and auth.uid()::text = (storage.foldername(name))[1]);
