'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function ProfilePage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [authProvider, setAuthProvider] = useState<string>('email')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? '')

      const provider = user.app_metadata?.provider || 'email'
      setAuthProvider(provider)

      const { data: profile } = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUsername(profile.username)
        setAvatarUrl(profile.avatar_url)
      }
      setLoading(false)
    }
    loadProfile()
  }, [supabase])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // Update username
      const { error: dbError } = await supabase
        .from('users')
        .update({ username, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (dbError) throw dbError

      // Update password if provided and user uses email auth
      if (password && authProvider === 'email') {
        const { error: authError } = await supabase.auth.updateUser({ password })
        if (authError) throw authError
        // Clear password field after successful update
        setPassword('')
      }

      setMessage({ type: 'success', text: 'Perfil actualizado con éxito.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al actualizar el perfil.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') return
    setDeleting(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('delete_user_account', { p_user_id: user.id })
      if (error) throw error

      await supabase.auth.signOut()
      router.push('/login')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al eliminar la cuenta.' })
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-in-up">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">Mi Perfil</h1>

      {message && (
        <div className={`p-4 rounded-xl mb-6 font-semibold text-sm ${
          message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 mb-8 shadow-xl">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Información Básica</h2>
        
        <div className="flex flex-col sm:flex-row gap-8 mb-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--border)] bg-[var(--tag-bg)]">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSaveProfile} className="flex-1 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                Nombre de Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-muted)] opacity-70 cursor-not-allowed focus:outline-none transition-all"
              />
              <p className="text-xs text-[var(--text-muted)] mt-2">
                El correo electrónico no se puede cambiar.
              </p>
            </div>

            {authProvider === 'email' && (
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  Nueva Contraseña (Opcional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Deja en blanco para no cambiarla"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                />
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-[rgba(0,172,193,0.3)] transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-bold text-red-500 mb-2">Zona de Peligro</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Eliminar tu cuenta borrará permanentemente todos tus datos, incluyendo tus tareas, historial de tu mascota y configuraciones. Esta acción no se puede deshacer.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50 px-6 py-2.5 rounded-xl font-bold transition-all"
        >
          Eliminar Cuenta
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-red-500 mb-4">¿Estás absolutamente seguro?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Para confirmar la eliminación, escribe la palabra <strong className="text-[var(--text-primary)]">ELIMINAR</strong> en el recuadro de abajo.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] mb-6 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'ELIMINAR' || deleting}
                className="px-5 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {deleting ? 'Eliminando...' : 'Eliminar Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
