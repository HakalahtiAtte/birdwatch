import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
} from 'react-native'
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router'
import { useState, useCallback } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { SightingWithSpecies } from '../../../shared/types/database'

export default function SightingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [sighting, setSighting] = useState<SightingWithSpecies | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoUrls, setPhotoUrls] = useState<{ id: string; url: string }[]>([])

  const fetchSighting = useCallback(async () => {
    if (!id || !user) return
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('sightings')
      .select('*, species(*), photos(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !data) {
      setError('Havaintoa ei löydy.')
      return
    }

    setSighting(data as SightingWithSpecies)

    // Generate signed URLs for each photo
    const urls = await Promise.all(
      (data.photos ?? []).map(async (photo: { id: string; storage_path: string }) => {
        const { data: signed } = await supabase.storage
          .from('photos')
          .createSignedUrl(photo.storage_path, 3600)
        return { id: photo.id, url: signed?.signedUrl ?? '' }
      })
    )
    setPhotoUrls(urls.filter(p => p.url))
  }, [id, user])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchSighting().finally(() => setLoading(false))
    }, [fetchSighting])
  )

  const uploadAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    const ext = asset.uri.split('.').pop()?.split('?')[0] ?? 'jpg'
    const fileName = `${Date.now()}.${ext}`
    const storagePath = `${user!.id}/${id}/${fileName}`
    const mimeType = asset.mimeType ?? 'image/jpeg'

    setUploading(true)

    const arrayBuffer = await fetch(asset.uri).then(r => r.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(storagePath, arrayBuffer, { contentType: mimeType })

    if (uploadError) {
      setUploading(false)
      Alert.alert('Virhe', 'Kuvan lataaminen epäonnistui. Yritä uudelleen.')
      return
    }

    const { error: dbError } = await supabase.from('photos').insert({
      sighting_id: id,
      user_id: user!.id,
      storage_path: storagePath,
      mime_type: mimeType,
      width_px: asset.width ?? null,
      height_px: asset.height ?? null,
      file_size_bytes: asset.fileSize ?? null,
    })

    if (dbError) {
      setUploading(false)
      Alert.alert('Virhe', 'Kuvan tietojen tallentaminen epäonnistui.')
      return
    }

    setUploading(false)
    fetchSighting()
  }

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Lupa evätty', 'Kuvakirjastolupa tarvitaan kuvan lisäämiseen.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    })

    if (result.canceled || !result.assets[0]) return
    await uploadAsset(result.assets[0])
  }

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Lupa evätty', 'Kameralupa tarvitaan kuvan ottamiseen.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })

    if (result.canceled || !result.assets[0]) return
    await uploadAsset(result.assets[0])
  }

  const handlePhotoOptions = () => {
    Alert.alert('Lisää kuva', undefined, [
      { text: 'Ota kuva', onPress: handleTakePhoto },
      { text: 'Valitse kirjastosta', onPress: handleAddPhoto },
      { text: 'Peruuta', style: 'cancel' },
    ])
  }

  const handleDelete = () => {
    Alert.alert(
      'Poista havainto',
      `Poistetaanko havainto: ${sighting?.species?.common_name ?? 'havainto'}? Tätä ei voi peruuttaa.`,
      [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Poista',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            const { error: deleteError } = await supabase
              .rpc('soft_delete_sighting', { p_sighting_id: id })

            if (deleteError) {
              setDeleting(false)
              Alert.alert('Virhe', 'Havainnon poistaminen epäonnistui. Yritä uudelleen.')
              return
            }
            router.back()
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  if (error || !sighting) {
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
        <TouchableOpacity
          onPress={() => router.push(`/sighting/edit/${id}`)}
          accessibilityRole="button"
          accessibilityLabel="Muokkaa havaintoa"
        >
          <Text style={styles.headerEditText}>Muokkaa</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.speciesName}>
          {sighting.species?.common_name ?? 'Tuntematon lintu'}
        </Text>
        {sighting.species?.latin_name ? (
          <Text style={styles.latinName}>{sighting.species.latin_name}</Text>
        ) : null}

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formatDate(sighting.sighted_at)}</Text>
          </View>
          <View style={[styles.badge, sighting.is_public ? styles.badgeGreen : styles.badgeGray]}>
            <Text style={[styles.badgeText, sighting.is_public ? styles.badgeTextGreen : null]}>
              {sighting.is_public ? 'Julkinen' : 'Yksityinen'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Row label="Lukumäärä" value={String(sighting.count)} />
          {sighting.location_name ? (
            <Row label="Paikka" value={sighting.location_name} />
          ) : null}
          {sighting.latitude != null && sighting.longitude != null ? (
            <Row
              label="Koordinaatit"
              value={`${sighting.latitude.toFixed(5)}, ${sighting.longitude.toFixed(5)}`}
            />
          ) : null}
          {sighting.species?.family ? (
            <Row label="Heimo" value={sighting.species.family} />
          ) : null}
        </View>

        {sighting.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Muistiinpanot</Text>
            <Text style={styles.notesText}>{sighting.notes}</Text>
          </View>
        ) : null}

        {/* Photos section */}
        <View style={styles.photosSection}>
          <View style={styles.photosSectionHeader}>
            <Text style={styles.sectionLabel}>
              Kuvat {photoUrls.length > 0 ? `(${photoUrls.length})` : ''}
            </Text>
            <TouchableOpacity
              onPress={handlePhotoOptions}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel="Lisää kuva"
              style={styles.addPhotoBtn}
            >
              {uploading
                ? <ActivityIndicator size="small" color="#16a34a" />
                : <Text style={styles.addPhotoBtnText}>+ Lisää kuva</Text>
              }
            </TouchableOpacity>
          </View>

          {photoUrls.length > 0 ? (
            <FlatList
              data={photoUrls}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoList}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.url }}
                  style={styles.photo}
                  accessibilityLabel="Havainnon kuva"
                />
              )}
            />
          ) : (
            <TouchableOpacity
              style={styles.photoPlaceholder}
              onPress={handlePhotoOptions}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel="Lisää ensimmäinen kuva"
            >
              <Text style={styles.photoPlaceholderText}>
                Napauta lisätäksesi kuvan
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Poista tämä havainto"
        >
          {deleting
            ? <ActivityIndicator color="#dc2626" />
            : <Text style={styles.deleteButtonText}>Poista havainto</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fi-FI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  headerEditText: { fontSize: 17, color: '#16a34a', fontWeight: '500' },
  content: { padding: 20, paddingBottom: 48 },
  speciesName: { fontSize: 30, fontWeight: '700', color: '#111827', marginBottom: 4 },
  latinName: { fontSize: 17, fontStyle: 'italic', color: '#6b7280', marginBottom: 16 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  badge: { backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeGreen: { backgroundColor: '#f0fdf4' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 13, color: '#374151' },
  badgeTextGreen: { color: '#16a34a' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLabel: { fontSize: 15, color: '#6b7280' },
  rowValue: { fontSize: 15, color: '#111827', fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 16 },
  notesBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  notesLabel: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  photosSection: { marginBottom: 16 },
  photosSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  addPhotoBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', minWidth: 44, alignItems: 'center' },
  addPhotoBtnText: { fontSize: 13, fontWeight: '600', color: '#16a34a' },
  photoList: { gap: 8 },
  photo: { width: 160, height: 160, borderRadius: 12, backgroundColor: '#f3f4f6' },
  photoPlaceholder: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: { fontSize: 14, color: '#9ca3af' },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff5f5',
    minHeight: 50,
    justifyContent: 'center',
  },
  deleteButtonDisabled: { opacity: 0.5 },
  deleteButtonText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
  errorText: { fontSize: 16, color: '#dc2626', marginBottom: 16 },
  backButton: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  backButtonText: { color: '#fff', fontWeight: '600' },
})
