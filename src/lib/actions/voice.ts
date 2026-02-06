'use server'

import { getAIProvider } from '@/lib/ai/factory'
import { getLocale } from 'next-intl/server'
import { requireAuth } from './rbac'
import { checkAIRateLimit } from '@/lib/rate-limit'

export async function processTextCommand(projectId: string, userText: string) {
  // Verify user is authenticated
  const authCheck = await requireAuth()
  if (!authCheck.authenticated) {
    return { 
      success: false, 
      error: authCheck.error,
      message: 'Authentication required'
    }
  }
  
  // Check rate limiting
  const provider = getAIProvider()
  const providerName = process.env.AI_PROVIDER === 'gemini' ? 'gemini' : 'groq'
  const rateLimit = checkAIRateLimit(authCheck.userId, providerName)
  
  if (!rateLimit.allowed) {
    const retrySeconds = Math.ceil((rateLimit.retryAfter || 60000) / 1000)
    return {
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many requests. Please wait ${retrySeconds} seconds.`,
      retryAfter: retrySeconds
    }
  }
  
  const locale = await getLocale()
  return await provider.processCommand(projectId, userText, locale)
}
