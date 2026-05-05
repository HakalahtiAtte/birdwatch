import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LifeListView } from './lifelist-view'
import type { LifeList, Species } from '@/types/database'

type LifeListEntry = LifeList & { species: Species | null }

export default async function LifeListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('life_list')
    .select('*, species(*)')
    .eq('user_id', user.id)
    .order('first_seen_at', { ascending: false })

  const entries = (data ?? []) as LifeListEntry[]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Lajilista</h1>
        <span className="text-sm text-gray-500">{entries.length} {entries.length === 1 ? 'laji' : 'lajia'}</span>
      </div>
      <LifeListView entries={entries} />
    </div>
  )
}
