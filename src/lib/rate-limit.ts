/**
 * Rate limiting utility for AI endpoints
 * Prevents abuse and quota exhaustion
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store (consider Redis for production clusters)
const rateLimitStore = new Map<string, RateLimitRecord>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number; // milliseconds until reset
}

/**
 * Check if a user/key has exceeded rate limits
 * @param key - Unique identifier (userId, IP, etc.)
 * @param limit - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds (default: 1 minute)
 */
export function checkRateLimit(
  key: string, 
  limit: number = 10, 
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  // No existing record or window expired - start fresh
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  
  // Within window - check limit
  if (record.count >= limit) {
    return { 
      allowed: false, 
      remaining: 0, 
      retryAfter: record.resetAt - now 
    };
  }
  
  // Increment and allow
  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

/**
 * Rate limit configuration for different AI providers
 */
export const AI_RATE_LIMITS = {
  groq: {
    requestsPerMinute: 30,
    requestsPerDay: 14400,
    tokensPerMinute: 6000,
    tokensPerDay: 500000,
  },
  gemini: {
    requestsPerMinute: 15,
    requestsPerDay: 1500,
    tokensPerMinute: 32000,
    tokensPerDay: 1000000,
  },
} as const;

/**
 * Check AI-specific rate limit
 */
export function checkAIRateLimit(
  userId: string, 
  provider: 'groq' | 'gemini'
): RateLimitResult {
  const limits = AI_RATE_LIMITS[provider];
  const key = `ai:${provider}:${userId}`;
  
  return checkRateLimit(key, limits.requestsPerMinute, 60_000);
}
