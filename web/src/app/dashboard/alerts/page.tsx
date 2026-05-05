import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AlertsManager } from './alerts-manager'

export default async function AlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('species_alerts')
    .select('*, species(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lajihälytykset</h1>
        <p className="text-sm text-gray-500 mt-1">
          Saat push-ilmoituksen kun toinen käyttäjä kirjaa havainnon haluamastasi lajista
          valitsemasi säteen sisällä.
        </p>
      </div>
      <AlertsManager alerts={data ?? []} />
    </div>
  )
}
