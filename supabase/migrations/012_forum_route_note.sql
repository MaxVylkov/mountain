-- Add route_note column to forum_posts for free-text route references
ALTER TABLE forum_posts ADD COLUMN route_note text;
