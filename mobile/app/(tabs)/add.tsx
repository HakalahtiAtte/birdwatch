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
  FlatList,
} from 'react-native'
import { useState, useRef } from 'react'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { saveDraft } from '../../lib/offline-drafts'

type Suggestion = { id: string; commonName: string; latinName: string; speciesCode: string }

export default function AddScreen() {
  const { user } = useAuth()

  const [speciesName, setSpeciesName] = useState('')
  const [latinName, setLatinName] = useState('')
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null)
  const [count, setCount] = useState('1')
  const [notes, setNotes] = useState('')
  const [locationName, setLocationName] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSpeciesChange = (text: string) => {
    setSpeciesName(text)
    setSelectedSpeciesId(null)
    setSuggestions([])

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (text.trim().length < 2) { setSearching(false); return }

    debounceRef.current = setTimeout(() => searchSpecies(text), 350)
  }

  const searchSpecies = async (query: string) => {
    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('species')
        .select('id, common_name, latin_name, ebird_species_code')
        .ilike('common_name', `%${query}%`)
        .limit(8)
      if (!error && data) {
        setSuggestions(data.map(s => ({
          id: s.id,
          commonName: s.common_name,
          latinName: s.latin_name,
          speciesCode: s.ebird_species_code ?? '',
        })))
      }
    } catch {}
    setSearching(false)
  }

  const selectSuggestion = (item: Suggestion) => {
    setSpeciesName(item.commonName)
    setLatinName(item.latinName)
    setSelectedSpeciesId(item.id)
    setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

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

  const resetForm = () => {
    setSpeciesName('')
    setLatinName('')
    setSelectedSpeciesId(null)
    setCount('1')
    setNotes('')
    setLocationName('')
    setCoords(null)
    setIsPublic(true)
    setSuggestions([])
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

    if (!selectedSpeciesId) {
      Alert.alert('Valitse laji', 'Valitse laji ehdotuslistasta ennen tallentamista.')
      return
    }

    if (!user) {
      Alert.alert('Virhe', 'Sinun on oltava kirjautuneena tallentaaksesi havainnon.')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('sightings').insert({
      user_id: user.id,
      species_id: selectedSpeciesId,
      sighted_at: new Date().toISOString(),
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      location_name: trimmedLocation || null,
      count: parsedCount,
      notes: trimmedNotes || null,
      is_public: isPublic,
      is_offline_draft: false,
    })

    setSaving(false)

    if (error) {
      offerOfflineSave({
        user_id: user.id,
        species_name: trimmedSpecies,
        latin_name: trimmedLatin,
        sighted_at: new Date().toISOString(),
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        location_name: trimmedLocation || null,
        count: parsedCount,
        notes: trimmedNotes || null,
        is_public: isPublic,
      })
      return
    }

    resetForm()
    Alert.alert('Tallennettu!', 'Havaintosi on kirjattu.')
  }

  const offerOfflineSave = (data: Parameters<typeof saveDraft>[0]) => {
    Alert.alert(
      'Ei yhteyttä',
      'Palvelimeen ei saatu yhteyttä. Tallennetaanko paikallisena luonnoksena?',
      [
        { text: 'Hylkää', style: 'destructive' },
        {
          text: 'Tallenna luonnos',
          onPress: async () => {
            await saveDraft(data)
            resetForm()
            Alert.alert('Luonnos tallennettu', 'Se synkronoituu automaattisesti Havainnot-näytöltä kun olet taas yhteydessä.')
          },
        },
      ]
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Kirjaa havainto</Text>

      <Text style={styles.label}>Linnun nimi *</Text>
      <View style={styles.autocompleteWrapper}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="esim. Peippo"
            placeholderTextColor="#9ca3af"
            value={speciesName}
            onChangeText={handleSpeciesChange}
            autoCapitalize="words"
            accessibilityLabel="Linnun yleisnimi"
          />
          {searching && (
            <ActivityIndicator
              color="#16a34a"
              size="small"
              style={styles.searchSpinner}
            />
          )}
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.speciesCode}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.suggestion,
                    index < suggestions.length - 1 && styles.suggestionBorder,
                  ]}
                  onPress={() => selectSuggestion(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.commonName}`}
                >
                  <Text style={styles.suggestionName}>{item.commonName}</Text>
                  <Text style={styles.suggestionLatin}>{item.latinName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {latinName ? (
        <>
          <Text style={styles.label}>Latinalainen nimi</Text>
          <TextInput
            style={[styles.input, styles.inputReadOnly]}
            value={latinName}
            editable={false}
            accessibilityLabel="Linnun latinalainen nimi"
          />
        </>
      ) : null}

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
          : <Text style={[styles.locationButtonText, coords && styles.locationButtonTextActive]}>
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
        accessibilityLabel="Tallenna havainto"
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveButtonText}>Tallenna havainto</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  heading: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  autocompleteWrapper: { marginBottom: 16, zIndex: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputFlex: { flex: 1, marginBottom: 0 },
  searchSpinner: { marginLeft: 10 },
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
  inputReadOnly: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  inputMultiline: { height: 88, textAlignVertical: 'top' },
  suggestions: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestion: { paddingHorizontal: 16, paddingVertical: 12 },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  suggestionName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  suggestionLatin: { fontSize: 12, fontStyle: 'italic', color: '#6b7280', marginTop: 2 },
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
  locationButtonTextActive: { fontSize: 13 },
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
