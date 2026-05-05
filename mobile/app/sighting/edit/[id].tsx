import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useState, useEffect } from 'react'
import * as Location from 'expo-location'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import type { SightingWithSpecies } from '../../../../shared/types/database'

export default function EditSightingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()

  const [loadingData, setLoadingData] = useState(true)
  const [speciesName, setSpeciesName] = useState('')
  const [latinName, setLatinName] = useState('')
  const [count, setCount] = useState('1')
  const [notes, setNotes] = useState('')
  const [locationName, setLocationName] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [originalSpeciesId, setOriginalSpeciesId] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id || !user) return

    supabase
      .from('sightings')
      .select('*, species(*), photos(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          Alert.alert('Virhe', 'Havaintoa ei löydy.')
          router.back()
          return
        }
        const s = data as SightingWithSpecies
        setSpeciesName(s.species?.common_name ?? '')
        setLatinName(s.species?.latin_name ?? '')
        setCount(String(s.count))
        setNotes(s.notes ?? '')
        setLocationName(s.location_name ?? '')
        setIsPublic(s.is_public)
        setOriginalSpeciesId(s.species_id)
        if (s.latitude != null && s.longitude != null) {
          setCoords({ latitude: s.latitude, longitude: s.longitude })
        }
        setLoadingData(false)
      })
  }, [id, user])

  const handleGetLocation = async () => {
    setLocating(true)
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Lupa evätty', 'Sijaintilupa tarvitaan linnun havaitsemispaikan tallentamiseen.')
      setLocating(false)
      return
    }
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    setCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude })
    setLocating(false)
  }

  const handleSave = async () => {
    const trimmedSpecies = speciesName.trim()
    const trimmedLatin = latinName.trim()
    const trimmedLocation = locationName.trim()
    const trimmedNotes = notes.trim()

    if (!trimmedSpecies) {
      Alert.alert('Pakollinen kenttä', 'Syötä linnun nimi.')
      return
    }

    const parsedCount = parseInt(count, 10)
    if (isNaN(parsedCount) || parsedCount < 1) {
      Alert.alert('Virheellinen lukumäärä', 'Lukumäärän on oltava vähintään 1.')
      return
    }

    if (!user) return

    setSaving(true)

    // Resolve species — reuse existing if name unchanged, otherwise look up or create
    let speciesId: string | null = originalSpeciesId

    const { data: existingSpecies } = await supabase
      .from('species')
      .select('id')
      .ilike('common_name', trimmedSpecies)
      .maybeSingle()

    if (existingSpecies) {
      speciesId = existingSpecies.id
      if (trimmedLatin) {
        await supabase
          .from('species')
          .update({ latin_name: trimmedLatin })
          .eq('id', speciesId)
      }
    } else {
      const { data: newSpecies, error: speciesError } = await supabase
        .from('species')
        .insert({ common_name: trimmedSpecies, latin_name: trimmedLatin || trimmedSpecies })
        .select('id')
        .single()
      if (speciesError) {
        setSaving(false)
        Alert.alert('Virhe', 'Lajin tallentaminen epäonnistui. Yritä uudelleen.')
        return
      }
      speciesId = newSpecies.id
    }

    const { error } = await supabase.rpc('update_sighting', {
      p_sighting_id: id,
      p_species_id: speciesId,
      p_latitude: coords?.latitude ?? null,
      p_longitude: coords?.longitude ?? null,
      p_location_name: trimmedLocation || null,
      p_count: parsedCount,
      p_notes: trimmedNotes || null,
      p_is_public: isPublic,
    })

    setSaving(false)

    if (error) {
      Alert.alert('Virhe', 'Havainnon päivittäminen epäonnistui. Yritä uudelleen.')
      return
    }

    router.back()
  }

  if (loadingData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
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
          accessibilityLabel="Peruuta muokkaus"
        >
          <Text style={styles.headerCancelText}>Peruuta</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Muokkaa havaintoa</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Linnun nimi *</Text>
        <TextInput
          style={styles.input}
          placeholder="esim. Peippo"
          placeholderTextColor="#9ca3af"
          value={speciesName}
          onChangeText={setSpeciesName}
          autoCapitalize="words"
          accessibilityLabel="Linnun yleisnimi"
        />

        <Text style={styles.label}>Latinalainen nimi</Text>
        <TextInput
          style={styles.input}
          placeholder="esim. Fringilla coelebs"
          placeholderTextColor="#9ca3af"
          value={latinName}
          onChangeText={setLatinName}
          autoCapitalize="words"
          accessibilityLabel="Linnun latinalainen nimi"
        />

        <Text style={styles.label}>Lukumäärä</Text>
        <TextInput
          style={[styles.input, styles.inputNarrow]}
          placeholder="1"
          placeholderTextColor="#9ca3af"
          value={count}
          onChangeText={setCount}
          keyboardType="number-pad"
          accessibilityLabel="Lintujen lukumäärä"
        />

        <Text style={styles.label}>Paikkanimi</Text>
        <TextInput
          style={styles.input}
          placeholder="esim. Kaivopuisto"
          placeholderTextColor="#9ca3af"
          value={locationName}
          onChangeText={setLocationName}
          autoCapitalize="sentences"
          accessibilityLabel="Paikkanimi"
        />

        <TouchableOpacity
          style={[styles.locationButton, coords && styles.locationButtonActive]}
          onPress={handleGetLocation}
          disabled={locating}
          accessibilityRole="button"
          accessibilityLabel={coords ? 'GPS-sijainti tallennettu, napauta päivittääksesi' : 'Käytä nykyistä GPS-sijaintia'}
        >
          {locating
            ? <ActivityIndicator color="#16a34a" />
            : <Text style={[styles.locationButtonText, coords && styles.locationButtonTextSmall]}>
                {coords
                  ? `GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                  : 'Käytä nykyistä GPS-sijaintia'}
              </Text>
          }
        </TouchableOpacity>

        <Text style={styles.label}>Muistiinpanot</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Käyttäytyminen, höyhenpuku, sää..."
          placeholderTextColor="#9ca3af"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
          accessibilityLabel="Muistiinpanot"
        />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Julkinen havainto</Text>
            <Text style={styles.switchHint}>Näkyy muille käyttäjille kartalla</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: '#e5e7eb', true: '#86efac' }}
            thumbColor={isPublic ? '#16a34a' : '#9ca3af'}
            accessibilityLabel="Tee havainnosta julkinen"
            accessibilityRole="switch"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Tallenna muutokset"
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>Tallenna muutokset</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
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
  headerCancelText: { fontSize: 17, color: '#16a34a', fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  headerSpacer: { width: 60 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  inputNarrow: { width: 100 },
  inputMultiline: { height: 88, textAlignVertical: 'top' },
  locationButton: {
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    minHeight: 50,
    justifyContent: 'center',
  },
  locationButtonActive: { backgroundColor: '#f0fdf4', borderStyle: 'solid' },
  locationButtonText: { color: '#16a34a', fontSize: 15, fontWeight: '500' },
  locationButtonTextSmall: { fontSize: 13 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  switchHint: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  saveButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
