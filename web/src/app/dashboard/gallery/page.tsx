import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

const SIGNED_URL_TTL_SECONDS = 3600
import { redirect } from 'next/navigation'
import type { Photo } from '@/types/database'

export default async function GalleryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('photos')
    .select('*, sightings(species(common_name))')
    .eq('user_id', user.id)
    .order('uploaded_at', { ascending: false })

  const photos = (data ?? []) as (Photo & {
    sightings: { species: { common_name: string } | null } | null
  })[]

  const withUrls = await Promise.all(
    photos.map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from('photos')
        .createSignedUrl(photo.storage_path, SIGNED_URL_TTL_SECONDS)
      return { ...photo, signedUrl: signed?.signedUrl ?? null }
    })
  )

  const visible = withUrls.filter((p) => p.signedUrl)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Galleria</h1>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
          <p className="text-4xl mb-4">📷</p>
          <p className="text-base font-medium text-gray-700">Ei kuvia vielä</p>
          <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
            Lisää kuvia havainnoillesi mobiilisovelluksessa niin ne ilmestyvät tänne.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {visible.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative group"
            >
              <Image
                src={photo.signedUrl!}
                alt={photo.sightings?.species?.common_name ?? 'Lintukuva'}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              />
              {photo.sightings?.species?.common_name && (
                <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate">
                    {photo.sightings.species.common_name}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
