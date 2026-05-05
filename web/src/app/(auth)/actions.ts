'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
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
