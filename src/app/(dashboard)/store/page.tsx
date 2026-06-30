import { createClient } from '@/lib/supabase/server'
import StoreCatalog from '@/components/store/StoreCatalog'

export const dynamic = 'force-dynamic'

export default async function StorePage() {
  const supabase = await createClient()

  // Fetch active store items
  const { data: items } = await supabase
    .from('store_items')
    .select('*')
    .eq('is_active', true)
    .order('price_usd', { ascending: true })

  // Fetch current user and their collection
  const { data: { user } } = await supabase.auth.getUser()

  let ownedItemIds: string[] = []
  if (user) {
    const { data: collection } = await supabase
      .from('user_pets_collection')
      .select('item_id')
      .eq('user_id', user.id)

    if (collection) {
      ownedItemIds = collection.map(c => c.item_id)
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-3">
          <span>Tienda</span>
          <span className="text-2xl">🛒</span>
        </h1>
        <p className="text-[var(--text-secondary)]">
          Descubre nuevas mascotas y accesorios para personalizar tu experiencia.
        </p>
      </div>

      <StoreCatalog
        items={items || []}
        ownedItemIds={ownedItemIds}
      />
    </div>
  )
}
