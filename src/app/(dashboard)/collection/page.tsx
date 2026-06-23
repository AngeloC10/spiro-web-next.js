import { createClient } from '@/lib/supabase/server'
import CollectionGrid from '@/components/store/CollectionGrid'

export const dynamic = 'force-dynamic'

export default async function CollectionPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Fetch user's collection with joined store_item data
  const { data: collection } = await supabase
    .from('user_pets_collection')
    .select(`
      id, user_id, item_id, pet_type, source, acquired_at,
      store_item:store_items(*)
    `)
    .eq('user_id', user.id)
    .order('acquired_at', { ascending: false })

  // 2. Find currently active pet
  const { data: activePet } = await supabase
    .from('pets')
    .select('type')
    .eq('user_id', user.id)
    .eq('active', true)
    .single()

  const activePetType = activePet ? activePet.type : null

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-3">
          <span>Mi Colección</span>
          <span className="text-2xl">🎒</span>
        </h1>
        <p className="text-[var(--text-secondary)]">
          Administra tus mascotas y accesorios adquiridos.
        </p>
      </div>

      <CollectionGrid 
        collection={collection || []} 
        activePetType={activePetType} 
      />
    </div>
  )
}
