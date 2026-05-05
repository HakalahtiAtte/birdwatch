'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addAlert(speciesName: string, radiusKm: number): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Not authenticated.'

  // Find or create species
  let speciesId: string | null = null
  const { data: existing } = await supabase
    .from('species')
    .select('id')
    .ilike('common_name', speciesName.trim())
    .maybeSingle()

  if (existing) {
    speciesId = existing.id
  } else {
    const { data: created, error } = await supabase
      .from('species')
      .insert({ common_name: speciesName.trim(), latin_name: speciesName.trim() })
      .select('id')
      .single()
    if (error) return 'Failed to save species.'
    speciesId = created.id
  }

  const { error } = await supabase.from('species_alerts').insert({
    user_id: user.id,
    species_id: speciesId,
    alert_radius_km: radiusKm,
    is_active: true,
  })

  if (error) return 'Failed to create alert.'

  revalidatePath('/dashboard/alerts')
  return null
}

export async function deleteAlert(alertId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('species_alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard/alerts')
}
