/**
 * Rate limiting via Supabase RPC (PostgREST).
 * Works in both Node.js and Edge runtimes (uses fetch, not Prisma).
 *
 * Requires: `check_rate_limit` SQL function in Supabase.
 * See: scripts/setup-rate-limit.sql
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

interface RateLimitOptions {
  /** Unique key (typically IP or IP:slug) */
  key: string
  /** Max requests per window */
  maxRequests?: number
  /** Window duration in seconds */
  windowSeconds?: number
}

/**
 * Check if a request is within rate limits using Supabase.
 * Returns `true` if allowed, `false` if rate limited.
 *
 * Falls back to allowing requests if Supabase is unreachable
 * (fail-open to avoid blocking legitimate users).
 */
export async function checkRateLimitSupabase({
  key,
  maxRequests = 15,
  windowSeconds = 60,
}: RateLimitOptions): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return true

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_rate_limit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        p_key: key,
        p_max_requests: maxRequests,
        p_window_seconds: windowSeconds,
      }),
      signal: AbortSignal.timeout(2000),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("[rate-limit] Supabase RPC error:", res.status, body)
      return true
    }

    const allowed = await res.json()
    return allowed === true
  } catch (err) {
    console.error("[rate-limit] Error:", err)
    return true
  }
}

/**
 * Extract the most reliable client IP from request headers.
 * On Vercel, `x-real-ip` is injected by the platform and cannot be spoofed.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}
