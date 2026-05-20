'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { rateLimitLogin, rateLimitSignup } from '@/lib/rate-limit'
import { redirect } from 'next/navigation'

async function getIp(): Promise<string> {
  const headerStore = await headers()
  return headerStore.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

export async function login(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const ip = await getIp()
  const { allowed } = await rateLimitLogin(ip)
  if (!allowed) return 'Liian monta kirjautumisyritystä. Yritä uudelleen 15 minuutin kuluttua.'

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) return 'Täytä kaikki kentät.'

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return error.message

  redirect('/dashboard')
}

export async function signup(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const ip = await getIp()
  const { allowed } = await rateLimitSignup(ip)
  if (!allowed) return 'Liian monta rekisteröitymisyritystä. Yritä uudelleen tunnin kuluttua.'

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const displayName = (formData.get('displayName') as string)?.trim()

  if (!email || !password || !confirmPassword || !displayName)
    return 'Täytä kaikki kentät.'
  if (password !== confirmPassword) return 'Salasanat eivät täsmää.'
  if (password.length < 8) return 'Salasanan on oltava vähintään 8 merkkiä.'

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })

  if (error) return error.message

  if (!data.session) {
    redirect('/login?notice=Tarkista+sähköpostisi+vahvistaaksesi+tilisi.')
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
