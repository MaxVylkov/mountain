-- Per-user icon override for inventory items
ALTER TABLE user_gear ADD COLUMN IF NOT EXISTS icon_key text;
