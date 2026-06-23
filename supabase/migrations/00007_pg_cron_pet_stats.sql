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
