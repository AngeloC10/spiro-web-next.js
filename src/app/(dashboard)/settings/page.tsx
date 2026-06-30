'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'

interface UserSettings {
  dark_mode: boolean
  sleep_start: string
  sleep_end: string
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const supabase = createClient()
  
  const [settings, setSettings] = useState<UserSettings>({
    dark_mode: false,
    sleep_start: '23:00',
    sleep_end: '07:00'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data && !error) {
        setSettings({
          dark_mode: data.dark_mode ?? false,
          sleep_start: data.sleep_start,
          sleep_end: data.sleep_end
        })
        setTheme(data.dark_mode ? 'dark' : 'light')
      } else if (error && error.code === 'PGRST116') {
        // No settings found, default to state above (light mode)
        setTheme('light')
      }
      setLoading(false)
    }
    loadSettings()
  }, [supabase, setTheme])

  const handleToggleTheme = async () => {
    const newDarkMode = !settings.dark_mode
    setSettings(prev => ({ ...prev, dark_mode: newDarkMode }))
    setTheme(newDarkMode ? 'dark' : 'light')
    await updateSetting('dark_mode', newDarkMode)
  }

  const handleTimeChange = (field: 'sleep_start' | 'sleep_end', value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleTimeBlur = async (field: 'sleep_start' | 'sleep_end') => {
    await updateSetting(field, settings[field])
  }

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    setSaving(true)
    setMessage(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          [key]: value
        }, { onConflict: 'user_id' })

      if (error) throw error
      setMessage({ type: 'success', text: 'Configuración guardada.' })
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar.' })
    } finally {
      setSaving(false)
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
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">Ajustes</h1>

      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 mb-8 shadow-xl space-y-8">
        
        {/* App Preferences */}
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <span>🎨</span> Apariencia y Preferencias
          </h2>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Modo Oscuro</p>
              <p className="text-sm text-[var(--text-secondary)]">Activa el tema oscuro en toda la aplicación.</p>
            </div>
            <button
              onClick={handleToggleTheme}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${
                settings.dark_mode ? 'bg-[var(--accent)]' : 'bg-slate-300'
              }`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                settings.dark_mode ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </section>

        {/* Pet Gamification Settings */}
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <span>🐾</span> Horario de Sueño de Mascota
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Durante las horas de sueño, los atributos de tu mascota (Hambre y Felicidad) no disminuirán. Esto evita que tu mascota se penalice mientras duermes.
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                Hora de Dormir
              </label>
              <input
                type="time"
                value={settings.sleep_start}
                onChange={e => handleTimeChange('sleep_start', e.target.value)}
                onBlur={() => handleTimeBlur('sleep_start')}
                className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                Hora de Despertar
              </label>
              <input
                type="time"
                value={settings.sleep_end}
                onChange={e => handleTimeChange('sleep_end', e.target.value)}
                onBlur={() => handleTimeBlur('sleep_end')}
                className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
              />
            </div>
          </div>
        </section>

        {message && (
          <div className={`p-3 rounded-lg text-sm font-medium animate-fade-in ${
            message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
