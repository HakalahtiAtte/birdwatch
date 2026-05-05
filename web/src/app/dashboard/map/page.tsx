import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MapLoader } from './map-loader'
import type { SightingWithSpecies } from '@/types/database'

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('sightings')
    .select('*, species(*), photos(*)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('sighted_at', { ascending: false })

  const sightings = (data ?? []) as SightingWithSpecies[]

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh)]">
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Kartta</h1>
        <span className="text-sm text-gray-500">{sightings.length} havaintoa sijaintitiedolla</span>
      </div>
      <div className="flex-1 relative">
        {sightings.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center px-6">
            <div>
              <p className="text-4xl mb-3">🗺️</p>
              <p className="text-sm font-medium text-gray-700">Ei sijaintitiedollisia havaintoja vielä</p>
              <p className="text-sm text-gray-400 mt-1">
                Kirjaa havaintoja GPS-sijainnilla mobiilisovelluksessa nähdäksesi ne täällä.
              </p>
            </div>
          </div>
        ) : (
          <MapLoader sightings={sightings} />
        )}
      </div>
    </div>
  )
}
