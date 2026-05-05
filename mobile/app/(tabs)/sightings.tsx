import {
  View,
  Text,
  FlatList,
  SectionList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useState, useCallback, useMemo } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getDraftCount, syncDrafts } from '../../lib/offline-drafts'
import type { SightingWithSpecies } from '../../../shared/types/database'

type ViewMode = 'time' | 'species'

type SpeciesSection = {
  title: string
  latinName: string | null
  speciesId: string | null
  data: SightingWithSpecies[]
}

export default function SightingsScreen() {
  const { user } = useAuth()
  const [sightings, setSightings] = useState<SightingWithSpecies[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftCount, setDraftCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('time')

  const fetchSightings = useCallback(async () => {
    if (!user) return
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('sightings')
      .select('*, species(*), photos(*)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('sighted_at', { ascending: false })

    if (fetchError) {
      setError('Havaintojen lataaminen epäonnistui.')
    } else {
      setSightings((data as SightingWithSpecies[]) ?? [])
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchSightings().finally(() => setLoading(false))
      getDraftCount().then(setDraftCount)
    }, [fetchSightings])
  )

  const handleSync = async () => {
    if (!user) return
    setSyncing(true)
    const { synced, failed } = await syncDrafts(user.id)
    setSyncing(false)
    setDraftCount(failed)
    if (synced > 0) {
      await fetchSightings()
      Alert.alert('Synkronoitu', `${synced} luonnos${synced > 1 ? 'ta' : ''} ladattu onnistuneesti.`)
    } else {
      Alert.alert('Synkronointi epäonnistui', 'Yhteyttä ei vielä saatavilla. Yritä myöhemmin uudelleen.')
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSightings()
    setRefreshing(false)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sightings
    return sightings.filter(
      (s) =>
        s.species?.common_name?.toLowerCase().includes(q) ||
        s.species?.latin_name?.toLowerCase().includes(q) ||
        s.location_name?.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q)
    )
  }, [sightings, search])

  const sections = useMemo<SpeciesSection[]>(() => {
    const map = new Map<string, SpeciesSection>()
    for (const s of filtered) {
      const key = s.species_id ?? 'unknown'
      if (!map.has(key)) {
        map.set(key, {
          title: s.species?.common_name ?? 'Tuntematon lintu',
          latinName: s.species?.latin_name ?? null,
          speciesId: s.species_id,
          data: [],
        })
      }
      map.get(key)!.data.push(s)
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, 'fi'))
  }, [filtered])

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
            fetchSightings().finally(() => setLoading(false))
          }}
          accessibilityRole="button"
          accessibilityLabel="Yritä ladata havainnot uudelleen"
        >
          <Text style={styles.retryButtonText}>Yritä uudelleen</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const q = search.trim()
  const isEmpty = filtered.length === 0

  const listHeader = (
    <>
      {draftCount > 0 && (
        <TouchableOpacity
          style={styles.draftBanner}
          onPress={handleSync}
          disabled={syncing}
          accessibilityRole="button"
          accessibilityLabel={`Synkronoi ${draftCount} offline-luonnos${draftCount > 1 ? 'ta' : ''}`}
        >
          {syncing
            ? <ActivityIndicator color="#92400e" size="small" />
            : <Text style={styles.draftBannerText}>
                {draftCount} offline-luonnos{draftCount > 1 ? 'ta' : ''} — napauta synkronoidaksesi
              </Text>
          }
        </TouchableOpacity>
      )}
    </>
  )

  const emptyComponent = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{q ? '🔍' : '🐦'}</Text>
      <Text style={styles.emptyTitle}>
        {q ? 'Ei tuloksia' : 'Ei havaintoja vielä'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {q
          ? `Ei havaintoja hakusanalle "${search}"`
          : 'Napauta + välilehteä kirjataksesi ensimmäisen lintusi'}
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Omat havainnot</Text>

      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Hae havaintoja..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel="Hae havaintoja"
        />
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, styles.toggleBtnLeft, viewMode === 'time' && styles.toggleBtnActive]}
          onPress={() => setViewMode('time')}
          accessibilityRole="button"
          accessibilityLabel="Aikajärjestys"
        >
          <Text style={[styles.toggleBtnText, viewMode === 'time' && styles.toggleBtnTextActive]}>
            Aikajärjestys
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, styles.toggleBtnRight, viewMode === 'species' && styles.toggleBtnActive]}
          onPress={() => setViewMode('species')}
          accessibilityRole="button"
          accessibilityLabel="Lajeittain"
        >
          <Text style={[styles.toggleBtnText, viewMode === 'species' && styles.toggleBtnTextActive]}>
            Lajeittain
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'time' ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#16a34a" />
          }
          contentContainerStyle={isEmpty ? styles.emptyContainer : styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyComponent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/sighting/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Näytä havainto: ${item.species?.common_name ?? 'tuntematon lintu'}`}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.speciesName}>
                  {item.species?.common_name ?? 'Tuntematon lintu'}
                </Text>
                <Text style={styles.latinName}>
                  {item.species?.latin_name ?? ''}
                </Text>
                <Text style={styles.meta}>
                  {formatDate(item.sighted_at)}
                  {item.location_name ? `  ·  ${item.location_name}` : ''}
                  {item.count > 1 ? `  ·  ×${item.count}` : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#16a34a" />
          }
          contentContainerStyle={isEmpty ? styles.emptyContainer : styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyComponent}
          renderSectionHeader={({ section }) => (
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => section.speciesId && router.push(`/species/${section.speciesId}`)}
              disabled={!section.speciesId}
              accessibilityRole="button"
              accessibilityLabel={`Näytä ${section.title} lajisivu`}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
                {section.latinName ? (
                  <Text style={styles.sectionHeaderLatin}>{section.latinName}</Text>
                ) : null}
              </View>
              <Text style={styles.sectionHeaderCount}>
                {section.data.length} {section.data.length === 1 ? 'havainto' : 'havaintoa'}
              </Text>
            </TouchableOpacity>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => router.push(`/sighting/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Näytä havainto ${formatDate(item.sighted_at)}`}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.groupedRowDate}>{formatDate(item.sighted_at)}</Text>
                {item.location_name ? (
                  <Text style={styles.meta}>{item.location_name}{item.count > 1 ? `  ·  ×${item.count}` : ''}</Text>
                ) : item.count > 1 ? (
                  <Text style={styles.meta}>×{item.count}</Text>
                ) : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        />
      )}
    </View>
  )
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric' })
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  heading: { fontSize: 28, fontWeight: '700', color: '#111827', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  searchWrapper: { paddingHorizontal: 16, paddingBottom: 8 },
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
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  toggleBtnLeft: { borderRadius: 10, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  toggleBtnRight: { borderRadius: 10, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 },
  toggleBtnActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  toggleBtnTextActive: { color: '#fff' },
  listContent: { paddingBottom: 40 },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', paddingHorizontal: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingLeft: 32,
  },
  rowLeft: { flex: 1 },
  speciesName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  latinName: { fontSize: 13, fontStyle: 'italic', color: '#6b7280', marginBottom: 4 },
  groupedRowDate: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 2 },
  meta: { fontSize: 13, color: '#9ca3af' },
  chevron: { fontSize: 22, color: '#d1d5db', marginLeft: 8 },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 20 },
  sectionSeparator: { height: 8, backgroundColor: '#f9fafb' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionHeaderLeft: { flex: 1 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionHeaderLatin: { fontSize: 12, fontStyle: 'italic', color: '#6b7280', marginTop: 1 },
  sectionHeaderCount: { fontSize: 12, color: '#6b7280', fontWeight: '500', marginLeft: 12 },
  errorText: { fontSize: 16, color: '#dc2626', marginBottom: 16 },
  retryButton: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  draftBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  draftBannerText: { fontSize: 14, fontWeight: '600', color: '#92400e' },
})
