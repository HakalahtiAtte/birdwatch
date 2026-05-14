import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  const payload = await req.json()
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

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

  // For each alert, find the user's most recent sighting with coords to use
  // as their approximate location, then check if it's within their alert radius
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
      lastSighting.latitude,
      lastSighting.longitude,
      record.latitude,
      record.longitude
    )

    if (dist > alert.alert_radius_km) continue

    // Fetch push token for this user
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('push_token')
      .eq('user_id', alert.user_id)
      .maybeSingle()

    const pushToken = (prefs as any)?.push_token
    if (!pushToken) continue

    // Fetch species name for the notification body
    const { data: species } = await supabase
      .from('species')
      .select('common_name')
      .eq('id', record.species_id)
      .maybeSingle()

    pushMessages.push({
      to: pushToken,
      title: '🐦 New sighting nearby!',
      body: `${species?.common_name ?? 'A bird'} spotted ${Math.round(dist)} km away`,
      data: { sightingId: record.id },
    })
  }

  if (pushMessages.length === 0) {
    return new Response('no tokens in range', { status: 200 })
  }

  // Send via Expo Push API
  const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pushMessages),
  })

  if (!pushResponse.ok) {
    return new Response('push send failed', { status: 500 })
  }

  return new Response(
    JSON.stringify({ sent: pushMessages.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
