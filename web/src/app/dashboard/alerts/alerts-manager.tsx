'use client'

import { useState, useTransition } from 'react'
import { addAlert, deleteAlert } from './actions'
import type { SpeciesAlert, Species } from '../../../../shared/types/database'

type AlertWithSpecies = SpeciesAlert & { species: Species | null }

export function AlertsManager({ alerts }: { alerts: AlertWithSpecies[] }) {
  const [speciesName, setSpeciesName] = useState('')
  const [radius, setRadius] = useState('25')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleAdd = () => {
    const name = speciesName.trim()
    const r = parseInt(radius, 10)
    if (!name) { setError('Syötä lajin nimi.'); return }
    if (isNaN(r) || r < 1 || r > 500) { setError('Säteen on oltava 1–500 km.'); return }
    setError(null)
    startTransition(async () => {
      const result = await addAlert(name, r)
      if (result) { setError(result); return }
      setSpeciesName('')
      setRadius('25')
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteAlert(id)
    })
  }

  return (
    <div className="space-y-6">
      {/* Add alert */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Uusi hälytys
        </h2>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Lajin nimi (esim. Merikotka)"
            value={speciesName}
            onChange={(e) => setSpeciesName(e.target.value)}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            aria-label="Lajin nimi hälytykselle"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={500}
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-20 rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              aria-label="Hälytyssäde kilometreissä"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">km</span>
          </div>
          <button
            onClick={handleAdd}
            disabled={isPending}
            className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors whitespace-nowrap"
            aria-label="Lisää lajihälytys"
          >
            {isPending ? 'Lisätään…' : 'Lisää hälytys'}
          </button>
        </div>
      </div>

      {/* Active alerts */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Aktiiviset hälytykset ({alerts.length})
          </h2>
        </div>

        {alerts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            Ei hälytyksiä vielä. Lisää hälytys yllä saadaksesi ilmoituksen kun laji havaitaan lähellä.
          </div>
        ) : (
          <ul>
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="px-5 py-4 flex items-center justify-between border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {alert.species?.common_name ?? 'Tuntematon laji'}
                  </p>
                  {alert.species?.latin_name && (
                    <p className="text-xs italic text-gray-400 mt-0.5">
                      {alert.species.latin_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {alert.alert_radius_km} km säteellä
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(alert.id)}
                  disabled={isPending}
                  className="ml-4 text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                  aria-label={`Poista hälytys lajille ${alert.species?.common_name ?? 'laji'}`}
                >
                  Poista
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
