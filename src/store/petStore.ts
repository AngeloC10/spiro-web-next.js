import { create } from 'zustand';

interface PetState {
  name: string;
  level: number;
  experience: number;
  happiness: number;
  setPetStats: (stats: Partial<PetState>) => void;
  addExperience: (amount: number) => void;
}

export const usePetStore = create<PetState>((set) => ({
  name: 'Spiro',
  level: 1,
  experience: 0,
  happiness: 100,
  setPetStats: (stats) => set((state) => ({ ...state, ...stats })),
  addExperience: (amount) => set((state) => {
    const newExp = state.experience + amount;
    // Simple level up logic: 100 exp per level
    const newLevel = Math.floor(newExp / 100) + 1;
    return {
      experience: newExp,
      level: newLevel > state.level ? newLevel : state.level
    };
  }),
}));
