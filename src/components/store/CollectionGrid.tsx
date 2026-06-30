'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { UserPetCollection, ItemRarity } from '@/types'
import EmptyState from '@/components/ui/EmptyState'

const RARITY_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  common: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/50' },
  rare: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/50' },
  epic: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/50' },
  legendary: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/50' },
}

interface CollectionGridProps {
  collection: UserPetCollection[]
  activePetType: string | null
}

export default function CollectionGrid({ collection, activePetType: initialActivePet }: CollectionGridProps) {
  const supabase = createClient()
  const [activePetType, setActivePetType] = useState<string | null>(initialActivePet)
  const [loadingType, setLoadingType] = useState<string | null>(null)
  
  const handleActivate = async (petType: string) => {
    setLoadingType(petType)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user found")
        
      // Call our RPC
      const { error } = await supabase.rpc('set_active_pet', { 
        p_user_id: user.id, 
        p_pet_type: petType 
      })

      if (error) throw error
      
      setActivePetType(petType)
    } catch (err) {
      console.error("Error activating pet:", err)
      alert("No se pudo activar la mascota.")
    } finally {
      setLoadingType(null)
    }
  }

  if (collection.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-8 shadow-xl mt-8">
        <EmptyState 
          illustration="🎒"
          title="Colección Vacía"
          description="Aún no tienes mascotas ni accesorios en tu colección."
          ctaText="Ir a la Tienda"
          ctaHref="/store"
        />
      </div>
    )
  }

  const pets = collection.filter(c => c.store_item?.type === 'pet')
  const accessories = collection.filter(c => c.store_item?.type === 'accessory')

  return (
    <div className="space-y-12 animate-fade-in-up mt-8">
      
      {/* Pets Section */}
      <section>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
          <span>🐾</span> Mis Mascotas
        </h2>
        
        {pets.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-sm">No tienes mascotas aún.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {pets.map(item => {
              const storeItem = item.store_item
              if (!storeItem) return null
              
              const rColors = RARITY_COLORS[storeItem.rarity] || RARITY_COLORS.common
              const isActive = activePetType === item.pet_type
              const isUpdating = loadingType === item.pet_type

              return (
                <div key={item.id} className={`bg-[var(--card-bg)] border rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${
                  isActive ? 'border-[var(--accent)] shadow-lg shadow-[rgba(0,172,193,0.15)] ring-1 ring-[var(--accent)]' : 'border-[var(--border)] hover:border-[var(--accent)]'
                }`}>
                  <div className={`h-32 relative flex items-center justify-center p-4 border-b ${rColors.border} ${isActive ? 'bg-[rgba(0,172,193,0.05)]' : 'bg-gradient-to-b from-transparent to-[var(--column-bg)]'}`}>
                    <div className="absolute top-2 right-2">
                      <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${rColors.bg} ${rColors.text} ${rColors.border}`}>
                        {storeItem.rarity}
                      </span>
                    </div>
                    <div className="relative w-full h-full drop-shadow-lg">
                      <Image 
                        src={storeItem.preview_url} 
                        alt={storeItem.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1 text-center">
                    <h3 className="font-bold text-sm text-[var(--text-primary)] mb-4">{storeItem.name}</h3>
                    
                    {isActive ? (
                      <button disabled className="mt-auto w-full py-2 rounded-lg font-bold text-xs bg-[var(--accent)] text-white shadow-md shadow-[rgba(0,172,193,0.3)]">
                        ⭐ Activa
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleActivate(item.pet_type)}
                        disabled={isUpdating}
                        className="mt-auto w-full py-2 rounded-lg font-semibold text-xs bg-[var(--tag-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? 'Activando...' : 'Activar'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Accessories Section */}
      {accessories.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <span>🎩</span> Mis Accesorios
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {accessories.map(item => {
              const storeItem = item.store_item
              if (!storeItem) return null
              
              const rColors = RARITY_COLORS[storeItem.rarity] || RARITY_COLORS.common

              return (
                <div key={item.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col">
                  <div className={`h-24 relative flex items-center justify-center p-3 border-b ${rColors.border} bg-gradient-to-b from-transparent to-[var(--column-bg)]`}>
                    <div className="relative w-full h-full drop-shadow-md">
                      <Image 
                        src={storeItem.preview_url} 
                        alt={storeItem.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="p-3 text-center">
                    <h3 className="font-semibold text-xs text-[var(--text-secondary)]">{storeItem.name}</h3>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

    </div>
  )
}
