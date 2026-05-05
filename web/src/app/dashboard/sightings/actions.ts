'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSighting(
  id: string,
  data: {
    count: number
    location_name: string | null
    notes: string | null
    is_public: boolean
    sighted_at: string
  }
): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Not authenticated.'

  const { error } = await supabase
    .from('sightings')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return 'Failed to update sighting.'

  revalidatePath('/dashboard/sightings')
  revalidatePath('/dashboard')
  return null
}

export async function deleteSighting(id: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'Not authenticated.'

  // Use the same RPC as mobile — handles soft delete + life_list counter update
  const { error } = await supabase
    .rpc('soft_delete_sighting', { p_sighting_id: id })

  if (error) return 'Failed to delete sighting.'

  revalidatePath('/dashboard/sightings')
  revalidatePath('/dashboard/lifelist')
  revalidatePath('/dashboard')
  return null
}
