'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { signOut } from '@/app/(auth)/actions'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Yhteenveto', icon: '📊' },
  { href: '/dashboard/sightings', label: 'Havainnot', icon: '🐦' },
  { href: '/dashboard/lifelist', label: 'Lajilista', icon: '📋' },
  { href: '/dashboard/map', label: 'Kartta', icon: '🗺️' },
  { href: '/dashboard/gallery', label: 'Galleria', icon: '📷' },
  { href: '/dashboard/alerts', label: 'Hälytykset', icon: '🔔' },
  { href: '/dashboard/settings', label: 'Asetukset', icon: '⚙️' },
]

export function DashboardShell({
  user,
  children,
}: {
  user: User
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ?? user.email ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14">
        <span className="font-bold text-gray-900 flex items-center gap-2">
          <span aria-hidden="true">🐦</span> Siipi
        </span>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label={mobileOpen ? 'Sulje valikko' : 'Avaa valikko'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/30"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        >
          <nav
            className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'text-green-700 bg-green-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <form action={signOut} className="px-5 py-3">
              <button
                type="submit"
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Kirjaudu ulos
              </button>
            </form>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-60 bg-white border-r border-gray-200 z-10">
        <div className="px-6 h-16 flex items-center border-b border-gray-200">
          <span className="font-bold text-gray-900 flex items-center gap-2">
            <span aria-hidden="true">🐦</span> Siipi
          </span>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                pathname === item.href
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="text-base" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Kirjaudu ulos
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="md:ml-60 pt-14 md:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
