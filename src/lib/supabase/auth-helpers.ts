import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Returns the current Supabase session or null.
 * Use in Server Components / Route Handlers.
 */
export async function getSession() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}

/**
 * Returns the authenticated user from the server.
 * Prefers getUser() over getSession() for security (server-side JWT verification).
 */
export async function getUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

/**
 * Enforces authentication in a Server Component.
 * Redirects to /login if no session exists.
 * Returns the authenticated user.
 */
export async function requireAuth() {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}
