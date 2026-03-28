-- Add onboarding flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded boolean DEFAULT false;
