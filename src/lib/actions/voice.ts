'use server'

import { getAIProvider } from '@/lib/ai/factory'
import { getProviderName } from '@/lib/ai/config'
import { getLocale } from 'next-intl/server'
import { requireAuth } from './rbac'
import { checkAIRateLimit } from '@/lib/rate-limit'
import { executeAiTools } from '@/lib/ai/executor'
import { getTaskStatuses } from './task-statuses'
import * as fs from 'fs'
import * as path from 'path'

function writeVoiceLog(data: any) {
  try {
    const logPath = path.join(process.cwd(), 'ai_debug.log')
    const entry = `\n[VOICE] --- ${new Date().toISOString()} ---\n${JSON.stringify(data, null, 2)}\n`
    fs.appendFileSync(logPath, entry)
  } catch (e) {
    console.error('Failed to write to ai_debug.log', e)
  }
}

export async function processTextCommand(projectId: string, userText: string) {
  writeVoiceLog({ step: 'START', projectId, userText })
  
  try {
    // 1. Auth Check
    const authCheck = await requireAuth()
    writeVoiceLog({ step: 'AUTH_CHECK', authCheck })
    
    if (!authCheck.authenticated) {
      writeVoiceLog({ step: 'AUTH_FAILED', error: authCheck.error })
      return { 
        success: false, 
        error: authCheck.error,
        message: 'Authentication required'
      }
    }
    
    // 2. Rate Limit
    const providerName = getProviderName()
    const rateLimit = checkAIRateLimit(authCheck.userId, providerName)
    writeVoiceLog({ step: 'RATE_LIMIT', rateLimit, providerName })
    
    if (!rateLimit.allowed) {
      const retrySeconds = Math.ceil((rateLimit.retryAfter || 60000) / 1000)
      writeVoiceLog({ step: 'RATE_LIMIT_EXCEEDED', retrySeconds })
      return {
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Please wait ${retrySeconds} seconds.`,
        retryAfter: retrySeconds
      }
    }
    
    // 3. Locale & Provider
    const locale = await getLocale()
    const provider = getAIProvider()
    writeVoiceLog({ step: 'CALLING_PROVIDER', provider: providerName, locale })
    
    const response = await provider.processCommand(projectId, userText, locale)
    writeVoiceLog({ step: 'PROVIDER_RESPONSE', response })

    // 4. Tool Execution
    if (response.success && response.toolCalls && response.toolCalls.length > 0) {
      writeVoiceLog({ step: 'EXECUTING_TOOLS', toolCalls: response.toolCalls })
      const statuses = await getTaskStatuses()
      const { executionResults, generatedReport } = await executeAiTools(
        response.toolCalls,
        { projectId, statuses }
      )
      writeVoiceLog({ step: 'TOOLS_FINISHED', executionResults })

      const finalResult = {
        ...response,
        actions: executionResults,
        message: executionResults.length > 0 ? `Executed: ${executionResults.join(', ')}` : response.message,
        report: generatedReport
      }
      writeVoiceLog({ step: 'FINAL_SUCCESS', finalResult })
      return finalResult
    }

    writeVoiceLog({ step: 'FINAL_NO_TOOLS', response })
    return response
    
  } catch (error: any) {
    writeVoiceLog({ step: 'CRITICAL_ERROR', error: error.message, stack: error.stack })
    console.error('[Voice Action] Critical Error:', error)
    return {
      success: false,
      error: error.message,
      message: 'A critical error occurred while processing the command'
    }
  }
}
