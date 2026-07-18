import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useState } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

type Step = 'pick' | 'map' | 'preview' | 'importing' | 'done'

type FieldKey = 'species' | 'latin' | 'date' | 'count' | 'location' | 'notes'

const FIELDS: { key: FieldKey; label: string; required: boolean }[] = [
  { key: 'species', label: 'Linnun nimi', required: true },
  { key: 'latin', label: 'Latinalainen nimi', required: false },
  { key: 'date', label: 'Päivämäärä', required: false },
  { key: 'count', label: 'Lukumäärä', required: false },
  { key: 'location', label: 'Paikka', required: false },
  { key: 'notes', label: 'Muistiinpanot', required: false },
]

type ColumnMap = Record<FieldKey, string | null>

type ParsedRow = Record<FieldKey, string>

type ImportResult = { inserted: number; skipped: number }

export default function ImportScreen() {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('pick')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [columnMap, setColumnMap] = useState<ColumnMap>({
    species: null,
    latin: null,
    date: null,
    count: null,
    location: null,
    notes: null,
  })
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)

  const handlePickFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
      copyToCacheDirectory: true,
    })

    if (picked.canceled || !picked.assets?.[0]) return

    const asset = picked.assets[0]

    try {
      const text = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      })

      const rows = parseCSV(text)

      if (rows.length < 2) {
        Alert.alert('Tyhjä tiedosto', 'Tiedostossa ei ole datarivejä.')
        return
      }

      const detectedHeaders = rows[0].map((h) => h.trim())
      const dataRows = rows.slice(1)

      setHeaders(detectedHeaders)
      setRawRows(dataRows)
      setColumnMap(autoDetect(detectedHeaders))
      setStep('map')
    } catch {
      Alert.alert('Virhe', 'Tiedostoa ei voitu lukea. Varmista, että se on kelvollinen CSV-tiedosto.')
    }
  }

  const handleConfirmMapping = () => {
    if (!columnMap.species) {
      Alert.alert('Pakollinen', 'Sinun on valittava Linnun nimi -sarake.')
      return
    }
    const parsed = buildPreview(rawRows, headers, columnMap)
    const valid = parsed.filter((r) => r.species.trim())
    if (valid.length === 0) {
      Alert.alert('Ei kelvollisia rivejä', 'Yhdeltäkään rivillä ei ole linnun nimeä valitun sarakkeen mukaan.')
      return
    }
    setPreviewRows(parsed)
    setStep('preview')
  }

  const handleImport = async () => {
    if (!user) return
    setStep('importing')

    const validRows = previewRows.filter((r) => r.species.trim())
    let inserted = 0
    let skipped = 0

    try {
      const uniqueNames = [...new Set(validRows.map((r) => r.species.trim()))]

      const { data: existingSpecies } = await supabase
        .from('species')
        .select('id, common_name')
        .in('common_name', uniqueNames)

      const speciesMap = new Map<string, string>(
        (existingSpecies ?? []).map((s) => [s.common_name.toLowerCase(), s.id])
      )

      const missing = uniqueNames.filter((n) => !speciesMap.has(n.toLowerCase()))
      if (missing.length > 0) {
        const toInsert = missing.map((name) => ({
          common_name: name,
          latin_name: validRows.find(
            (r) => r.species.trim().toLowerCase() === name.toLowerCase()
          )?.latin?.trim() || name,
        }))
        const { data: created } = await supabase
          .from('species')
          .insert(toInsert)
          .select('id, common_name')
        ;(created ?? []).forEach((s) => speciesMap.set(s.common_name.toLowerCase(), s.id))
      }

      const sightings = validRows.map((row) => {
        const speciesId = speciesMap.get(row.species.trim().toLowerCase()) ?? null
        const parsedCount = parseInt(row.count, 10)
        return {
          user_id: user.id,
          species_id: speciesId,
          sighted_at: parseDate(row.date) ?? new Date().toISOString(),
          count: isNaN(parsedCount) || parsedCount < 1 ? 1 : parsedCount,
          location_name: row.location.trim() || null,
          notes: row.notes.trim() || null,
          is_public: false,
          is_offline_draft: false,
        }
      })

      const BATCH = 100
      for (let i = 0; i < sightings.length; i += BATCH) {
        const batch = sightings.slice(i, i + BATCH)
        const { error } = await supabase.from('sightings').insert(batch)
        if (error) {
          skipped += batch.length
        } else {
          inserted += batch.length
        }
      }
    } catch {
      skipped = previewRows.length
    }

    setResult({ inserted, skipped })
    setStep('done')
  }

  // ── RENDER ──────────────────────────────────────────────────────────────

  if (step === 'pick') {
    return (
      <ScreenShell title="Tuo havainnot">
        <Text style={styles.body}>
          Lataa CSV-tiedosto tuodaksesi havainnot kerralla. Tiedoston ensimmäisellä rivillä tulee olla sarakkeiden otsikot.
        </Text>
        <View style={styles.templateBox}>
          <Text style={styles.templateLabel}>Odotetut sarakkeet (missä järjestyksessä tahansa):</Text>
          <Text style={styles.templateCols}>
            Linnun nimi · Latinalainen nimi · Päivämäärä · Lukumäärä · Paikka · Muistiinpanot
          </Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handlePickFile}
          accessibilityRole="button"
          accessibilityLabel="Valitse CSV-tiedosto"
        >
          <Text style={styles.primaryButtonText}>Valitse CSV-tiedosto</Text>
        </TouchableOpacity>
      </ScreenShell>
    )
  }

  if (step === 'map') {
    return (
      <ScreenShell title="Kartoita sarakkeet">
        <Text style={styles.body}>
          Yhdistä CSV-sarakkeet havainnon kenttiin.
        </Text>
        {FIELDS.map((field) => (
          <View key={field.key} style={styles.mapRow}>
            <Text style={styles.mapLabel}>
              {field.label}
              {field.required ? <Text style={styles.required}> *</Text> : null}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  columnMap[field.key] === null && styles.chipSelected,
                ]}
                onPress={() => setColumnMap((m) => ({ ...m, [field.key]: null }))}
                accessibilityRole="button"
                accessibilityLabel="Ei mitään"
              >
                <Text style={[styles.chipText, columnMap[field.key] === null && styles.chipTextSelected]}>
                  Ei mitään
                </Text>
              </TouchableOpacity>
              {headers.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.chip, columnMap[field.key] === h && styles.chipSelected]}
                  onPress={() => setColumnMap((m) => ({ ...m, [field.key]: h }))}
                  accessibilityRole="button"
                  accessibilityLabel={h}
                >
                  <Text style={[styles.chipText, columnMap[field.key] === h && styles.chipTextSelected]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleConfirmMapping}
          accessibilityRole="button"
          accessibilityLabel="Esikatsele tuonti"
        >
          <Text style={styles.primaryButtonText}>Esikatsele →</Text>
        </TouchableOpacity>
      </ScreenShell>
    )
  }

  if (step === 'preview') {
    const valid = previewRows.filter((r) => r.species.trim()).length
    const skipped = previewRows.length - valid
    return (
      <ScreenShell title="Esikatselu">
        <Text style={styles.body}>
          <Text style={styles.bold}>{valid}</Text> riviä tuodaan
          {skipped > 0 ? `, ${skipped} ohitetaan (puuttuva linnun nimi)` : ''}.
        </Text>
        <View style={styles.previewTable}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewCell, styles.previewCellWide, styles.previewHeaderText]}>
              Lintu
            </Text>
            <Text style={[styles.previewCell, styles.previewHeaderText]}>Päivämäärä</Text>
            <Text style={[styles.previewCell, styles.previewHeaderText]}>Lkm</Text>
          </View>
          {previewRows.slice(0, 8).map((row, i) => (
            <View key={i} style={[styles.previewRow, !row.species.trim() && styles.previewRowSkipped]}>
              <Text style={[styles.previewCell, styles.previewCellWide]} numberOfLines={1}>
                {row.species || '—'}
              </Text>
              <Text style={styles.previewCell} numberOfLines={1}>
                {row.date || '—'}
              </Text>
              <Text style={styles.previewCell}>{row.count || '1'}</Text>
            </View>
          ))}
          {previewRows.length > 8 && (
            <Text style={styles.previewMore}>+{previewRows.length - 8} riviä lisää</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleImport}
          accessibilityRole="button"
          accessibilityLabel={`Tuo ${valid} havaintoa`}
        >
          <Text style={styles.primaryButtonText}>Tuo {valid} havaintoa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setStep('map')}
          accessibilityRole="button"
          accessibilityLabel="Palaa sarakkeiden kartoitukseen"
        >
          <Text style={styles.secondaryButtonText}>Takaisin</Text>
        </TouchableOpacity>
      </ScreenShell>
    )
  }

  if (step === 'importing') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.importingText}>Tuodaan havaintoja…</Text>
      </View>
    )
  }

  if (step === 'done') {
    return (
      <ScreenShell title="Valmis">
        <View style={styles.doneIconArea}>
          <Text style={styles.doneEmoji}>✅</Text>
        </View>
        <Text style={styles.doneTitle}>Tuonti valmis</Text>
        <Text style={styles.body}>
          <Text style={styles.bold}>{result?.inserted ?? 0}</Text> havaintoa tuotu
          {(result?.skipped ?? 0) > 0
            ? `, ${result!.skipped} epäonnistui`
            : ' onnistuneesti'}.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/(tabs)/sightings')}
          accessibilityRole="button"
          accessibilityLabel="Näytä havainnot"
        >
          <Text style={styles.primaryButtonText}>Näytä havainnot</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setStep('pick')
            setResult(null)
            setHeaders([])
            setRawRows([])
          }}
          accessibilityRole="button"
          accessibilityLabel="Tuo toinen tiedosto"
        >
          <Text style={styles.secondaryButtonText}>Tuo toinen tiedosto</Text>
        </TouchableOpacity>
      </ScreenShell>
    )
  }

  return null
}

// ── Shell wrapper with back button ────────────────────────────────────────

function ScreenShell({ title, children }: { title: string; children: React.ReactNode }) {
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
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const cells: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (ch === ',' && !inQuotes) {
          cells.push(current)
          current = ''
        } else {
          current += ch
        }
      }
      cells.push(current)
      return cells
    })
}

function autoDetect(headers: string[]): ColumnMap {
  const find = (patterns: RegExp) =>
    headers.find((h) => patterns.test(h.toLowerCase())) ?? null

  return {
    species: find(/species|bird|name/),
    latin: find(/latin|scientific/),
    date: find(/date|time|when/),
    count: find(/count|number|qty|quantity|amount/),
    location: find(/location|place|site|where/),
    notes: find(/notes?|comment|description|remarks?/),
  }
}

function buildPreview(
  rows: string[][],
  headers: string[],
  map: ColumnMap
): ParsedRow[] {
  const idx = (key: FieldKey) => (map[key] ? headers.indexOf(map[key]!) : -1)
  const idxMap: Record<FieldKey, number> = {
    species: idx('species'),
    latin: idx('latin'),
    date: idx('date'),
    count: idx('count'),
    location: idx('location'),
    notes: idx('notes'),
  }

  return rows
    .filter((row) => row.some((cell) => String(cell).trim()))
    .map((row) => ({
      species: idxMap.species >= 0 ? String(row[idxMap.species] ?? '').trim() : '',
      latin: idxMap.latin >= 0 ? String(row[idxMap.latin] ?? '').trim() : '',
      date: idxMap.date >= 0 ? String(row[idxMap.date] ?? '').trim() : '',
      count: idxMap.count >= 0 ? String(row[idxMap.count] ?? '').trim() : '',
      location: idxMap.location >= 0 ? String(row[idxMap.location] ?? '').trim() : '',
      notes: idxMap.notes >= 0 ? String(row[idxMap.notes] ?? '').trim() : '',
    }))
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// ── Styles ────────────────────────────────────────────────────────────────

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
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  headerSpacer: { width: 60 },
  content: { padding: 20, paddingBottom: 48 },
  body: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 20 },
  bold: { fontWeight: '600', color: '#111827' },
  templateBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 16,
    marginBottom: 24,
  },
  templateLabel: { fontSize: 13, fontWeight: '600', color: '#16a34a', marginBottom: 6 },
  templateCols: { fontSize: 13, color: '#374151' },
  mapRow: { marginBottom: 16 },
  mapLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  required: { color: '#dc2626' },
  chipScroll: { flexGrow: 0 },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  previewTable: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  previewHeaderText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  previewRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  previewRowSkipped: { opacity: 0.35 },
  previewCell: { fontSize: 13, color: '#111827', flex: 1 },
  previewCellWide: { flex: 2 },
  previewMore: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryButtonText: { color: '#374151', fontSize: 16, fontWeight: '500' },
  importingText: { marginTop: 16, fontSize: 16, color: '#6b7280' },
  doneIconArea: { alignItems: 'center', marginBottom: 12 },
  doneEmoji: { fontSize: 56 },
  doneTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 12 },
})
