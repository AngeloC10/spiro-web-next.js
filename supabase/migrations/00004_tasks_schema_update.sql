-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: tasks schema update
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create task_status enum
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');

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
