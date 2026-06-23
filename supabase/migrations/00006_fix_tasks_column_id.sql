-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix tasks table – ensure column_id is fully optional
-- Resolves the 409 conflict when inserting tasks without column_id
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Make column_id nullable (drop NOT NULL constraint if it still exists)
--    This is idempotent – safe to run multiple times
ALTER TABLE public.tasks
  ALTER COLUMN column_id DROP NOT NULL;

-- 2. Ensure position has a default so inserts never fail on it
ALTER TABLE public.tasks
  ALTER COLUMN column_id SET DEFAULT NULL;

-- 3. Make sure the tasks RLS policy covers INSERT (not just SELECT/UPDATE/DELETE)
--    Drop and recreate to be safe
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;

CREATE POLICY "Users can manage their own tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
