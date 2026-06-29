-- Remove 'review' status from existing tasks
UPDATE public.tasks SET status = 'in_progress' WHERE status = 'review';

-- In PostgreSQL, you cannot drop a value from an ENUM directly.
-- The workaround is to create a new type, alter the column, and drop the old type.

-- 1. Rename existing type
ALTER TYPE public.task_status RENAME TO task_status_old;

-- 2. Create new type without 'review'
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');

-- 3. Alter the column to use the new type
ALTER TABLE public.tasks 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.task_status USING status::text::public.task_status,
  ALTER COLUMN status SET DEFAULT 'todo'::public.task_status;

-- 4. Drop the old type
DROP TYPE public.task_status_old;
