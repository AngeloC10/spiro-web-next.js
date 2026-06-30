'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { StoreItem, ItemRarity, StoreItemType } from '@/types'

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

interface StoreCatalogProps {
  items: StoreItem[]
  ownedItemIds: string[]
}

export default function StoreCatalog({ items, ownedItemIds }: StoreCatalogProps) {
  const [filterType, setFilterType] = useState<StoreItemType | 'all'>('all')
  const [filterRarity, setFilterRarity] = useState<ItemRarity | 'all'>('all')
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc'>('price_asc')

  const filteredItems = useMemo(() => {
    let result = [...items]

    if (filterType !== 'all') {
      result = result.filter(i => i.type === filterType)
    }

    if (filterRarity !== 'all') {
      result = result.filter(i => i.rarity === filterRarity)
    }

    result.sort((a, b) => {
      if (sortBy === 'price_asc') return a.price_usd - b.price_usd
      return b.price_usd - a.price_usd
    })

    return result
  }, [items, filterType, filterRarity, sortBy])

  return (
    <div className="animate-fade-in-up">
      {/* Filters */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-6">
        
        {/* Type Filter */}
        <div className="flex-1">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Tipo</p>
          <div className="flex flex-wrap gap-2">
            {(['all', 'pet', 'accessory'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type as StoreItemType | 'all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filterType === type 
                    ? 'bg-[var(--accent)] text-white shadow-md shadow-[rgba(0,172,193,0.3)]' 
                    : 'bg-[var(--tag-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
                }`}
              >
                {type === 'all' ? 'Todos' : TYPE_LABELS[type as StoreItemType]}
              </button>
            ))}
          </div>
        </div>

        {/* Rarity Filter */}
        <div className="flex-1">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Rareza</p>
          <div className="flex flex-wrap gap-2">
            {(['all', 'common', 'rare', 'epic'] as const).map(rarity => (
              <button
                key={rarity}
                onClick={() => setFilterRarity(rarity as ItemRarity | 'all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  filterRarity === rarity 
                    ? rarity !== 'all' 
                      ? RARITY_COLORS[rarity as ItemRarity].bg + ' ' + RARITY_COLORS[rarity as ItemRarity].text + ' ' + RARITY_COLORS[rarity as ItemRarity].border
                      : 'bg-slate-700 text-white border-slate-600'
                    : 'bg-[var(--tag-bg)] border-transparent text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                }`}
              >
                {rarity === 'all' ? 'Todas' : rarity === 'common' ? 'Común' : rarity === 'rare' ? 'Raro' : 'Épico'}
              </button>
            ))}
          </div>
        </div>

        {/* Sorting */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Ordenar</p>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[var(--input-bg)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="price_asc">Precio: Menor a Mayor</option>
            <option value="price_desc">Precio: Mayor a Menor</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl">
          <div className="text-5xl mb-4">🛒</div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No hay productos</h3>
          <p className="text-[var(--text-secondary)]">Prueba cambiando los filtros de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => {
            const isOwned = ownedItemIds.includes(item.id)
            const rColors = RARITY_COLORS[item.rarity]

            return (
              <div key={item.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--accent)] hover:shadow-xl transition-all duration-300 group flex flex-col">
                <div className={`h-48 relative flex items-center justify-center bg-gradient-to-b from-transparent to-[var(--column-bg)] border-b ${rColors.border} p-6`}>
                  <div className="absolute top-3 right-3">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border ${rColors.bg} ${rColors.text} ${rColors.border}`}>
                      {item.rarity}
                    </span>
                  </div>
                  <div className="relative w-full h-full transform group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl">
                    <Image 
                      src={item.preview_url} 
                      alt={item.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{item.name}</h3>
                    <span className="font-black text-[var(--accent)] text-lg">${item.price_usd}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-6 flex-1 line-clamp-2">
                    {item.description}
                  </p>
                  
                  {isOwned ? (
                    <button disabled className="w-full py-2.5 rounded-xl font-semibold bg-[var(--tag-bg)] text-[var(--text-muted)] border border-[var(--border)] cursor-not-allowed">
                      Ya lo tienes
                    </button>
                  ) : (
                    <Link href={`/store/${item.id}`} className="w-full block">
                      <button className="w-full py-2.5 rounded-xl font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] transition-colors shadow-[0_4px_12px_rgba(0,172,193,0.3)]">
                        Ver Detalles
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
