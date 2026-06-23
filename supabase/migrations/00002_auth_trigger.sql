-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Auth trigger – populate profiles on new user sign-up
--
-- Run this in Supabase Dashboard → SQL Editor
-- (or via `supabase db push` with the CLI)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the profiles table (public extension of auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 4. Function: runs SECURITY DEFINER so it can insert into profiles
--    even though RLS is active on the table.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger: fires after every INSERT on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
