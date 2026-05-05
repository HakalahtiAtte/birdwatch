'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { SightingWithSpecies } from '../../../../shared/types/database'

// Leaflet's default marker icons break under webpack — replace with an emoji DivIcon
const birdIcon = () =>
  L.divIcon({
    html: '<span style="font-size:22px;line-height:1">🐦</span>',
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  })

export function MapView({ sightings }: { sightings: SightingWithSpecies[] }) {
  // Suppress "L is not defined" SSR artifacts — this component is only ever
  // rendered client-side via dynamic import with { ssr: false }
  useEffect(() => {}, [])

  const withCoords = sightings.filter(
    (s) => s.latitude != null && s.longitude != null
  )

  const center: [number, number] =
    withCoords.length > 0
      ? [withCoords[0].latitude!, withCoords[0].longitude!]
      : [60.1699, 24.9384] // default: Helsinki

  return (
    <MapContainer
      center={center}
      zoom={withCoords.length > 0 ? 8 : 5}
      style={{ height: '100%', width: '100%' }}
      aria-label="Map of sightings"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.map((s) => (
        <Marker
          key={s.id}
          position={[s.latitude!, s.longitude!]}
          icon={birdIcon()}
        >
          <Popup>
            <div className="text-sm min-w-[140px]">
              <p className="font-semibold text-gray-900">
                {s.species?.common_name ?? 'Unknown bird'}
              </p>
              {s.species?.latin_name && (
                <p className="text-xs italic text-gray-500 mt-0.5">
                  {s.species.latin_name}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(s.sighted_at)}
              </p>
              {s.location_name && (
                <p className="text-xs text-gray-500">{s.location_name}</p>
              )}
              {s.count > 1 && (
                <p className="text-xs text-gray-500">×{s.count}</p>
              )}
              {s.notes && (
                <p className="text-xs text-gray-600 mt-1 border-t border-gray-100 pt-1">
                  {s.notes}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
