import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ActivityChart } from './components/activity-chart'
import type { SightingWithSpecies } from '../../../shared/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [sightingsRes, speciesRes, locationRes, recentRes, activityRes] = await Promise.all([
    supabase
      .from('sightings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('life_list')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('sightings')
      .select('location_name')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .not('location_name', 'is', null),
    supabase
      .from('sightings')
      .select('*, species(*), photos(*)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('sighted_at', { ascending: false })
      .limit(5),
    supabase
      .from('sightings')
      .select('sighted_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('sighted_at', thirtyDaysAgo.toISOString()),
  ])

  const uniqueLocations = new Set(
    (locationRes.data ?? []).map((r) => r.location_name as string)
  ).size

  // Build 30-day activity chart data
  const dayMap = new Map<string, number>()
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    dayMap.set(d.toISOString().split('T')[0], 0)
  }
  for (const s of activityRes.data ?? []) {
    const day = (s.sighted_at as string).split('T')[0]
    if (dayMap.has(day)) dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
  }
  const chartData = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }))

  const recentSightings = (recentRes.data ?? []) as SightingWithSpecies[]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Yhteenveto</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Havainnot" value={sightingsRes.count ?? 0} />
        <StatCard label="Lajit" value={speciesRes.count ?? 0} />
        <StatCard label="Paikat" value={uniqueLocations} />
      </div>

      {/* Activity chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Aktiivisuus — viimeiset 30 päivää
        </h2>
        <ActivityChart data={chartData} />
      </div>

      {/* Recent sightings */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Viimeisimmät havainnot
          </h2>
          <Link
            href="/dashboard/sightings"
            className="text-sm font-medium text-green-600 hover:text-green-700"
          >
            Näytä kaikki
          </Link>
        </div>

        {recentSightings.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            Ei havaintoja vielä. Kirjaa ensimmäinen lintusi mobiilisovelluksella.
          </div>
        ) : (
          <ul>
            {recentSightings.map((s) => (
              <li
                key={s.id}
                className="px-5 py-3.5 flex items-center justify-between border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {s.species?.common_name ?? 'Tuntematon lintu'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(s.sighted_at)}
                    {s.location_name ? ` · ${s.location_name}` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-400 ml-4">×{s.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
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
