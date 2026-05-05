'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteAccount(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Not authenticated.'

  // Delete all user data — order matters for FK constraints
  const tables = ['photos', 'life_list', 'species_alerts', 'user_preferences', 'sightings'] as const

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', user.id)
    if (error) return `Failed to delete data from ${table}.`
  }

  await supabase.auth.signOut()
  redirect('/login?notice=Your+data+has+been+deleted.')
}
