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
