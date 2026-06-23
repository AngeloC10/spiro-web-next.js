'use client';

import { useTaskStore } from '@/store/taskStore';

export function KanbanBoard() {
  const { columns, tasks } = useTaskStore();

  return (
    <div className="flex gap-4 h-full min-w-max">
      {/* Placeholder columns */}
      <div className="w-80 bg-zinc-950/50 rounded-xl border border-zinc-800 p-4 flex flex-col">
        <h3 className="font-semibold text-zinc-300 mb-4 flex items-center justify-between">
          <span>To Do</span>
          <span className="bg-zinc-800 text-xs px-2 py-1 rounded-full text-zinc-400">0</span>
        </h3>
        <div className="flex-1 border-2 border-dashed border-zinc-800/50 rounded-lg flex items-center justify-center text-zinc-600 text-sm">
          Arrastra tareas aquí
        </div>
      </div>

      <div className="w-80 bg-zinc-950/50 rounded-xl border border-zinc-800 p-4 flex flex-col">
        <h3 className="font-semibold text-zinc-300 mb-4 flex items-center justify-between">
          <span>In Progress</span>
          <span className="bg-zinc-800 text-xs px-2 py-1 rounded-full text-zinc-400">0</span>
        </h3>
        <div className="flex-1 border-2 border-dashed border-zinc-800/50 rounded-lg flex items-center justify-center text-zinc-600 text-sm">
          Arrastra tareas aquí
        </div>
      </div>

      <div className="w-80 bg-zinc-950/50 rounded-xl border border-zinc-800 p-4 flex flex-col opacity-50">
        <button className="w-full h-12 rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors flex items-center justify-center gap-2">
          <span>+ Añadir columna</span>
        </button>
      </div>
    </div>
  );
}
