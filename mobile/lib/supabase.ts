import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

// SecureStore has a 2048-byte limit per key. Supabase session tokens can exceed
// this, so we split large values into chunks and reassemble them on read.
const CHUNK_SIZE = 1900

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const countStr = await SecureStore.getItemAsync(`${key}_count`)
    if (!countStr) {
      // Fallback: read as a single item (handles sessions stored before this fix)
      return SecureStore.getItemAsync(key)
    }
    const count = parseInt(countStr, 10)
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}_${i}`))
    )
    if (chunks.some((c) => c === null)) return null
    return chunks.join('')
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const count = Math.ceil(value.length / CHUNK_SIZE)
    await SecureStore.setItemAsync(`${key}_count`, String(count))
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
      )
    )
  },
  removeItem: async (key: string): Promise<void> => {
    const countStr = await SecureStore.getItemAsync(`${key}_count`)
    if (countStr) {
      const count = parseInt(countStr, 10)
      await Promise.all([
        SecureStore.deleteItemAsync(`${key}_count`),
        ...Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`)),
      ])
    } else {
      await SecureStore.deleteItemAsync(key)
    }
  },
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})