import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DeleteAccountButton } from './delete-account-button'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Asetukset</h1>

      {/* Data export */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Vie tietosi</h2>
        <p className="text-sm text-gray-500 mb-4">
          Lataa kaikki havaintosi CSV-tiedostona.
        </p>
        <a
          href="/api/export/sightings"
          download="birdwatch-havainnot.csv"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Lataa havainnot CSV-tiedostona"
        >
          Lataa CSV
        </a>
      </section>

      {/* Danger zone */}
      <section className="bg-white rounded-2xl border border-red-200 p-5">
        <h2 className="text-base font-semibold text-red-700 mb-1">Vaaravyöhyke</h2>
        <p className="text-sm text-gray-500 mb-4">
          Poista tilisi ja kaikki siihen liittyvät tiedot pysyvästi. Tätä ei voi peruuttaa.
        </p>
        <DeleteAccountButton />
      </section>
    </div>
  )
}
