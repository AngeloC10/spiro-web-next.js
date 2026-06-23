'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PetType } from '@/types'
import Spinner from '@/components/ui/Spinner'

// ── Pet catalogue ─────────────────────────────────────────────────────────────
const PETS: Array<{
  type: PetType
  emoji: string
  label: string
  description: string
  personality: string
}> = [
  {
    type: 'penguin',
    emoji: '🐧',
    label: 'Pingüino',
    description: 'Serio y metódico',
    personality:
      'Organizado y constante. Te ayudará a mantener el orden y nunca olvida tus plazos.',
  },
  {
    type: 'cat',
    emoji: '🐱',
    label: 'Gato',
    description: 'Curioso e independiente',
    personality:
      'Creativo y espontáneo. Te inspirará con ideas nuevas y te sorprenderá cada día.',
  },
  {
    type: 'dragon',
    emoji: '🐉',
    label: 'Dragón',
    description: 'Valiente y ambicioso',
    personality:
      'Apasionado y decidido. Ideal si buscas superar retos y alcanzar grandes metas.',
  },
]

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8" aria-label="Progreso del onboarding">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`step-dot w-2 ${
            i === current ? 'active' : i < current ? 'done' : ''
          }`}
          aria-current={i === current ? 'step' : undefined}
        />
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [selectedPet, setSelectedPet] = useState<PetType | null>(null)
  const [petName, setPetName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // For step re-animation
  const [stepKey, setStepKey] = useState(0)

  // ── Bootstrap: verify auth & check for existing active pet ───────────────
  const bootstrap = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/login')
      return
    }

    setUserId(user.id)
    setUserName(
      user.user_metadata?.name ??
        user.email?.split('@')[0] ??
        'Aventurero'
    )

    // Guard: if user already has an active pet, skip onboarding
    const { data: existingPets } = await supabase
      .from('pets')
      .select('id')
      .eq('user_id', user.id)
      .eq('active', true)
      .limit(1)

    if (existingPets && existingPets.length > 0) {
      router.replace('/dashboard')
      return
    }

    setIsLoading(false)
  }, [supabase, router])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  // ── Navigation helpers ────────────────────────────────────────────────────
  const goTo = (nextStep: number) => {
    setStepKey((k) => k + 1)
    setStep(nextStep)
  }

  const handleNext = () => {
    if (step === 1 && !selectedPet) return
    goTo(step + 1)
  }

  const handleBack = () => {
    if (step === 0) return
    goTo(step - 1)
  }

  // ── Final submit: insert pet into Supabase ────────────────────────────────
  const handleFinish = async () => {
    if (!selectedPet || !petName.trim()) return
    setError(null)
    setIsSaving(true)

    const { error: insertError } = await supabase.from('pets').insert({
      user_id: userId,
      name: petName.trim(),
      type: selectedPet,
      level: 1,
      xp: 0,
      hunger: 100,
      happiness: 100,
      active: true,
      last_updated: new Date().toISOString(),
    })

    if (insertError) {
      setError('No se pudo crear tu mascota. Inténtalo de nuevo.')
      setIsSaving(false)
      return
    }

    router.push('/dashboard')
  }

  // ── Loading / bootstrapping splash ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="auth-gradient-bg flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const selectedPetData = PETS.find((p) => p.type === selectedPet)
  const canFinish = !!selectedPet && petName.trim().length > 0

  return (
    <div className="auth-gradient-bg flex min-h-screen items-center justify-center px-4 py-10">
      {/* ── Outer wrapper ── */}
      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-1">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
            style={{
              background: 'linear-gradient(135deg,#00ACC1,#0097a7)',
              boxShadow: '0 8px 24px rgba(0,172,193,.4)',
            }}
            aria-hidden="true"
          >
            🌀
          </div>
          <span
            className="text-sm font-bold tracking-widest uppercase"
            style={{ color: '#00ACC1', letterSpacing: '0.22em' }}
          >
            SPIRO
          </span>
        </div>

        {/* Step dots */}
        <StepDots current={step} total={3} />

        {/* Card */}
        <div className="auth-card px-6 py-8 md:px-10">
          {/* ─────────────────────── STEP 0 – Welcome ─────────────────────── */}
          {step === 0 && (
            <div key={stepKey} className="step-enter text-center">
              <div className="mb-5 text-6xl" aria-hidden="true">👋</div>
              <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
                ¡Hola,{' '}
                <span style={{ color: 'var(--accent)' }}>
                  {userName}
                </span>
                !
              </h1>
              <p className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                Bienvenido a SPIRO
              </p>
              <p className="mb-8 text-sm leading-relaxed text-[var(--text-secondary)]">
                Gestiona tus tareas, gana puntos y cuida a tu mascota virtual.
                Empecemos eligiendo tu compañero de productividad.
              </p>

              <button
                id="onboarding-start"
                onClick={handleNext}
                className="btn-primary"
              >
                Comenzar →
              </button>
            </div>
          )}

          {/* ───────────────────── STEP 1 – Choose pet ────────────────────── */}
          {step === 1 && (
            <div key={stepKey} className="step-enter">
              <h2 className="mb-1 text-center text-xl font-bold text-[var(--text-primary)]">
                Elige tu mascota
              </h2>
              <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">
                Tu compañero te acompañará en cada tarea completada
              </p>

              {/* Pet grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {PETS.map((pet) => (
                  <button
                    key={pet.type}
                    id={`pet-${pet.type}`}
                    type="button"
                    onClick={() => setSelectedPet(pet.type)}
                    className={`pet-card ${selectedPet === pet.type ? 'selected' : ''}`}
                    aria-pressed={selectedPet === pet.type}
                    aria-label={`Elegir ${pet.label}`}
                  >
                    {/* Check badge */}
                    <span className="selected-badge" aria-hidden="true">✓</span>

                    <span className="pet-emoji">{pet.emoji}</span>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {pet.label}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      {pet.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Selected pet personality blurb */}
              {selectedPetData && (
                <div className="mb-5 rounded-xl border border-[rgba(0,172,193,0.2)] bg-[rgba(0,172,193,0.06)] p-3 text-center animate-fade-in-up">
                  <p className="text-sm text-[var(--text-secondary)] italic">
                    "{selectedPetData.personality}"
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  id="onboarding-back-1"
                  type="button"
                  onClick={handleBack}
                  className="btn-oauth flex-1"
                >
                  ← Anterior
                </button>
                <button
                  id="onboarding-next-1"
                  type="button"
                  onClick={handleNext}
                  disabled={!selectedPet}
                  className="btn-primary flex-1"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {/* ───────────────────── STEP 2 – Name pet ─────────────────────── */}
          {step === 2 && (
            <div key={stepKey} className="step-enter">
              <h2 className="mb-1 text-center text-xl font-bold text-[var(--text-primary)]">
                Ponle un nombre
              </h2>
              <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">
                ¿Cómo se llamará tu{' '}
                <span style={{ color: 'var(--accent)' }}>
                  {selectedPetData?.label}
                </span>
                ?
              </p>

              {/* Pet preview with live name badge */}
              <div className="mb-6 flex justify-center">
                <div className="pet-preview-avatar">
                  <span
                    className="pet-emoji"
                    style={{ fontSize: '5rem' }}
                    aria-hidden="true"
                  >
                    {selectedPetData?.emoji}
                  </span>
                  <div className="pet-name-badge">
                    {petName.trim() || '…'}
                  </div>
                </div>
              </div>

              {/* Name input */}
              <div className="mb-6">
                <label
                  htmlFor="pet-name-input"
                  className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Nombre de la mascota
                </label>
                <input
                  id="pet-name-input"
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  maxLength={20}
                  placeholder={`Ej: ${selectedPetData?.label ?? 'Mascota'}`}
                  className="form-input"
                  autoFocus
                  autoComplete="off"
                />
                <p className="mt-1.5 text-right text-xs text-[var(--text-muted)]">
                  {petName.length}/20
                </p>
              </div>

              {/* Error */}
              {error && (
                <div role="alert" className="alert-error mb-4">
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  id="onboarding-back-2"
                  type="button"
                  onClick={handleBack}
                  disabled={isSaving}
                  className="btn-oauth flex-1"
                >
                  ← Anterior
                </button>
                <button
                  id="onboarding-finish"
                  type="button"
                  onClick={handleFinish}
                  disabled={!canFinish || isSaving}
                  className="btn-primary flex-1"
                  aria-busy={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Spinner size="sm" />
                      Guardando…
                    </>
                  ) : (
                    '¡Finalizar! 🎉'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Paso {step + 1} de 3 · SPIRO
        </p>
      </div>
    </div>
  )
}
