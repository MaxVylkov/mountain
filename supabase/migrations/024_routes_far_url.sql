-- Add ФАР description URL field to routes
ALTER TABLE routes ADD COLUMN far_url text;

COMMENT ON COLUMN routes.far_url IS 'URL to the official ФАР route description on alpfederation.ru';
