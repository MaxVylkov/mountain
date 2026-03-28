-- Add tags column to user_gear for custom labels
ALTER TABLE user_gear ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
