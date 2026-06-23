'use client';

import { usePetStore } from '@/store/petStore';

export function PetWidget() {
  const { pet } = usePetStore();

  const name       = pet?.name       ?? 'Sin mascota'
  const level      = pet?.level      ?? 1
  const happiness  = pet?.happiness  ?? 0
  const xp         = pet?.xp        ?? 0
  const xpNeeded   = level * 100

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center">
      <div className="relative w-48 h-48 mb-6">
        {/* Placeholder for Pet Image / Animation */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 rounded-full animate-pulse blur-xl"></div>
        <div className="relative w-full h-full bg-zinc-800 rounded-full border-4 border-zinc-700 flex items-center justify-center overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.1)]">
          <span className="text-6xl animate-bounce">
            {pet?.type === 'cat' ? '🐱' : pet?.type === 'dragon' ? '🐉' : '🐧'}
          </span>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
        {name}
      </h3>
      
      <div className="flex gap-4 text-sm font-medium text-zinc-400 mb-6">
        <div className="bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">Lvl {level}</div>
        <div className="bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">❤ {happiness}%</div>
      </div>

      <div className="w-full max-w-[200px] bg-zinc-800 rounded-full h-3 mb-2 border border-zinc-700 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-500" 
          style={{ width: `${Math.min(100, Math.round((xp / xpNeeded) * 100))}%` }}
        ></div>
      </div>
      <p className="text-xs text-zinc-500">{xp} / {xpNeeded} EXP</p>
    </div>
  );
}
