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

// ── Streak (maps to `streaks` table) ─────────────────────────────────────────
export interface Streak {
  id: string
  user_id: string
  current_streak: number
  max_streak: number
  last_activity_date: string | null
  created_at: string
  updated_at: string
}

// ── Achievement (maps to `achievements` catalogue) ───────────────────────────
export interface Achievement {
  id: string
  key: string
  name: string
  description: string
  icon: string
  xp_reward: number
  created_at: string
}

// ── UserAchievement (maps to `user_achievements`) ────────────────────────────
export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  achievement?: Achievement
}

// ── DailyReward (maps to `daily_rewards`) ────────────────────────────────────
export interface DailyReward {
  id: string
  user_id: string
  last_claimed_at: string | null
  next_available_at: string
  total_claimed: number
  created_at: string
}

// ── Store & Monetization ─────────────────────────────────────────────────────
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type StoreItemType = 'pet' | 'accessory' | 'theme'

export interface StoreItem {
  id: string
  name: string
  type: StoreItemType
  description: string | null
  price_usd: number
  rarity: ItemRarity
  preview_url: string
  is_active: boolean
  created_at: string
}

export interface Purchase {
  id: string
  user_id: string
  item_id: string
  amount_paid: number
  status: string
  stripe_session_id: string | null
  created_at: string
}

export interface UserPetCollection {
  id: string
  user_id: string
  item_id: string
  pet_type: string
  source: string
  acquired_at: string
  
  // Joined relation:
  store_item?: StoreItem
}

