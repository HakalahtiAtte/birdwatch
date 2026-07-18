'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export async function deleteAccount(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return 'Not authenticated.'

  // Delete storage files before removing photo rows (FK order: photos first)
  const { data: photos } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('user_id', user.id)

  if (photos && photos.length > 0) {
    const paths = photos.map((p) => p.storage_path)
    await supabase.storage.from('photos').remove(paths)
  }

  // Delete all user data — order matters for FK constraints
  const tables = ['photos', 'life_list', 'species_alerts', 'user_preferences', 'sightings'] as const

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', user.id)
    if (error) return `Failed to delete data from ${table}.`
  }

  // Delete the auth user itself using the service role key (server-only)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return 'Palvelin ei ole määritetty tilin poistamiseen. Ota yhteyttä tukeen.'

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteAuthError) return 'Tilin poistaminen epäonnistui. Yritä uudelleen.'

  await supabase.auth.signOut()
  redirect('/login?notice=Tilisi+on+poistettu.')
}
