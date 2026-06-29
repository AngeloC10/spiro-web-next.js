-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: boards architecture
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create boards table
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
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
