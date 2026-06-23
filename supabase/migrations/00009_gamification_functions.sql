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
