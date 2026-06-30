-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 00012_secure_pet_system
-- Description: Secures pet updates, adds play interaction, and auto level up
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Secure interact_with_pet RPC ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.interact_with_pet(p_action TEXT)
RETURNS TABLE(new_hunger INTEGER, new_happiness INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pet_id UUID;
  v_hunger INTEGER;
  v_happiness INTEGER;
BEGIN
  -- Get active pet for user
  SELECT id, hunger, happiness INTO v_pet_id, v_hunger, v_happiness 
  FROM public.pets 
  WHERE user_id = auth.uid() AND active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active pet found for user';
  END IF;

  IF p_action = 'feed' THEN
    UPDATE public.pets
    SET hunger = LEAST(100, hunger + 40),
        last_updated = NOW()
    WHERE id = v_pet_id
    RETURNING hunger, happiness INTO v_hunger, v_happiness;
  ELSIF p_action = 'play' THEN
    UPDATE public.pets
    SET happiness = LEAST(100, happiness + 25),
        last_updated = NOW()
    WHERE id = v_pet_id
    RETURNING hunger, happiness INTO v_hunger, v_happiness;
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  RETURN QUERY SELECT v_hunger, v_happiness;
END;
$$;

-- ── 2. Pet Level Up Trigger ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_pet_level_up()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- We only loop level-ups if xp has increased enough
  IF NEW.xp IS DISTINCT FROM OLD.xp THEN
    WHILE NEW.xp >= NEW.level * 100 LOOP
      NEW.xp := NEW.xp - (NEW.level * 100);
      NEW.level := NEW.level + 1;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pet_level_up ON public.pets;
CREATE TRIGGER trg_pet_level_up
BEFORE UPDATE ON public.pets
FOR EACH ROW
EXECUTE FUNCTION public.trigger_pet_level_up();

-- ── 3. Restrict UPDATE policy on pets ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage their own pets" ON public.pets;

CREATE POLICY "Users can view their own pets"
  ON public.pets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pets"
  ON public.pets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pets"
  ON public.pets FOR DELETE
  USING (auth.uid() = user_id);

-- Note: No UPDATE policy. All updates must now go through SECURITY DEFINER functions.

-- ── 4. Passive happiness boost on task complete ──────────────────────────────
CREATE OR REPLACE FUNCTION public.task_completed_pet_boost(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pets
  SET happiness = LEAST(100, happiness + 2),
      last_updated = NOW()
  WHERE user_id = p_user_id AND active = TRUE;
END;
$$;

-- ── 5. Secure Task XP Award ──────────────────────────────────────────────────
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS xp_awarded BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.award_task_xp(p_task_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_priority TEXT;
  v_due_date TIMESTAMPTZ;
  v_xp_awarded BOOLEAN;
  v_xp_reward INTEGER;
BEGIN
  -- Get task details
  SELECT user_id, priority::text, due_date, xp_awarded 
  INTO v_user_id, v_priority, v_due_date, v_xp_awarded
  FROM public.tasks 
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_xp_awarded THEN
    RETURN 0; -- already awarded
  END IF;

  -- Calculate XP
  v_xp_reward := 15;
  IF v_priority IN ('high', 'urgent') THEN
    v_xp_reward := 50;
  ELSIF v_priority = 'medium' THEN
    v_xp_reward := 30;
  END IF;

  IF v_due_date IS NOT NULL AND v_due_date >= NOW() THEN
    v_xp_reward := FLOOR(v_xp_reward * 1.3);
  END IF;

  -- Mark as awarded
  UPDATE public.tasks SET xp_awarded = TRUE WHERE id = p_task_id;

  -- Update pet XP (this will trigger level up automatically thanks to the trigger)
  UPDATE public.pets
  SET xp = xp + v_xp_reward, last_updated = NOW()
  WHERE user_id = v_user_id AND active = TRUE;

  -- Update streaks and achievements
  PERFORM public.update_streak(v_user_id);
  PERFORM public.check_achievements(v_user_id);
  
  -- Apply passive happiness boost
  PERFORM public.task_completed_pet_boost(v_user_id);

  RETURN v_xp_reward;
END;
$$;

