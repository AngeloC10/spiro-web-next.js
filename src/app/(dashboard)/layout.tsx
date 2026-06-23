import Header from '@/components/dashboard/Header'
import Sidebar from '@/components/dashboard/Sidebar'
import SessionWatcher from '@/components/ui/SessionWatcher'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
