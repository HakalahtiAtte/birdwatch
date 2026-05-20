'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Image from 'next/image'

const SIGNED_URL_TTL_SECONDS = 3600
import { updateSighting, deleteSighting } from './actions'
import { createClient } from '@/lib/supabase/client'
import type { SightingWithSpecies } from '@/types/database'

export function EditModal({
  sighting,
  onClose,
}: {
  sighting: SightingWithSpecies
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])

  const cancelledRef = useRef(false)
  useEffect(() => {
    cancelledRef.current = false
    if (!sighting.photos?.length) return
    const supabase = createClient()
    Promise.all(
      sighting.photos.map((p) =>
        supabase.storage.from('photos').createSignedUrl(p.storage_path, SIGNED_URL_TTL_SECONDS)
          .then(({ data }) => data?.signedUrl ?? null)
      )
    ).then((urls) => {
      if (!cancelledRef.current) setPhotoUrls(urls.filter(Boolean) as string[])
    })
    return () => { cancelledRef.current = true }
  }, [sighting.photos])

  const [count, setCount] = useState(String(sighting.count))
  const [locationName, setLocationName] = useState(sighting.location_name ?? '')
  const [notes, setNotes] = useState(sighting.notes ?? '')
  const [isPublic, setIsPublic] = useState(sighting.is_public)
  const [sightedAt, setSightedAt] = useState(() => {
    // datetime-local needs local time, but sighted_at is UTC — adjust for offset
    const d = new Date(sighting.sighted_at)
    const offset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offset).toISOString().slice(0, 16)
  })

  const handleSave = () => {
    const parsedCount = parseInt(count, 10)
    if (isNaN(parsedCount) || parsedCount < 1) {
      setError('Lukumäärän on oltava vähintään 1.')
      return
    }
    if (!sightedAt) {
      setError('Päivämäärä on pakollinen.')
      return
    }

    startTransition(async () => {
      const err = await updateSighting(sighting.id, {
        count: parsedCount,
        location_name: locationName.trim() || null,
        notes: notes.trim() || null,
        is_public: isPublic,
        sighted_at: new Date(sightedAt).toISOString(),
      })
      if (err) {
        setError(err)
      } else {
        onClose()
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const err = await deleteSighting(sighting.id)
      if (err) {
        setError(err)
        setConfirming(false)
      } else {
        onClose()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      aria-modal="true"
      role="dialog"
      aria-label="Muokkaa havaintoa"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {sighting.species?.common_name ?? 'Havainto'}
            </h2>
            {sighting.species?.latin_name && (
              <p className="text-xs text-gray-400 italic mt-0.5">
                {sighting.species.latin_name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
            aria-label="Sulje"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="edit-sighted-at" className="block text-sm font-medium text-gray-700 mb-1">
              Päivämäärä ja aika
            </label>
            <input
              id="edit-sighted-at"
              type="datetime-local"
              value={sightedAt}
              onChange={(e) => setSightedAt(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          <div>
            <label htmlFor="edit-count" className="block text-sm font-medium text-gray-700 mb-1">
              Lukumäärä
            </label>
            <input
              id="edit-count"
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-24 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          <div>
            <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700 mb-1">
              Paikka
            </label>
            <input
              id="edit-location"
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="esim. Kaivopuisto"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          <div>
            <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Muistiinpanot
            </label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Käyttäytyminen, höyhenpuku, sää..."
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded accent-green-600"
            />
            <span className="text-sm text-gray-700">Julkinen havainto</span>
          </label>

          {photoUrls.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Kuvat ({photoUrls.length})
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photoUrls.map((url, i) => (
                  <div key={i} className="relative w-24 h-24 flex-shrink-0">
                    <Image
                      src={url}
                      alt={`Havainnon kuva ${i + 1}`}
                      fill
                      className="rounded-xl object-cover border border-gray-200"
                      sizes="96px"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {confirming ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-600 font-medium">Poistetaanko pysyvästi?</span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {isPending ? 'Poistetaan…' : 'Kyllä, poista'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Peruuta
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={isPending}
              className="text-sm text-red-500 hover:text-red-700 font-medium"
              aria-label="Poista havainto"
            >
              Poista
            </button>
          )}

          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              Peruuta
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {isPending ? 'Tallennetaan…' : 'Tallenna'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
