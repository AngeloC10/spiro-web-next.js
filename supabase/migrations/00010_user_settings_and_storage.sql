-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: User Settings, Storage Bucket, and Delete User RPC
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. User Settings Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  dark_mode           BOOLEAN DEFAULT true NOT NULL,
  sleep_start         TIME DEFAULT '23:00'::TIME NOT NULL,
  sleep_end           TIME DEFAULT '07:00'::TIME NOT NULL,
  notifications_email BOOLEAN DEFAULT true NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert a trigger to update 'updated_at' on user_settings
CREATE OR REPLACE FUNCTION update_user_settings_modtime()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_settings_modtime ON public.user_settings;
CREATE TRIGGER update_user_settings_modtime
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION update_user_settings_modtime();

-- ── 2. Storage Bucket for Avatars ─────────────────────────────────────────────
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for avatars bucket
-- Anyone can read avatars
CREATE POLICY "Public avatar read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload/update their own avatars (folder = user_id)
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- ── 3. Delete User Account RPC ────────────────────────────────────────────────
-- Needs SECURITY DEFINER to bypass RLS and delete from auth.users
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is deleting their own account
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized to delete this account';
  END IF;

  -- Due to ON DELETE CASCADE on our custom tables (users, tasks, etc)
  -- Deleting the user from auth.users will cascade and remove all their data.
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
