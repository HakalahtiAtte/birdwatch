import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// In-memory fallback for local dev.
// NOT reliable in serverless — set up Upstash for production (see CLAUDE.md).
type DevEntry = { count: number; resetAt: number }
const devStore = new Map<string, DevEntry>()

function devLimit(key: string, limit: number, windowMs: number): { allowed: boolean } {
  const now = Date.now()
  const entry = devStore.get(key)
  if (!entry || entry.resetAt <= now) {
    devStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }
  if (entry.count >= limit) return { allowed: false }
  entry.count++
  return { allowed: true }
}

// Upstash Redis limiters — only created when env vars are present
let loginLimiter: Ratelimit | null = null
let signupLimiter: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = Redis.fromEnv()
  loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:login',
  })
  signupLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'rl:signup',
  })
}

/** 5 attempts per IP per 15 minutes */
export async function rateLimitLogin(ip: string): Promise<{ allowed: boolean }> {
  if (loginLimiter) {
    try {
      const { success } = await loginLimiter.limit(ip)
      return { allowed: success }
    } catch {
      // Fail open — Redis unavailable or write rejected (e.g. noeviction limit hit).
      // Supabase auth rate limiting is still active as a fallback layer.
      return { allowed: true }
    }
  }
  return devLimit(`login:${ip}`, 5, 15 * 60 * 1000)
}

/** 3 attempts per hour per IP */
export async function rateLimitSignup(ip: string): Promise<{ allowed: boolean }> {
  if (signupLimiter) {
    try {
      const { success } = await signupLimiter.limit(ip)
      return { allowed: success }
    } catch {
      // Fail open — same reasoning as above.
      return { allowed: true }
    }
  }
  return devLimit(`signup:${ip}`, 3, 60 * 60 * 1000)
}
