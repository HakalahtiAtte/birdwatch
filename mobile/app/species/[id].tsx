import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router'
import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Sighting, Species } from '../../../shared/types/database'

type SightingRow = Pick<
  Sighting,
  'id' | 'sighted_at' | 'count' | 'location_name' | 'notes' | 'is_public'
>

export default function SpeciesHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [species, setSpecies] = useState<Species | null>(null)
  const [sightings, setSightings] = useState<SightingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!id || !user) return
      setLoading(true)
      setError(null)

      Promise.all([
        supabase.from('species').select('*').eq('id', id).single(),
        supabase
          .from('sightings')
          .select('id, sighted_at, count, location_name, notes, is_public')
          .eq('user_id', user.id)
          .eq('species_id', id)
          .is('deleted_at', null)
          .order('sighted_at', { ascending: false }),
      ]).then(([speciesRes, sightingsRes]) => {
        if (speciesRes.error || !speciesRes.data) {
          setError('Lajia ei löydy.')
        } else {
          setSpecies(speciesRes.data as Species)
          setSightings((sightingsRes.data as SightingRow[]) ?? [])
        }
        setLoading(false)
      })
    }, [id, user])
  )

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  if (error || !species) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Jokin meni pieleen.'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Takaisin"
        >
          <Text style={styles.backButtonText}>Takaisin</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
          accessibilityRole="button"
          accessibilityLabel="Takaisin"
        >
          <Text style={styles.headerBackText}>‹ Takaisin</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sightings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.heroArea}>
            <Text style={styles.speciesName}>{species.common_name}</Text>
            {species.latin_name ? (
              <Text style={styles.latinName}>{species.latin_name}</Text>
            ) : null}
            {species.family ? (
              <Text style={styles.family}>{species.family}</Text>
            ) : null}
            <View style={styles.countBubble}>
              <Text style={styles.countNumber}>{sightings.length}</Text>
              <Text style={styles.countLabel}>
                {sightings.length === 1 ? 'havainto' : 'havaintoa'}
              </Text>
            </View>
            {sightings.length > 0 && (
              <Text style={styles.sectionTitle}>Kaikki havainnot</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🐦</Text>
            <Text style={styles.emptyTitle}>Ei havaintoja</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/sighting/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Näytä havainto ${formatDate(item.sighted_at)}`}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowDate}>{formatDate(item.sighted_at)}</Text>
              {item.location_name ? (
                <Text style={styles.rowLocation}>{item.location_name}</Text>
              ) : null}
              {item.notes ? (
                <Text style={styles.rowNotes} numberOfLines={1}>{item.notes}</Text>
              ) : null}
            </View>
            <View style={styles.rowRight}>
              {item.count > 1 && (
                <Text style={styles.rowCount}>×{item.count}</Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerBack: { padding: 4 },
  headerBackText: { fontSize: 17, color: '#16a34a', fontWeight: '500' },
  content: { paddingBottom: 48 },
  heroArea: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  speciesName: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 4 },
  latinName: { fontSize: 16, fontStyle: 'italic', color: '#6b7280', marginBottom: 4 },
  family: { fontSize: 13, color: '#9ca3af', marginBottom: 16 },
  countBubble: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  countNumber: { fontSize: 32, fontWeight: '700', color: '#16a34a', marginRight: 6 },
  countLabel: { fontSize: 15, color: '#16a34a', fontWeight: '500' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowLeft: { flex: 1 },
  rowDate: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  rowLocation: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  rowNotes: { fontSize: 12, color: '#9ca3af' },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowCount: { fontSize: 14, fontWeight: '600', color: '#16a34a', marginRight: 8 },
  chevron: { fontSize: 22, color: '#d1d5db' },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 20 },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#6b7280' },
  errorText: { fontSize: 16, color: '#dc2626', marginBottom: 16 },
  backButton: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  backButtonText: { color: '#fff', fontWeight: '600' },
})
