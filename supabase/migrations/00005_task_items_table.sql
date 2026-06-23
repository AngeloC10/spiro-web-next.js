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
