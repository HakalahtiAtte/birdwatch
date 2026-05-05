'use client'

import { useState, useTransition } from 'react'
import { deleteAccount } from './actions'

export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const err = await deleteAccount()
      if (err) { setError(err); setConfirming(false) }
    })
  }

  if (confirming) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800 mb-3">
          Tämä poistaa pysyvästi kaikki havaintosi, lajisi, hälytyksesi ja asetuksesi.
          Tätä ei voi peruuttaa.
        </p>
        {error && (
          <p className="text-xs text-red-700 mb-3">{error}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            aria-label="Vahvista tilin poistaminen"
          >
            {isPending ? 'Poistetaan…' : 'Kyllä, poista kaikki'}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(null) }}
            disabled={isPending}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
            aria-label="Peruuta tilin poistaminen"
          >
            Peruuta
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      aria-label="Poista tilisi ja kaikki tiedot"
    >
      Poista tili &amp; kaikki tiedot
    </button>
  )
}
