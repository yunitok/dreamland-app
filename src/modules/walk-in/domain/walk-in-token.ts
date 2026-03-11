import { createHmac, timingSafeEqual } from "crypto"

const HMAC_SECRET = process.env.WALKIN_HMAC_SECRET ?? ""
const TOKEN_MAX_AGE_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Generate an HMAC token for walk-in availability requests.
 * Called from the Server Component so the secret never reaches the client.
 *
 * Format: "{timestamp}.{hmac}"
 */
export function generateWalkInToken(slug: string): string {
  const timestamp = Date.now().toString()
  const hmac = createHmac("sha256", HMAC_SECRET)
    .update(`${timestamp}.${slug}`)
    .digest("hex")
  return `${timestamp}.${hmac}`
}

/**
 * Validate a walk-in HMAC token from the request header.
 * Returns true if the token is valid and not expired.
 */
export function validateWalkInToken(token: string, slug: string): boolean {
  if (!HMAC_SECRET) return true // Skip validation if secret not configured (dev)

  const dotIndex = token.indexOf(".")
  if (dotIndex === -1) return false

  const timestamp = token.slice(0, dotIndex)
  const receivedHmac = token.slice(dotIndex + 1)

  // Check expiry
  const age = Date.now() - Number(timestamp)
  if (isNaN(age) || age < 0 || age > TOKEN_MAX_AGE_MS) return false

  // Compute expected HMAC
  const expectedHmac = createHmac("sha256", HMAC_SECRET)
    .update(`${timestamp}.${slug}`)
    .digest("hex")

  // Timing-safe comparison
  if (receivedHmac.length !== expectedHmac.length) return false
  return timingSafeEqual(
    Buffer.from(receivedHmac, "hex"),
    Buffer.from(expectedHmac, "hex")
  )
}
