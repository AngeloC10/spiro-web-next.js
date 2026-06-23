-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: pets table
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE pet_type AS ENUM ('penguin', 'cat', 'dragon');

CREATE TABLE IF NOT EXISTS public.pets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  type         pet_type NOT NULL,
  level        INTEGER DEFAULT 1  NOT NULL,
  xp           INTEGER DEFAULT 0  NOT NULL,
  hunger       INTEGER DEFAULT 100 NOT NULL,
  happiness    INTEGER DEFAULT 100 NOT NULL,
  active       BOOLEAN DEFAULT TRUE NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- enforce only one active pet per user
  CONSTRAINT one_active_pet_per_user UNIQUE (user_id, active)
    DEFERRABLE INITIALLY DEFERRED
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);

-- Row Level Security
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own pets"
  ON public.pets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
