import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useState, useCallback } from 'react'
import { router, useFocusEffect } from 'expo-router'
import MapView, { Marker, Callout } from 'react-native-maps'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { SightingWithSpecies } from '../../../shared/types/database'

type MapSighting = SightingWithSpecies & {
  latitude: number
  longitude: number
}

const FINLAND_REGION = {
  latitude: 65.0,
  longitude: 26.0,
  latitudeDelta: 12,
  longitudeDelta: 12,
}

export default function MapScreen() {
  const { user } = useAuth()
  const [sightings, setSightings] = useState<MapSighting[]>([])
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true

      const load = async () => {
        setLoading(true)
        setError(null)

        // Fetch location permission and current position (non-blocking)
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          if (active) setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        }

        // Fetch sightings with coordinates
        const { data, error: fetchError } = await supabase
          .from('sightings')
          .select('*, species(*), photos(*)')
          .eq('user_id', user!.id)
          .is('deleted_at', null)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('sighted_at', { ascending: false })

        if (!active) return

        if (fetchError) {
          setError('Havaintojen lataaminen epäonnistui.')
        } else {
          setSightings((data as MapSighting[]) ?? [])
        }
        setLoading(false)
      }

      load()
      return () => { active = false }
    }, [user])
  )

  const initialRegion = userLocation
    ? { ...userLocation, latitudeDelta: 0.5, longitudeDelta: 0.5 }
    : sightings.length > 0
    ? getBoundingRegion(sightings)
    : FINLAND_REGION

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => setLoading(true)}
          accessibilityRole="button"
          accessibilityLabel="Yritä uudelleen"
        >
          <Text style={styles.retryButtonText}>Yritä uudelleen</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        accessibilityLabel="Havaintokartta"
      >
        {sightings.map((sighting) => (
          <Marker
            key={sighting.id}
            coordinate={{ latitude: sighting.latitude, longitude: sighting.longitude }}
            pinColor="#16a34a"
            accessibilityLabel={sighting.species?.common_name ?? 'Havainto'}
          >
            <Callout
              onPress={() => router.push(`/sighting/${sighting.id}`)}
              accessibilityLabel={`Näytä ${sighting.species?.common_name ?? 'havainto'}`}
            >
              <View style={styles.callout}>
                <Text style={styles.calloutSpecies}>
                  {sighting.species?.common_name ?? 'Tuntematon lintu'}
                </Text>
                {sighting.species?.latin_name && (
                  <Text style={styles.calloutLatin}>{sighting.species.latin_name}</Text>
                )}
                <Text style={styles.calloutMeta}>
                  {formatDate(sighting.sighted_at)}
                  {sighting.location_name ? `  ·  ${sighting.location_name}` : ''}
                  {sighting.count > 1 ? `  ·  ×${sighting.count}` : ''}
                </Text>
                <Text style={styles.calloutLink}>Näytä havainto →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {sightings.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={styles.emptyTitle}>Ei sijaintitietoja</Text>
            <Text style={styles.emptyBody}>
              Havainnoilla ei ole sijaintitietoja.{'\n'}Varmista että sijainti on päällä tallentaessasi.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.countBadge} pointerEvents="none">
        <Text style={styles.countText}>
          {sightings.length} {sightings.length === 1 ? 'havainto' : 'havaintoa'} kartalla
        </Text>
      </View>
    </View>
  )
}

function getBoundingRegion(sightings: MapSighting[]) {
  const lats = sightings.map((s) => s.latitude)
  const lngs = sightings.map((s) => s.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const padding = 0.5
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + padding, 0.1),
    longitudeDelta: Math.max(maxLng - minLng + padding, 0.1),
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  errorText: { fontSize: 16, color: '#dc2626', marginBottom: 16 },
  retryButton: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  callout: { width: 220, padding: 4 },
  calloutSpecies: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  calloutLatin: { fontSize: 12, fontStyle: 'italic', color: '#6b7280', marginBottom: 4 },
  calloutMeta: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  calloutLink: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  countBadge: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  countText: { color: '#fff', fontSize: 13, fontWeight: '600' },
})
