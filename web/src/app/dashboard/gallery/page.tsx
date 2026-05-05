import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Photo } from '@/types/database'

export default async function GalleryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('photos')
    .select('*')
    .eq('user_id', user.id)
    .order('uploaded_at', { ascending: false })

  const photos = (data ?? []) as Photo[]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Galleria</h1>

      {photos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
          <p className="text-4xl mb-4">📷</p>
          <p className="text-base font-medium text-gray-700">Ei kuvia vielä</p>
          <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
            Mobiilisovelluksessa havaintoihin liittämäsi kuvat ilmestyvät tänne kun
            Storage-bucket on otettu käyttöön.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square bg-gray-100 rounded-xl overflow-hidden"
            >
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                {photo.storage_path}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
