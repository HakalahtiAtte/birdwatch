'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup } from '../actions'

export default function SignupPage() {
  const [error, action, pending] = useActionState(signup, null)

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <span className="text-5xl">🐦</span>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Luo tili</h1>
        <p className="mt-1 text-sm text-gray-500">Aloita lintujen kirjaaminen</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Näyttönimi
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              placeholder="Nimesi"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Sähköposti
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              placeholder="sinä@esimerkki.fi"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Salasana
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              placeholder="Vähintään 8 merkkiä"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Vahvista salasana
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? 'Luodaan tiliä…' : 'Luo tili'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Onko sinulla jo tili?{' '}
          <Link href="/login" className="font-medium text-green-600 hover:text-green-700">
            Kirjaudu
          </Link>
        </p>
      </div>
    </div>
  )
}
