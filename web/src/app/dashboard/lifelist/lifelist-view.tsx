'use client'

import { useState, useMemo } from 'react'
import type { LifeList, Species } from '@/types/database'

type LifeListEntry = LifeList & { species: Species | null }

export function LifeListView({ entries }: { entries: LifeListEntry[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return entries
    return entries.filter((e) =>
      e.species?.common_name?.toLowerCase().includes(q) ||
      e.species?.latin_name?.toLowerCase().includes(q) ||
      e.species?.family?.toLowerCase().includes(q)
    )
  }, [entries, search])

  return (
    <div>
      <input
        type="search"
        placeholder="Hae lajin nimellä tai heimolla…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 mb-4"
        aria-label="Hae lajilistasta"
      />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
          {entries.length === 0 ? (
            <>
              <p className="text-4xl mb-3">🐦</p>
              <p className="text-base font-medium text-gray-700">Ei lajeja vielä</p>
              <p className="text-sm text-gray-400 mt-1">
                Kirjaa havaintoja mobiilisovelluksessa niin lajit ilmestyvät tänne.
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-medium text-gray-700">Ei hakutuloksia</p>
              <p className="text-sm text-gray-400 mt-1">Kokeile eri hakusanaa.</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {filtered.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between px-5 py-4 ${
                i < filtered.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {entry.species?.common_name ?? '—'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {entry.species?.latin_name && (
                    <span className="text-xs italic text-gray-400">
                      {entry.species.latin_name}
                    </span>
                  )}
                  {entry.species?.family && (
                    <>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">{entry.species.family}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 ml-4 flex-shrink-0 text-right">
                <div>
                  <p className="text-sm font-semibold text-green-700">{entry.total_sightings}</p>
                  <p className="text-xs text-gray-400">{entry.total_sightings === 1 ? 'havainto' : 'havaintoa'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Ensikerta</p>
                  <p className="text-xs text-gray-400">{formatDate(entry.first_seen_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
