'use client'

import dynamic from 'next/dynamic'
import type { SightingWithSpecies } from '../../../../shared/types/database'

const MapView = dynamic(
  () => import('./map-view').then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Ladataan karttaa…
      </div>
    ),
  }
)

export function MapLoader({ sightings }: { sightings: SightingWithSpecies[] }) {
  return <MapView sightings={sightings} />
}
