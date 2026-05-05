import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { useState, useCallback } from 'react'
import { useFocusEffect, router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { LifeList, Species } from '../../../shared/types/database'

type LifeListEntry = LifeList & { species: Species | null }

export default function LifeListScreen() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LifeListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchList = useCallback(async () => {
    if (!user) return
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('life_list')
      .select('*, species(*)')
      .eq('user_id', user.id)
      .order('first_seen_at', { ascending: false })

    if (fetchError) {
      setError('Lajiluettelon lataaminen epäonnistui.')
    } else {
      setEntries((data as LifeListEntry[]) ?? [])
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchList().finally(() => setLoading(false))
    }, [fetchList])
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchList()
    setRefreshing(false)
  }

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
          onPress={() => {
            setLoading(true)
            fetchList().finally(() => setLoading(false))
          }}
          accessibilityRole="button"
          accessibilityLabel="Yritä ladata lajilista uudelleen"
        >
          <Text style={styles.retryButtonText}>Yritä uudelleen</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? entries.filter(
        (e) =>
          e.species?.common_name?.toLowerCase().includes(q) ||
          e.species?.latin_name?.toLowerCase().includes(q)
      )
    : entries

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.heading}>Lajilista</Text>
        <View style={styles.countBubble}>
          <Text style={styles.countNumber}>{entries.length}</Text>
          <Text style={styles.countLabel}>lajia</Text>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Hae lajia..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel="Hae lajia"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#16a34a" />
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{q ? '🔍' : '📋'}</Text>
            <Text style={styles.emptyTitle}>
              {q ? 'Ei tuloksia' : 'Ei vielä mitään'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {q
                ? `Ei lajia nimellä "${search}"`
                : 'Jokainen kirjaamasi uusi laji ilmestyy tähän'}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/species/${item.species_id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Näytä ${item.species?.common_name ?? 'tuntematon lintu'} havainnot`}
          >
            <Text style={styles.rowNumber}>{index + 1}</Text>
            <View style={styles.rowMiddle}>
              <Text style={styles.speciesName}>
                {item.species?.common_name ?? 'Tuntematon lintu'}
              </Text>
              {item.species?.latin_name ? (
                <Text style={styles.latinName}>{item.species.latin_name}</Text>
              ) : null}
              <Text style={styles.meta}>
                Ensi kertaa nähty {formatDate(item.first_seen_at)}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.sightingCount}>{item.total_sightings}</Text>
              <Text style={styles.sightingLabel}>
                {item.total_sightings === 1 ? 'havainto' : 'havaintoa'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
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
  headerArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  heading: { fontSize: 28, fontWeight: '700', color: '#111827' },
  countBubble: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  countNumber: { fontSize: 22, fontWeight: '700', color: '#16a34a' },
  countLabel: { fontSize: 11, color: '#16a34a', fontWeight: '500' },
  listContent: { paddingBottom: 40 },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', paddingHorizontal: 40 },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rowNumber: { fontSize: 14, color: '#d1d5db', fontWeight: '600', width: 28 },
  rowMiddle: { flex: 1 },
  speciesName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  latinName: { fontSize: 13, fontStyle: 'italic', color: '#6b7280', marginBottom: 2 },
  meta: { fontSize: 12, color: '#9ca3af' },
  rowRight: { alignItems: 'flex-end', marginLeft: 12 },
  sightingCount: { fontSize: 18, fontWeight: '700', color: '#16a34a' },
  sightingLabel: { fontSize: 11, color: '#6b7280' },
  chevron: { fontSize: 22, color: '#d1d5db', marginLeft: 8 },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 20 },
  errorText: { fontSize: 16, color: '#dc2626', marginBottom: 16 },
  retryButton: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
})
