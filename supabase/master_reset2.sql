DROP TABLE IF EXISTS public.task_items, public.tasks, public.columns, public.boards, public.user_pets_collection, public.purchases, public.store_items, public.user_settings, public.user_achievements, public.achievements, public.daily_rewards, public.streaks, public.pets, public.pet_stats, public.activity_history, public.profiles, public.users CASCADE;

DROP TYPE IF EXISTS public.task_priority CASCADE;
DROP TYPE IF EXISTS public.pet_type CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;
DROP TYPE IF EXISTS public.item_rarity CASCADE;
DROP TYPE IF EXISTS public.store_item_type CASCADE;
-- Create custom types
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create tables
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  column_id UUID REFERENCES columns(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority DEFAULT 'medium',
  points INTEGER DEFAULT 10,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE pet_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Spiro',
  level INTEGER DEFAULT 1 NOT NULL,
  experience INTEGER DEFAULT 0 NOT NULL,
  happiness INTEGER DEFAULT 100 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE activity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage their own columns" ON columns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own pet" ON pet_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own history" ON activity_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own history" ON activity_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_columns_user_id ON columns(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_activity_user_id ON activity_history(user_id);
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
  INSERT INTO public.users (id, username)
  VALUES (
    new.id,
    new.email
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
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: tasks schema update
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create task_status enum
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');

-- 2. Update tasks table to add new columns and drop column_id dependency
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_column_id_fkey,
  DROP COLUMN IF EXISTS column_id,
  ADD COLUMN IF NOT EXISTS status task_status DEFAULT 'todo' NOT NULL,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE NOT NULL;

-- 3. Create index for fast status lookups
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Note: we keep the original 'position' column to allow ordering within status lists.
-- The original priority column was 'task_priority', we keep it as is.
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: task_items table
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  text         TEXT NOT NULL,
  completed    BOOLEAN DEFAULT FALSE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast task_items lookups by task_id
CREATE INDEX IF NOT EXISTS idx_task_items_task_id ON public.task_items(task_id);

-- Row Level Security
ALTER TABLE public.task_items ENABLE ROW LEVEL SECURITY;

-- Note: We join with tasks to check if the user owns the task
CREATE POLICY "Users can manage task items of their own tasks"
  ON public.task_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_items.task_id 
      AND tasks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_items.task_id 
      AND tasks.user_id = auth.uid()
    )
  );
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix tasks table – ensure column_id is fully optional
-- Resolves the 409 conflict when inserting tasks without column_id
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Make column_id nullable (drop NOT NULL constraint if it still exists)
--    This is idempotent – safe to run multiple times
-- (Removed invalid ALTER COLUMN column_id commands because column_id was dropped in 00004)

-- 3. Make sure the tasks RLS policy covers INSERT (not just SELECT/UPDATE/DELETE)
--    Drop and recreate to be safe
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;

CREATE POLICY "Users can manage their own tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: pg_cron job for automatic pet stats decrement
-- Run in Supabase Dashboard → SQL Editor
-- Requires: pg_cron extension enabled (Dashboard → Extensions → pg_cron)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Remove the job if it already exists (idempotent)
SELECT cron.unschedule('decrement-pet-stats')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'decrement-pet-stats');

-- 2. Schedule the hourly decrement job
--    • Runs at the top of every hour (0 * * * *)
--    • Decrements hunger by 2 and happiness by 1 (floored at 0)
--    • Skips "sleep hours" 23:00–07:00 (America/Lima = UTC-5)
--      → In UTC: sleep is 04:00–12:00, so we run when UTC hour NOT IN (4,5,6,7,8,9,10,11)
SELECT cron.schedule(
  'decrement-pet-stats',
  '0 * * * *',
  $$
    UPDATE public.pets
    SET
      hunger      = GREATEST(0, hunger    - 2),
      happiness   = GREATEST(0, happiness - 1),
      last_updated = NOW()
    WHERE
      active = TRUE
      -- Pause during sleep hours: 23:00–07:00 America/Lima (UTC-5)
      AND EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/Lima') NOT BETWEEN 23 AND 23
      -- More precisely: run only between 07:00 and 22:59 Lima time
      AND (
        EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/Lima') >= 7
        AND EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/Lima') < 23
      );
  $$
);

-- 3. Verify the job was registered
-- SELECT * FROM cron.job WHERE jobname = 'decrement-pet-stats';


-- ─────────────────────────────────────────────────────────────────────────────
-- OPTIONAL: Level-up function (called from app, but documented here)
-- When xp >= level * 100 → level up
-- This is handled client-side in pet/page.tsx via Supabase update
-- ─────────────────────────────────────────────────────────────────────────────

-- 4. Helper RPC function for atomic feed operation (avoids race conditions)
CREATE OR REPLACE FUNCTION public.feed_pet(p_pet_id UUID, p_hunger_gain INTEGER)
RETURNS TABLE(new_hunger INTEGER, new_happiness INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.pets
  SET
    hunger      = LEAST(100, hunger + p_hunger_gain),
    happiness   = LEAST(100, happiness + 5),  -- small happiness boost from feeding
    last_updated = NOW()
  WHERE id = p_pet_id AND user_id = auth.uid();

  RETURN QUERY
    SELECT p.hunger, p.happiness
    FROM public.pets p
    WHERE p.id = p_pet_id;
END;
$$;
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Streaks, Achievements, Daily Rewards tables
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Streaks table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.streaks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak    INTEGER DEFAULT 0 NOT NULL,
  max_streak        INTEGER DEFAULT 0 NOT NULL,
  last_activity_date DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON public.streaks(user_id);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own streaks"
  ON public.streaks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 2. Achievements table (global catalogue) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,
  xp_reward   INTEGER DEFAULT 0 NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Public read access for the achievement catalogue
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read achievements"
  ON public.achievements FOR SELECT
  USING (true);

-- ── 3. User achievements (unlocked achievements per user) ────────────────────
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "System can insert user achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Daily rewards table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_rewards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  last_claimed_at  TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  total_claimed    INTEGER DEFAULT 0 NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their daily rewards"
  ON public.daily_rewards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 5. Seed the 8 achievements ────────────────────────────────────────────────
INSERT INTO public.achievements (key, name, description, icon, xp_reward) VALUES
  ('first_task',    'Primera tarea',      'Completaste tu primera tarea',                         '🌱', 20),
  ('streak_3',      'Racha de 3 días',    'Mantuviste una racha de 3 días consecutivos',           '🔥', 50),
  ('streak_7',      'Semana perfecta',    'Completaste tareas 7 días seguidos',                    '🏆', 150),
  ('tasks_10',      'Productivo',         'Completaste 10 tareas en total',                        '⚡', 75),
  ('tasks_50',      'Imparable',          'Completaste 50 tareas en total',                        '💪', 200),
  ('high_priority', 'Héroe a presión',    'Completaste una tarea de prioridad urgente',            '🚨', 40),
  ('fed_pet',       'Buen cuidador',      'Alimentaste a tu mascota por primera vez',              '🍗', 30),
  ('daily_reward',  'Caza recompensas',   'Reclamaste tu primer cofre de recompensa diaria',       '📦', 25)
ON CONFLICT (key) DO NOTHING;
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Gamification SQL Functions
-- Run AFTER 00008_gamification_tables.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. update_streak ──────────────────────────────────────────────────────────
-- Called from client after completing a task.
-- Returns: { current_streak, max_streak, streak_broken }
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, max_streak INTEGER, streak_broken BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row           public.streaks%ROWTYPE;
  v_today         DATE := CURRENT_DATE;
  v_streak_broken BOOLEAN := FALSE;
  v_new_streak    INTEGER;
  v_new_max       INTEGER;
BEGIN
  -- Get or create the streak row
  SELECT * INTO v_row FROM public.streaks WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.streaks (user_id, current_streak, max_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, v_today)
    RETURNING * INTO v_row;
    RETURN QUERY SELECT v_row.current_streak, v_row.max_streak, FALSE;
    RETURN;
  END IF;

  -- Already updated today → no change
  IF v_row.last_activity_date = v_today THEN
    RETURN QUERY SELECT v_row.current_streak, v_row.max_streak, FALSE;
    RETURN;
  END IF;

  -- Yesterday → continue streak
  IF v_row.last_activity_date = v_today - INTERVAL '1 day' THEN
    v_new_streak := v_row.current_streak + 1;
    v_streak_broken := FALSE;
  ELSE
    -- Streak broken: apply penalty to pet
    v_new_streak := 1;
    v_streak_broken := TRUE;

    UPDATE public.pets
    SET
      hunger    = GREATEST(0, hunger    - 20),
      happiness = GREATEST(0, happiness - 15),
      last_updated = NOW()
    WHERE user_id = p_user_id AND active = TRUE;
  END IF;

  v_new_max := GREATEST(v_row.max_streak, v_new_streak);

  UPDATE public.streaks
  SET
    current_streak    = v_new_streak,
    max_streak        = v_new_max,
    last_activity_date = v_today,
    updated_at        = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_new_streak, v_new_max, v_streak_broken;
END;
$$;

-- ── 2. check_achievements ─────────────────────────────────────────────────────
-- Idempotent: evaluates all 8 achievement conditions and inserts unlocked ones.
-- Returns the keys of newly unlocked achievements.
CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id UUID)
RETURNS SETOF TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tasks_done    INTEGER;
  v_streak        INTEGER;
  v_has_urgent    BOOLEAN;
  v_ach_id        UUID;
  v_newly_unlocked TEXT[] := '{}';
  v_key           TEXT;
BEGIN
  -- Count completed tasks
  SELECT COUNT(*) INTO v_tasks_done
  FROM public.tasks
  WHERE user_id = p_user_id AND status = 'done';

  -- Current streak
  SELECT current_streak INTO v_streak
  FROM public.streaks WHERE user_id = p_user_id;
  v_streak := COALESCE(v_streak, 0);

  -- Has completed urgent/high task
  SELECT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE user_id = p_user_id AND status = 'done'
      AND priority IN ('urgent', 'high')
  ) INTO v_has_urgent;

  -- Evaluate each achievement
  FOR v_key, v_ach_id IN
    SELECT a.key, a.id FROM public.achievements a
    WHERE a.key IN (
      'first_task', 'streak_3', 'streak_7',
      'tasks_10', 'tasks_50', 'high_priority',
      'fed_pet', 'daily_reward'
    )
  LOOP
    DECLARE
      v_qualifies BOOLEAN := FALSE;
    BEGIN
      v_qualifies := CASE v_key
        WHEN 'first_task'    THEN v_tasks_done >= 1
        WHEN 'streak_3'      THEN v_streak >= 3
        WHEN 'streak_7'      THEN v_streak >= 7
        WHEN 'tasks_10'      THEN v_tasks_done >= 10
        WHEN 'tasks_50'      THEN v_tasks_done >= 50
        WHEN 'high_priority' THEN v_has_urgent
        WHEN 'fed_pet'       THEN EXISTS(
                                   SELECT 1 FROM public.daily_rewards
                                   WHERE user_id = p_user_id AND total_claimed > 0
                                 )
        WHEN 'daily_reward'  THEN EXISTS(
                                   SELECT 1 FROM public.daily_rewards
                                   WHERE user_id = p_user_id AND total_claimed > 0
                                 )
        ELSE FALSE
      END;

      IF v_qualifies THEN
        -- Try to insert; skip if already unlocked
        BEGIN
          INSERT INTO public.user_achievements (user_id, achievement_id)
          VALUES (p_user_id, v_ach_id);

          -- Award XP to pet for new achievement
          UPDATE public.pets p
          SET xp = xp + (SELECT xp_reward FROM public.achievements WHERE id = v_ach_id),
              last_updated = NOW()
          WHERE p.user_id = p_user_id AND p.active = TRUE;

          v_newly_unlocked := array_append(v_newly_unlocked, v_key);
        EXCEPTION WHEN unique_violation THEN
          -- Already unlocked, skip
        END;
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT unnest(v_newly_unlocked);
END;
$$;

-- ── 3. claim_daily_reward ─────────────────────────────────────────────────────
-- Returns the reward type and amount. Probabilistic distribution.
CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id UUID)
RETURNS TABLE(reward_type TEXT, reward_amount INTEGER, reward_label TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row      public.daily_rewards%ROWTYPE;
  v_roll     INTEGER;
  v_type     TEXT;
  v_amount   INTEGER;
  v_label    TEXT;
BEGIN
  -- Get or create daily reward row
  SELECT * INTO v_row FROM public.daily_rewards WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.daily_rewards (user_id, last_claimed_at, next_available_at, total_claimed)
    VALUES (p_user_id, NOW(), NOW() + INTERVAL '24 hours', 0)
    RETURNING * INTO v_row;
  END IF;

  -- Not yet available
  IF v_row.next_available_at > NOW() THEN
    RAISE EXCEPTION 'reward_not_available' USING HINT = 'Too early to claim';
  END IF;

  -- Roll the reward (1–100)
  v_roll := floor(random() * 100)::INTEGER + 1;

  v_type   := CASE
    WHEN v_roll <= 50 THEN 'xp'        -- 50% chance: small XP
    WHEN v_roll <= 75 THEN 'xp_big'    -- 25% chance: big XP
    WHEN v_roll <= 88 THEN 'hunger'    -- 13% chance: hunger boost
    WHEN v_roll <= 96 THEN 'happiness' -- 8%  chance: happiness boost
    ELSE 'rare'                         -- 4%  chance: rare item
  END;

  v_amount := CASE v_type
    WHEN 'xp'        THEN 25
    WHEN 'xp_big'    THEN 75
    WHEN 'hunger'    THEN 40
    WHEN 'happiness' THEN 30
    WHEN 'rare'      THEN 200
  END;

  v_label := CASE v_type
    WHEN 'xp'        THEN '+25 XP para tu mascota'
    WHEN 'xp_big'    THEN '+75 XP ¡Bonanza!'
    WHEN 'hunger'    THEN 'Comida especial (+40 hambre)'
    WHEN 'happiness' THEN 'Juguete feliz (+30 felicidad)'
    WHEN 'rare'      THEN '¡Sombrero de pirata! (+200 XP)'
  END;

  -- Apply reward to pet
  UPDATE public.pets
  SET
    xp        = CASE WHEN v_type IN ('xp', 'xp_big', 'rare') THEN xp + v_amount ELSE xp END,
    hunger    = CASE WHEN v_type = 'hunger'    THEN LEAST(100, hunger + v_amount)    ELSE hunger    END,
    happiness = CASE WHEN v_type = 'happiness' THEN LEAST(100, happiness + v_amount) ELSE happiness END,
    last_updated = NOW()
  WHERE user_id = p_user_id AND active = TRUE;

  -- Mark as claimed
  UPDATE public.daily_rewards
  SET
    last_claimed_at   = NOW(),
    next_available_at = NOW() + INTERVAL '24 hours',
    total_claimed     = total_claimed + 1
  WHERE user_id = p_user_id;

  -- Check 'fed_pet' / 'daily_reward' achievement
  PERFORM public.check_achievements(p_user_id);

  RETURN QUERY SELECT v_type, v_amount, v_label;
END;
$$;
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
DROP POLICY IF EXISTS "Public avatar read access" ON storage.objects;
CREATE POLICY "Public avatar read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload/update their own avatars (folder = user_id)
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
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
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Store Catalog and User Collections
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Fix constraint on pets ────────────────────────────────────────────────
-- The old constraint (UNIQUE (user_id, active)) prevented multiple inactive pets.
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS one_active_pet_per_user;
DROP INDEX IF EXISTS idx_one_active_pet;

-- Create partial unique index that only enforces uniqueness for active = true
CREATE UNIQUE INDEX idx_one_active_pet ON public.pets (user_id) WHERE active = true;

-- ── 2. Store Items Table ─────────────────────────────────────────────────────
CREATE TYPE item_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');
CREATE TYPE store_item_type AS ENUM ('pet', 'accessory', 'theme');

CREATE TABLE IF NOT EXISTS public.store_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        store_item_type NOT NULL,
  description TEXT,
  price_usd   NUMERIC(10, 2) NOT NULL,
  rarity      item_rarity DEFAULT 'common' NOT NULL,
  preview_url TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed Data for Store
INSERT INTO public.store_items (name, type, description, price_usd, rarity, preview_url, is_active) 
VALUES 
  ('Lobo ártico', 'pet', 'Un fiel compañero resistente al frío.', 2.99, 'rare', '/pets/wolf.svg', true), 
  ('Axolotl', 'pet', 'Una mascota acuática muy amigable y curiosa.', 1.99, 'common', '/pets/axolotl.svg', true), 
  ('Dragón Rojo', 'pet', 'Una criatura legendaria de gran poder y belleza.', 4.99, 'epic', '/pets/red-dragon.svg', true), 
  ('Sombrero pirata', 'accessory', 'Un clásico sombrero pirata para aventuras.', 0.49, 'common', '/acc/hat.svg', true), 
  ('Capa espacial', 'accessory', 'Una capa que desafía la gravedad misma.', 0.99, 'rare', '/acc/cape.svg', true), 
  ('Gafas de sol', 'accessory', 'Mantén el estilo en los días más soleados.', 0.49, 'common', '/acc/glasses.svg', true)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for store items"
  ON public.store_items FOR SELECT
  USING (true);

-- ── 3. Purchases Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id           UUID REFERENCES public.store_items(id) ON DELETE CASCADE NOT NULL,
  amount_paid       NUMERIC(10, 2) NOT NULL,
  status            TEXT DEFAULT 'completed' NOT NULL,
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

-- ── 4. User Pets Collection ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_pets_collection (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id     UUID REFERENCES public.store_items(id) ON DELETE CASCADE NOT NULL,
  pet_type    TEXT NOT NULL,  -- stores the string name/type identifier
  source      TEXT DEFAULT 'store' NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_pets_collection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their collection"
  ON public.user_pets_collection FOR SELECT
  USING (auth.uid() = user_id);

-- ── 5. Active Pet RPC ────────────────────────────────────────────────────────
-- Safely switches the active pet for a user without violating constraints
CREATE OR REPLACE FUNCTION public.set_active_pet(p_user_id UUID, p_pet_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is the user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Deactivate current active pet
  UPDATE public.pets
  SET active = false
  WHERE user_id = p_user_id AND active = true;

  -- Ensure the requested pet exists in the pets table. If not, create it.
  -- Notice: In a full app, you might only insert if it's in user_pets_collection.
  IF NOT EXISTS (SELECT 1 FROM public.pets WHERE user_id = p_user_id AND type::text = p_pet_type) THEN
    -- Try to cast p_pet_type to pet_type. If it's a new type not in the ENUM, this might fail,
    -- but for our current app setup it works.
    BEGIN
      INSERT INTO public.pets (user_id, name, type, active)
      VALUES (p_user_id, p_pet_type, p_pet_type::pet_type, true);
    EXCEPTION WHEN invalid_text_representation THEN
      -- If the pet_type is not in the ENUM, we can't insert it into `pets` right now.
      -- So we just raise a notice.
      RAISE NOTICE 'Pet type % not valid in enum pet_type.', p_pet_type;
    END;
  ELSE
    -- Activate the requested pet
    UPDATE public.pets
    SET active = true
    WHERE user_id = p_user_id AND type::text = p_pet_type;
  END IF;
END;
$$;
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: boards architecture
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create boards table
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS on boards
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for boards
CREATE POLICY "Users can manage their own boards" ON public.boards FOR ALL USING (auth.uid() = user_id);

-- 4. Create an index for boards user_id
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON public.boards(user_id);

-- 5. Insert a default 'General' board for existing users
-- We use a DO block to execute this procedurally
DO $$
DECLARE
    user_rec RECORD;
    default_board_id UUID;
BEGIN
    FOR user_rec IN SELECT id FROM public.users LOOP
        -- Check if user already has a board to prevent duplicates if script runs twice
        IF NOT EXISTS (SELECT 1 FROM public.boards WHERE user_id = user_rec.id) THEN
            INSERT INTO public.boards (user_id, title, description)
            VALUES (user_rec.id, 'General', 'Tablero principal')
            RETURNING id INTO default_board_id;
        END IF;
    END LOOP;
END $$;

-- 6. Add board_id to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;

-- 7. Update existing tasks to point to the user's first board
DO $$
DECLARE
    task_rec RECORD;
    user_board_id UUID;
BEGIN
    FOR task_rec IN SELECT id, user_id FROM public.tasks WHERE board_id IS NULL LOOP
        -- Find the first board for this user
        SELECT id INTO user_board_id FROM public.boards WHERE user_id = task_rec.user_id ORDER BY created_at ASC LIMIT 1;
        
        -- If no board exists for some reason, create one
        IF user_board_id IS NULL THEN
            INSERT INTO public.boards (user_id, title, description)
            VALUES (task_rec.user_id, 'General', 'Tablero principal')
            RETURNING id INTO user_board_id;
        END IF;

        UPDATE public.tasks SET board_id = user_board_id WHERE id = task_rec.id;
    END LOOP;
END $$;

-- 8. Make board_id NOT NULL now that all tasks have a board
ALTER TABLE public.tasks ALTER COLUMN board_id SET NOT NULL;

-- 9. Create index for tasks board_id
CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON public.tasks(board_id);
