import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ItemRarity, StoreItemType } from '@/types'

const RARITY_COLORS: Record<ItemRarity, { bg: string, text: string, border: string }> = {
  common: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/50' },
  rare: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/50' },
  epic: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/50' },
  legendary: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/50' },
}

const TYPE_LABELS: Record<StoreItemType, string> = {
  pet: 'Mascota',
  accessory: 'Accesorio',
  theme: 'Tema'
}

export const dynamic = 'force-dynamic'

export default async function StoreItemDetailPage({
  params
}: {
  params: Promise<{ itemId: string }>
}) {
  const resolvedParams = await params
  const { itemId } = resolvedParams

  const supabase = await createClient()

  // 1. Fetch Item
  const { data: item, error } = await supabase
    .from('store_items')
    .select('*')
    .eq('id', itemId)
    .single()

  if (error || !item) {
    notFound()
  }

  // 2. Fetch User to see if owned
  let isOwned = false
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: collection } = await supabase
      .from('user_pets_collection')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .single()
      
    if (collection) {
      isOwned = true
    }
  }

  const rColors = RARITY_COLORS[item.rarity as ItemRarity]

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fade-in-up">
      <Link href="/store" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6">
        <span>←</span> Volver a la Tienda
      </Link>

      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* Left: Big Preview */}
        <div className={`md:w-1/2 p-12 flex items-center justify-center relative bg-gradient-to-br from-transparent to-[rgba(0,0,0,0.2)] border-b md:border-b-0 md:border-r ${rColors.border}`}>
          <div className="absolute top-6 left-6">
            <span className={`text-xs uppercase tracking-widest font-black px-3 py-1.5 rounded border shadow-sm ${rColors.bg} ${rColors.text} ${rColors.border}`}>
              {item.rarity}
            </span>
          </div>
          
          <div className="relative w-full aspect-square max-w-[300px] drop-shadow-2xl hover:scale-105 transition-transform duration-500">
            <Image 
              src={item.preview_url} 
              alt={item.name}
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Right: Details & Checkout */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col">
          <div className="mb-2">
            <span className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              {TYPE_LABELS[item.type as StoreItemType]}
            </span>
          </div>
          
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">{item.name}</h1>
          
          <div className="text-4xl font-black text-[var(--accent)] mb-8">
            ${item.price_usd}
          </div>

          <p className="text-[var(--text-secondary)] leading-relaxed mb-10 flex-1 text-lg">
            {item.description || 'Sin descripción detallada.'}
          </p>

          {isOwned ? (
            <div className="bg-[rgba(255,255,255,0.05)] border border-[var(--border)] rounded-2xl p-6 text-center">
              <span className="text-2xl mb-2 block">🎒</span>
              <p className="font-bold text-[var(--text-primary)]">Ya posees este artículo</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Puedes equiparlo desde tu colección.</p>
              <Link href="/collection">
                <button className="px-6 py-2 rounded-xl bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors font-semibold text-sm">
                  Ir a Colección
                </button>
              </Link>
            </div>
          ) : (
            <Link href={`/checkout/${item.id}`} className="block">
              <button className="w-full py-4 rounded-2xl font-bold text-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] transition-all shadow-[0_8px_24px_rgba(0,172,193,0.4)] hover:shadow-[0_8px_32px_rgba(0,172,193,0.6)] hover:-translate-y-1">
                Comprar Ahora
              </button>
            </Link>
          )}
        </div>

      </div>
    </div>
  )
}
