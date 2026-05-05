import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SightingsTable } from './sightings-table'
import type { SightingWithSpecies } from '@/types/database'

export default async function SightingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('sightings')
    .select('*, species(*), photos(*)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('sighted_at', { ascending: false })

  const sightings = (data ?? []) as SightingWithSpecies[]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Havaintoloki</h1>
      <SightingsTable sightings={sightings} />
    </div>
  )
}
