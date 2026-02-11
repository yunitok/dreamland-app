'use server'

import { getAIProvider } from '@/lib/ai/factory'
import { getLocale } from 'next-intl/server'
import { requireAuth } from './rbac'
import { checkAIRateLimit } from '@/lib/rate-limit'
import { executeAiTools } from '@/lib/ai/executor'
import { getTaskStatuses } from './task-statuses'

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
  const response = await provider.processCommand(projectId, userText, locale)

  // Orchestrate Tool Execution if provider returned toolCalls
  if (response.success && response.toolCalls && response.toolCalls.length > 0) {
    const statuses = await getTaskStatuses()
    const { executionResults, generatedReport } = await executeAiTools(
      response.toolCalls,
      { projectId, statuses }
    )

    return {
      ...response,
      actions: executionResults,
      message: executionResults.length > 0 ? `Executed: ${executionResults.join(', ')}` : response.message,
      report: generatedReport
    }
  }

  return response
}
