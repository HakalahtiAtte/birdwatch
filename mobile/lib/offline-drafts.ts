import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

const DRAFTS_KEY = 'offline_sighting_drafts'

export type DraftSighting = {
  id: string
  species_name: string
  latin_name: string
  sighted_at: string
  latitude: number | null
  longitude: number | null
  location_name: string | null
  count: number
  notes: string | null
  is_public: boolean
  saved_at: string
}

function parseDrafts(raw: string | null): DraftSighting[] {
  if (!raw) return []
  try {
    return JSON.parse(raw) as DraftSighting[]
  } catch {
    return []
  }
}

export async function saveDraft(draft: Omit<DraftSighting, 'id' | 'saved_at'>): Promise<void> {
  const raw = await AsyncStorage.getItem(DRAFTS_KEY)
  const drafts = parseDrafts(raw)
  drafts.push({
    ...draft,
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    saved_at: new Date().toISOString(),
  })
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
}

export async function getDraftCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(DRAFTS_KEY)
  return parseDrafts(raw).length
}

export async function syncDrafts(userId: string): Promise<{ synced: number; failed: number }> {
  const raw = await AsyncStorage.getItem(DRAFTS_KEY)
  const drafts = parseDrafts(raw)
  if (drafts.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0
  const remaining: DraftSighting[] = []

  for (const draft of drafts) {
    const { data: existing } = await supabase
      .from('species')
      .select('id')
      .ilike('common_name', draft.species_name)
      .maybeSingle()

    const { error } = await supabase.from('sightings').insert({
      user_id: userId,
      species_id: existing?.id ?? null,
      sighted_at: draft.sighted_at,
      latitude: draft.latitude,
      longitude: draft.longitude,
      location_name: draft.location_name,
      count: draft.count,
      notes: draft.notes,
      is_public: draft.is_public,
      is_offline_draft: false,
    })

    if (error) {
      failed++
      remaining.push(draft)
    } else {
      synced++
    }
  }

  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(remaining))
  return { synced, failed }
}
