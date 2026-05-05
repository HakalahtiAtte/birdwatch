import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function sanitizeCsv(value: unknown): string {
  const str = String(value ?? '').replace(/"/g, '""')
  // Prefix formula-trigger characters to prevent spreadsheet injection
  if (str.length > 0 && '=+-@\t\r'.includes(str[0])) {
    return `"'${str}"`
  }
  return `"${str}"`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data, error } = await supabase
    .from('sightings')
    .select('*, species(*)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('sighted_at', { ascending: false })

  if (error) {
    return new NextResponse('Failed to fetch sightings', { status: 500 })
  }

  const rows = data ?? []

  const headers = [
    'Date',
    'Bird name',
    'Latin name',
    'Count',
    'Location',
    'Latitude',
    'Longitude',
    'Notes',
    'Public',
  ]

  const csvRows = rows.map((s) => [
    s.sighted_at,
    s.species?.common_name ?? '',
    s.species?.latin_name ?? '',
    s.count,
    s.location_name ?? '',
    s.latitude ?? '',
    s.longitude ?? '',
    s.notes ?? '',
    s.is_public ? 'yes' : 'no',
  ])

  const csv = [headers, ...csvRows]
    .map((row) => row.map((cell) => sanitizeCsv(cell)).join(','))
    .join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="birdwatch-sightings.csv"',
    },
  })
}
