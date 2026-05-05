'use client'

import { useState, useMemo } from 'react'
import type { SightingWithSpecies } from '@/types/database'

type SortKey = 'sighted_at' | 'common_name' | 'count'
type SortDir = 'asc' | 'desc'

export function SightingsTable({ sightings }: { sightings: SightingWithSpecies[] }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('sighted_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return sightings
      .filter((s) => {
        if (!q) return true
        return (
          s.species?.common_name?.toLowerCase().includes(q) ||
          s.species?.latin_name?.toLowerCase().includes(q) ||
          s.location_name?.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        let av: string | number = ''
        let bv: string | number = ''
        if (sortKey === 'sighted_at') { av = a.sighted_at; bv = b.sighted_at }
        if (sortKey === 'common_name') {
          av = a.species?.common_name ?? ''
          bv = b.species?.common_name ?? ''
        }
        if (sortKey === 'count') { av = a.count; bv = b.count }
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
  }, [sightings, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-green-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="search"
          placeholder="Hae lajin tai paikan mukaan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          aria-label="Hae havaintoja"
        />
        <a
          href="/api/export/sightings"
          download="birdwatch-sightings.csv"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Vie havainnot CSV-tiedostona"
        >
          Vie CSV
        </a>
      </div>

      <p className="text-xs text-gray-400 mb-3">{filtered.length} havaintoa</p>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <Th onClick={() => toggleSort('common_name')}>
                  Lintu {sortIcon('common_name')}
                </Th>
                <Th onClick={() => toggleSort('sighted_at')}>
                  Päivämäärä {sortIcon('sighted_at')}
                </Th>
                <Th>Paikka</Th>
                <Th onClick={() => toggleSort('count')}>
                  Lkm {sortIcon('count')}
                </Th>
                <Th>Julkinen</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    Ei hakua vastaavia havaintoja.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {s.species?.common_name ?? '—'}
                      </p>
                      {s.species?.latin_name && (
                        <p className="text-xs text-gray-400 italic mt-0.5">
                          {s.species.latin_name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(s.sighted_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.location_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-center">{s.count}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          s.is_public ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        aria-label={s.is_public ? 'Julkinen' : 'Yksityinen'}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${
        onClick ? 'cursor-pointer select-none hover:text-gray-700' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </th>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
