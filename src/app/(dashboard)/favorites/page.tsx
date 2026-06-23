import { createClient } from '@/lib/supabase/server'
import FavoritesList from '@/components/dashboard/FavoritesList'

export const dynamic = 'force-dynamic'

export default async function FavoritesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch tasks where is_favorite is true
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_favorite', true)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-3">
          <span>Mis Favoritos</span>
          <span className="text-2xl text-amber-400">⭐</span>
        </h1>
        <p className="text-[var(--text-secondary)]">
          Tus tareas más importantes, siempre a la mano.
        </p>
      </div>

      <FavoritesList initialTasks={tasks || []} />
    </div>
  )
}
