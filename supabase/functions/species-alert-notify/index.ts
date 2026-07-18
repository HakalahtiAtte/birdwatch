import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_BATCH_SIZE = 100

// Haversine distance in km between two lat/lon points
function distanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

serve(async (req) => {
  // Verify webhook shared secret
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  if (webhookSecret) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let payload: { record: Record<string, unknown> }
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const record = payload.record

  // Only act on public sightings with coordinates and a known species
  if (
    !record.is_public ||
    record.latitude == null ||
    record.longitude == null ||
    !record.species_id
  ) {
    return new Response('skipped', { status: 200 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Misconfigured', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Find all active alerts for this species, excluding the sighting's own user
  const { data: alerts } = await supabase
    .from('species_alerts')
    .select('id, user_id, alert_radius_km')
    .eq('species_id', record.species_id)
    .eq('is_active', true)
    .neq('user_id', record.user_id)

  if (!alerts || alerts.length === 0) {
    return new Response('no alerts', { status: 200 })
  }

  // Fetch species name once (same for every alert)
  const { data: species } = await supabase
    .from('species')
    .select('common_name, finnish_name')
    .eq('id', record.species_id)
    .maybeSingle()

  const speciesLabel = species?.finnish_name ?? species?.common_name ?? 'Lintu'

  // For each alert, check if the user is within their alert radius using their
  // most recent sighting with coordinates as their approximate location
  const pushMessages: object[] = []

  for (const alert of alerts) {
    const { data: lastSighting } = await supabase
      .from('sightings')
      .select('latitude, longitude')
      .eq('user_id', alert.user_id)
      .not('latitude', 'is', null)
      .order('sighted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!lastSighting) continue

    const dist = distanceKm(
      lastSighting.latitude as number,
      lastSighting.longitude as number,
      record.latitude as number,
      record.longitude as number,
    )

    if (dist > (alert.alert_radius_km as number)) continue

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('push_token')
      .eq('user_id', alert.user_id)
      .maybeSingle()

    const pushToken = prefs?.push_token
    if (!pushToken) continue

    pushMessages.push({
      to: pushToken,
      title: '🐦 Uusi havainto lähellä!',
      body: `${speciesLabel} havaittu ${Math.round(dist)} km päässä`,
      data: { sightingId: record.id },
    })
  }

  if (pushMessages.length === 0) {
    return new Response('no tokens in range', { status: 200 })
  }

  // Send in batches of 100 (Expo Push API limit)
  for (let i = 0; i < pushMessages.length; i += EXPO_PUSH_BATCH_SIZE) {
    const batch = pushMessages.slice(i, i + EXPO_PUSH_BATCH_SIZE)
    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    })
    if (!pushResponse.ok) {
      return new Response('push send failed', { status: 500 })
    }
  }

  return new Response(
    JSON.stringify({ sent: pushMessages.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
