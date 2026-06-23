import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { PetWidget } from '@/components/pet/PetWidget';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // If you want strict auth enforcement:
  // if (!user) {
  //   redirect('/login');
  // }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Spiro Dashboard
          </h1>
          <p className="text-zinc-400 mt-2">Gestiona tus tareas y cuida de tu mascota virtual.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* User Profile Placeholder */}
          <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
            <span className="text-sm font-bold text-emerald-400">
              {user?.email?.[0].toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-160px)]">
        <section className="lg:col-span-3 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 overflow-hidden flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-zinc-100 flex items-center gap-2">
            Tablero de Tareas
          </h2>
          <div className="flex-1 overflow-x-auto">
            <KanbanBoard />
          </div>
        </section>

        <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col items-center justify-center">
          <PetWidget />
        </section>
      </main>
    </div>
  );
}
