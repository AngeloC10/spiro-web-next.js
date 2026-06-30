import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Header from '@/components/dashboard/Header'
import Sidebar from '@/components/dashboard/Sidebar'
import SessionWatcher from '@/components/ui/SessionWatcher'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Guard: if user has no active pet, they must complete onboarding
  const { data: pet, error } = await supabase
    .from('pets')
    .select('id')
    .eq('user_id', user.id)
    .eq('active', true)
    .limit(1)

  console.log('LAYOUT CHECK: User ID', user.id, 'Pet query result:', pet, 'Error:', error)

  if (!pet || pet.length === 0) {
    console.log('LAYOUT CHECK: Redirecting to onboarding...')
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <SessionWatcher />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-auto bg-[var(--background)] p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
