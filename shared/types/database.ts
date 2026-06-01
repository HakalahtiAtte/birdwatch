export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      user_preferences: {
        Row: {
          id: string
          user_id: string
          locale: string
          unit_system: 'metric' | 'imperial'
          public_profile: boolean
          location_sharing: boolean
          email_notifications: boolean
          push_notifications: boolean
          notification_filters: Json
          push_token: string | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['user_preferences']['Row']>
        Update: Partial<Database['public']['Tables']['user_preferences']['Row']>
      }
      species: {
        Row: {
          id: string
          common_name: string
          latin_name: string
          family: string | null
          order: string | null
          ebird_species_code: string | null
          iucn_status: string | null
          photo_urls: string[]
          audio_urls: string[]
          range_map: Json
          synced_at: string
        }
        Insert: Partial<Database['public']['Tables']['species']['Row']>
        Update: Partial<Database['public']['Tables']['species']['Row']>
      }
      sightings: {
        Row: {
          id: string
          user_id: string
          species_id: string | null
          sighting_number: number
          sighted_at: string
          latitude: number | null
          longitude: number | null
          location_name: string | null
          count: number
          notes: string | null
          audio_url: string | null
          is_public: boolean
          is_offline_draft: boolean
          synced_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['sightings']['Row']>
        Update: Partial<Database['public']['Tables']['sightings']['Row']>
      }
      photos: {
        Row: {
          id: string
          sighting_id: string
          user_id: string
          storage_path: string
          file_size_bytes: number | null
          width_px: number | null
          height_px: number | null
          mime_type: string | null
          exif_data: Json
          uploaded_at: string
        }
        Insert: Partial<Database['public']['Tables']['photos']['Row']>
        Update: Partial<Database['public']['Tables']['photos']['Row']>
      }
      life_list: {
        Row: {
          id: string
          user_id: string
          species_id: string
          first_sighting_id: string | null
          first_seen_at: string
          total_sightings: number
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['life_list']['Row']>
        Update: Partial<Database['public']['Tables']['life_list']['Row']>
      }
      hotspots: {
        Row: {
          id: string
          name: string
          latitude: number
          longitude: number
          ebird_hotspot_id: string | null
          total_species_reported: number
          last_active_at: string | null
          synced_at: string
        }
        Insert: Partial<Database['public']['Tables']['hotspots']['Row']>
        Update: Partial<Database['public']['Tables']['hotspots']['Row']>
      }
      species_alerts: {
        Row: {
          id: string
          user_id: string
          species_id: string
          alert_radius_km: number
          is_active: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['species_alerts']['Row']>
        Update: Partial<Database['public']['Tables']['species_alerts']['Row']>
      }
    }
  }
}

// Convenience types
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
export type Species = Database['public']['Tables']['species']['Row']
export type Sighting = Database['public']['Tables']['sightings']['Row']
export type Photo = Database['public']['Tables']['photos']['Row']
export type LifeList = Database['public']['Tables']['life_list']['Row']
export type Hotspot = Database['public']['Tables']['hotspots']['Row']
export type SpeciesAlert = Database['public']['Tables']['species_alerts']['Row']

export type SightingWithSpecies = Sighting & {
  species: Species | null
  photos: Photo[]
}