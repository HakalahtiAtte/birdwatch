import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

type Stats = {
  totalSightings: number
  totalSpecies: number
  totalLocations: number
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!user) return

    Promise.all([
      supabase
        .from('sightings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null),

      supabase
        .from('life_list')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),

      supabase
        .from('sightings')
        .select('location_name')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .not('location_name', 'is', null),
    ]).then(([sightingsRes, speciesRes, locationsRes]) => {
      const uniqueLocations = new Set(
        (locationsRes.data ?? []).map((r) => r.location_name as string)
      ).size

      setStats({
        totalSightings: sightingsRes.count ?? 0,
        totalSpecies: speciesRes.count ?? 0,
        totalLocations: uniqueLocations,
      })
      setLoadingStats(false)
    })
  }, [user])

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? ''

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarArea}>
        <View
          style={styles.avatar}
          accessibilityLabel={`Profiilikuva käyttäjälle ${displayName}`}
          accessibilityRole="image"
        >
          <Text style={styles.avatarInitial}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Havainnot"
          value={stats?.totalSightings}
          loading={loadingStats}
        />
        <StatCard
          label="Lajit"
          value={stats?.totalSpecies}
          loading={loadingStats}
        />
        <StatCard
          label="Paikat"
          value={stats?.totalLocations}
          loading={loadingStats}
        />
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/import')}
          accessibilityRole="button"
          accessibilityLabel="Tuo havainnot CSV-tiedostosta"
        >
          <Text style={styles.menuItemText}>Tuo havainnot</Text>
          <Text style={styles.menuItemChevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity
          style={styles.menuItem}
          accessibilityRole="button"
          accessibilityLabel="Asetukset (tulossa pian)"
          disabled
        >
          <Text style={[styles.menuItemText, styles.menuItemDisabled]}>Asetukset</Text>
          <Text style={styles.menuItemChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={signOut}
        accessibilityRole="button"
        accessibilityLabel="Kirjaudu ulos"
      >
        <Text style={styles.signOutText}>Kirjaudu ulos</Text>
      </TouchableOpacity>

      <Text style={styles.attribution}>
        Lintulajitiedot tarjoaa{'\n'}
        <Text style={styles.attributionBold}>eBird / Cornell Lab of Ornithology</Text>
      </Text>
    </ScrollView>
  )
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string
  value: number | undefined
  loading: boolean
}) {
  return (
    <View style={styles.statCard}>
      {loading ? (
        <ActivityIndicator color="#16a34a" />
      ) : (
        <Text style={styles.statValue}>{value ?? 0}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 48 },
  avatarArea: { alignItems: 'center', paddingTop: 64, paddingBottom: 28 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: '#fff' },
  displayName: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6b7280' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  section: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  menuItemText: { fontSize: 16, color: '#374151' },
  menuItemChevron: { fontSize: 20, color: '#d1d5db' },
  menuItemDisabled: { color: '#9ca3af' },
  menuDivider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 16 },
  signOutButton: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff5f5',
  },
  signOutText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
  attribution: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 24, marginBottom: 8, lineHeight: 18 },
  attributionBold: { fontWeight: '600', color: '#6b7280' },
})
