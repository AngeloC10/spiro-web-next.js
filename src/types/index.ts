// ─────────────────────────────────────────────────────────────────────────────
// SPIRO – Base TypeScript types
// These mirror the Supabase DB schema defined in supabase/migrations/
// ─────────────────────────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type PetType = 'penguin' | 'cat' | 'dragon'

// ── User Profile (maps to `users` table) ────────────────────────────────────
export interface UserProfile {
  id: string             // UUID – matches auth.users(id)
  username: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ── Kanban Column (maps to `columns` table) ──────────────────────────────────
export interface Column {
  id: string
  user_id: string
  title: string
  position: number
  created_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'

export interface TaskItem {
  id: string
  task_id: string
  text: string
  completed: boolean
  created_at: string
}

// ── Task (maps to `tasks` table) ─────────────────────────────────────────────
export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  category?: string
  due_date?: string
  is_favorite: boolean
  points: number
  position: number
  created_at: string
  updated_at: string
  task_items?: TaskItem[]
}

// ── Pet Stats (legacy – maps to `pet_stats` table) ───────────────────────────
export interface PetStats {
  id: string
  user_id: string
  name: string
  level: number
  experience: number
  happiness: number
  created_at: string
  updated_at: string
}

// ── Pet (maps to `pets` table – created during onboarding) ───────────────────
export interface Pet {
  id: string
  user_id: string
  name: string
  type: PetType
  level: number
  xp: number
  hunger: number
  happiness: number
  last_updated: string
  active: boolean
  created_at?: string
}

// ── Activity History (maps to `activity_history` table) ──────────────────────
export interface ActivityHistory {
  id: string
  user_id: string
  action: string
  points_awarded: number
  created_at: string
}

// ── Supabase helper – generic DB response wrapper ────────────────────────────
export type DbResult<T> = { data: T; error: null } | { data: null; error: Error }
